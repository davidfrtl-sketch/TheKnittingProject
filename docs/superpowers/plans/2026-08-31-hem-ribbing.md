# Hem Ribbing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional 1x1/2x2 hem ribbing to the body's hem — extra rows worked at the taper's final stitch count, in the chosen rib pattern, then bound off. Purely additive: an optional parameter that changes nothing when omitted.

**Architecture:** New domain type (`RibStructure`/`HemFinishParams`) in `src/domain/ribbing.ts`, a new pure engine function `computeHemFinish` in `src/engine/hemFinish.ts`, an optional 6th parameter on `computeGarmentPlan` that's `null` by default, a new conditional section in `renderInstructions`, and web-tool wiring. No changes to any existing taper, yoke, or schematic code — the rib finish is appended after the pipeline, never altering it.

**Tech Stack:** TypeScript (strict, NodeNext ESM, `noUncheckedIndexedAccess`), Vitest for engine/render, plain `tsc` web build (no bundler).

## Global Constraints

- Every relative import uses an explicit `.js` extension.
- `noUncheckedIndexedAccess: true` — no `!`/`as` escapes anywhere.
- No comments unless they explain a non-obvious WHY.
- Every new module in `src/engine/` or `src/domain/` MUST be added to that directory's barrel (`src/engine/index.ts` / `src/domain/index.ts`) in the same task that creates it.
- `computeGarmentPlan`'s new 6th parameter (`hemFinishParams`) is OPTIONAL. When omitted, `GarmentPlan.hemFinish` is `null` and every existing test/caller must behave byte-for-byte identically to before this plan.
- `RIB_STITCH_REPEAT`'s `Record<RibStructure, number>` is safe without `as` because `RibStructure` is a compile-time literal union, not a raw DOM string — this is a deliberately different situation from the preset selectors' string-to-union narrowing (`app.ts` narrows `hemRibStructureValue` via `=== "1x1" || === "2x2"` equality checks, which TypeScript narrows automatically, no cast needed).
- This plan does not touch `src/render/schematicSvg.ts`, `src/render/schematicGeometry.ts`, or any taper/yoke engine file — the rib finish never changes shape or stitch counts, only adds rows described in the written instructions.
- Design spec: `docs/superpowers/specs/2026-08-31-hem-ribbing-design.md` — read it for the full rationale (why 1x1 can never fail validation in practice, why only the body hem in this pass, and the exact wording conventions for the instructions text).

---

### Task 1: `computeHemFinish` — domain type + engine function

**Files:**
- Create: `src/domain/ribbing.ts`
- Create: `src/engine/hemFinish.ts`
- Test: `tests/engine/hemFinish.test.ts`
- Modify: `src/domain/index.ts`
- Modify: `src/engine/index.ts`

**Interfaces:**
- Consumes: `Gauge`, `rowsForCm` from `../domain/gauge.js`.
- Produces: `RibStructure = "1x1" | "2x2"`; `HemFinishParams = { structure: RibStructure; lengthCm: number }`; `RIB_STITCH_REPEAT: Record<RibStructure, number>` (all in `src/domain/ribbing.ts`); `HemFinishResult = { structure: RibStructure; rows: number }` and `computeHemFinish(gauge: Gauge, combinedFinalStitches: number, params: HemFinishParams): HemFinishResult` (in `src/engine/hemFinish.ts`, throws on a non-multiple stitch count). Task 2 calls `computeHemFinish` from `garmentPlan.ts`.

- [ ] **Step 1: Write the failing tests**

Create `tests/engine/hemFinish.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeHemFinish } from "../../src/engine/hemFinish.js";
import type { Gauge } from "../../src/domain/gauge.js";

const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };

describe("computeHemFinish", () => {
  it("computes the row count for a 1x1 rib at a valid (even) stitch count", () => {
    const result = computeHemFinish(gauge, 212, { structure: "1x1", lengthCm: 10 });
    expect(result).toEqual({ structure: "1x1", rows: 28 });
  });

  it("computes the row count for a 2x2 rib at a valid (multiple-of-4) stitch count", () => {
    const result = computeHemFinish(gauge, 212, { structure: "2x2", lengthCm: 5 });
    expect(result).toEqual({ structure: "2x2", rows: 14 });
  });

  it("throws for a 1x1 rib at an odd stitch count", () => {
    expect(() => computeHemFinish(gauge, 213, { structure: "1x1", lengthCm: 5 })).toThrow(
      "El ruedo tiene 213 puntos, pero el canalé 1x1 necesita un múltiplo de 2."
    );
  });

  it("throws for a 2x2 rib at a stitch count that's even but not a multiple of 4", () => {
    expect(() => computeHemFinish(gauge, 214, { structure: "2x2", lengthCm: 5 })).toThrow(
      "El ruedo tiene 214 puntos, pero el canalé 2x2 necesita un múltiplo de 4."
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/hemFinish.test.ts`
Expected: FAIL — neither `src/engine/hemFinish.ts` nor `src/domain/ribbing.ts` exist yet.

- [ ] **Step 3: Create the domain type**

Create `src/domain/ribbing.ts`:

```ts
export type RibStructure = "1x1" | "2x2";

export type HemFinishParams = {
  structure: RibStructure;
  lengthCm: number;
};

export const RIB_STITCH_REPEAT: Record<RibStructure, number> = {
  "1x1": 2,
  "2x2": 4,
};
```

- [ ] **Step 4: Create the engine function**

Create `src/engine/hemFinish.ts`:

```ts
import { rowsForCm } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { HemFinishParams, RibStructure } from "../domain/ribbing.js";
import { RIB_STITCH_REPEAT } from "../domain/ribbing.js";

export type HemFinishResult = {
  structure: RibStructure;
  rows: number;
};

export function computeHemFinish(
  gauge: Gauge,
  combinedFinalStitches: number,
  params: HemFinishParams
): HemFinishResult {
  const repeat = RIB_STITCH_REPEAT[params.structure];
  if (combinedFinalStitches % repeat !== 0) {
    throw new Error(
      `El ruedo tiene ${combinedFinalStitches} puntos, pero el canalé ${params.structure} necesita un múltiplo de ${repeat}.`
    );
  }

  return {
    structure: params.structure,
    rows: rowsForCm(gauge, params.lengthCm),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/engine/hemFinish.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Add the barrel exports**

`src/domain/index.ts` currently reads:

```ts
export * from "./gauge.js";
export * from "./ease.js";
export * from "./measurements.js";
export * from "./neckline.js";
export * from "./construction.js";
```

This file is NOT in alphabetical order (it's chronological insertion order) — add the new line at the end, following that same convention:

```ts
export * from "./gauge.js";
export * from "./ease.js";
export * from "./measurements.js";
export * from "./neckline.js";
export * from "./construction.js";
export * from "./ribbing.js";
```

`src/engine/index.ts` currently reads:

```ts
export * from "./axilaJoin.js";
export * from "./garmentPlan.js";
export * from "./motifPlacement.js";
export * from "./raglanIncrease.js";
export * from "./raglanYoke.js";
export * from "./taper.js";
```

This one IS alphabetical — insert between `garmentPlan.js` and `motifPlacement.js`:

```ts
export * from "./axilaJoin.js";
export * from "./garmentPlan.js";
export * from "./hemFinish.js";
export * from "./motifPlacement.js";
export * from "./raglanIncrease.js";
export * from "./raglanYoke.js";
export * from "./taper.js";
```

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: both pass, no regressions (94 tests — 90 existing + 4 new).

- [ ] **Step 8: Commit**

```bash
git add src/domain/ribbing.ts src/engine/hemFinish.ts tests/engine/hemFinish.test.ts src/domain/index.ts src/engine/index.ts
git commit -m "Add computeHemFinish: optional 1x1/2x2 rib row count with multiple-of validation"
```

---

### Task 2: Wire `hemFinish` into `computeGarmentPlan`

**Files:**
- Modify: `src/engine/garmentPlan.ts`
- Modify: `tests/engine/garmentPlan.test.ts`

**Interfaces:**
- Consumes: `computeHemFinish`, `HemFinishResult` from `./hemFinish.js` (Task 1); `HemFinishParams` from `../domain/ribbing.js` (Task 1).
- Produces: `GarmentPlan` gains a `hemFinish: HemFinishResult | null` field; `computeGarmentPlan` gains an optional 6th parameter `hemFinishParams?: HemFinishParams`. Task 3 and Task 4 both depend on `plan.hemFinish` existing.

- [ ] **Step 1: Write the failing tests**

Add to `tests/engine/garmentPlan.test.ts`, inside the existing `describe("computeGarmentPlan", () => { ... })` block, as three new `it()` blocks after the existing one:

```ts
  it("computes hemFinish as null when no hemFinishParams are given", () => {
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
    expect(plan.hemFinish).toBeNull();
  });

  it("computes hemFinish when hemFinishParams are given", () => {
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction, {
      structure: "2x2",
      lengthCm: 5,
    });
    expect(plan.hemFinish).toEqual({ structure: "2x2", rows: 14 });
  });

  it("propagates computeHemFinish's divisibility error through computeGarmentPlan", () => {
    const oddHipMeasurements: GarmentMeasurements = { ...measurements, hipCm: 99 };
    expect(() =>
      computeGarmentPlan(gauge, ease, oddHipMeasurements, necklineParams, construction, {
        structure: "2x2",
        lengthCm: 5,
      })
    ).toThrow("necesita un múltiplo de 4");
  });
```

(`hipCm: 99` produces `bodyHemTaper.finalStitches = 214` — even, so the taper itself computes fine, but `214 % 4 === 2`, so `computeHemFinish` throws. Verified by hand from `stitchesForCm(gauge, 99 + 8) = round(2 × 107) = 214`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/garmentPlan.test.ts`
Expected: the 3 new tests FAIL (TypeScript error — `computeGarmentPlan` doesn't accept a 6th argument yet, and `plan.hemFinish` doesn't exist); the pre-existing test still passes.

- [ ] **Step 3: Wire `hemFinish` into `computeGarmentPlan`**

In `src/engine/garmentPlan.ts`, add these imports at the top:

```ts
import { computeHemFinish } from "./hemFinish.js";
import type { HemFinishResult } from "./hemFinish.js";
import type { HemFinishParams } from "../domain/ribbing.js";
```

Change the `GarmentPlan` type from:

```ts
export type GarmentPlan = {
  yoke: RaglanYokeResult;
  axilaJoin: AxilaJoinResult;
  bodyWaistTaper: TaperResult;
  bodyHemTaper: TaperResult;
  sleeveLeftTaper: TaperResult;
  sleeveRightTaper: TaperResult;
};
```

to:

```ts
export type GarmentPlan = {
  yoke: RaglanYokeResult;
  axilaJoin: AxilaJoinResult;
  bodyWaistTaper: TaperResult;
  bodyHemTaper: TaperResult;
  sleeveLeftTaper: TaperResult;
  sleeveRightTaper: TaperResult;
  hemFinish: HemFinishResult | null;
};
```

Change the function signature from:

```ts
export function computeGarmentPlan(
  gauge: Gauge,
  ease: Ease,
  measurements: GarmentMeasurements,
  necklineParams: NecklineParams,
  constructionParams: YokeConstructionParams
): GarmentPlan {
```

to:

```ts
export function computeGarmentPlan(
  gauge: Gauge,
  ease: Ease,
  measurements: GarmentMeasurements,
  necklineParams: NecklineParams,
  constructionParams: YokeConstructionParams,
  hemFinishParams?: HemFinishParams
): GarmentPlan {
```

Right before the final `return { ... }` statement, add:

```ts
  const hemFinish = hemFinishParams
    ? computeHemFinish(gauge, bodyHemTaper.finalStitches, hemFinishParams)
    : null;
```

And change the final `return` from:

```ts
  return {
    yoke,
    axilaJoin,
    bodyWaistTaper,
    bodyHemTaper,
    sleeveLeftTaper,
    sleeveRightTaper,
  };
```

to:

```ts
  return {
    yoke,
    axilaJoin,
    bodyWaistTaper,
    bodyHemTaper,
    sleeveLeftTaper,
    sleeveRightTaper,
    hemFinish,
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/engine/garmentPlan.test.ts`
Expected: PASS (4 tests total in this file).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: both pass. `npm run build` may still show unrelated errors if `app.ts`/`index.html` aren't updated yet — that's Task 4's job, not a concern here (verify any build error you see is only about the (not-yet-existing) `hem-rib-structure`/`hemRibLengthCm` wiring, if you check `npm run build` at all; it is not required for this task's own gate).

- [ ] **Step 6: Commit**

```bash
git add src/engine/garmentPlan.ts tests/engine/garmentPlan.test.ts
git commit -m "Wire optional hemFinish into computeGarmentPlan"
```

---

### Task 3: Describe the hem finish in written instructions

**Files:**
- Modify: `src/render/instructionsRenderer.ts`
- Modify: `tests/render/instructionsRenderer.test.ts`

**Interfaces:**
- Consumes: `plan.hemFinish` (Task 2) and `plan.bodyHemTaper.finalStitches` (existing).
- Produces: `renderInstructions(plan: GarmentPlan): string` — same signature, now appends a conditional final section when `plan.hemFinish` is non-null. Task 4 does not depend on this directly (the web tool already calls `renderInstructions` and will pick up the new section automatically once `app.ts` passes `hemFinishParams` through).

- [ ] **Step 1: Write the failing tests**

Add to `tests/render/instructionsRenderer.test.ts`, as two new top-level `describe` blocks at the end of the file (after the existing three):

```ts
describe("renderInstructions with a hem finish", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction, {
    structure: "1x1",
    lengthCm: 10,
  });
  const text = renderInstructions(plan);

  it("describes the 1x1 rib with the correct stitch and row counts", () => {
    expect(text).toContain(
      "Canalé 1x1 (212 puntos, 28 vueltas): *1 derecho, 1 revés*, repetir hasta el final. Cerrar puntos."
    );
  });
});

describe("renderInstructions without a hem finish", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
  const text = renderInstructions(plan);

  it("omits any hem finish section", () => {
    expect(text).not.toContain("Canalé");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/render/instructionsRenderer.test.ts`
Expected: the 2 new tests FAIL (no "Canalé" text is ever produced yet); all pre-existing tests in the file still PASS.

- [ ] **Step 3: Add the hem finish section**

In `src/render/instructionsRenderer.ts`, add this new function right after `renderTaperStage`'s definition:

```ts
function renderHemFinishSection(plan: GarmentPlan): string | null {
  if (!plan.hemFinish) {
    return null;
  }
  const { structure, rows } = plan.hemFinish;
  const stitches = plan.bodyHemTaper.finalStitches;
  const patternText = structure === "1x1" ? "*1 derecho, 1 revés*" : "*2 derecho, 2 revés*";
  const rowsWord = rows === 1 ? "vuelta" : "vueltas";
  return (
    `Canalé ${structure} (${stitches} puntos, ${rows} ${rowsWord}): ${patternText}, repetir hasta el final. ` +
    `Cerrar puntos.`
  );
}
```

Change `renderInstructions` from:

```ts
export function renderInstructions(plan: GarmentPlan): string {
  const sections = [
    renderCastOnSection(plan),
    renderYokeSection(plan),
    renderAxilaSection(plan),
    renderTaperStage("Cintura", plan.axilaJoin.bodyStartStitches, plan.bodyWaistTaper),
    renderTaperStage("Cadera / ruedo", plan.bodyWaistTaper.finalStitches, plan.bodyHemTaper),
    renderTaperStage("Manga izquierda", plan.axilaJoin.sleeveLeftStartStitches, plan.sleeveLeftTaper),
    renderTaperStage("Manga derecha", plan.axilaJoin.sleeveRightStartStitches, plan.sleeveRightTaper),
  ];
  return sections.join("\n\n");
}
```

to:

```ts
export function renderInstructions(plan: GarmentPlan): string {
  const sections = [
    renderCastOnSection(plan),
    renderYokeSection(plan),
    renderAxilaSection(plan),
    renderTaperStage("Cintura", plan.axilaJoin.bodyStartStitches, plan.bodyWaistTaper),
    renderTaperStage("Cadera / ruedo", plan.bodyWaistTaper.finalStitches, plan.bodyHemTaper),
    renderTaperStage("Manga izquierda", plan.axilaJoin.sleeveLeftStartStitches, plan.sleeveLeftTaper),
    renderTaperStage("Manga derecha", plan.axilaJoin.sleeveRightStartStitches, plan.sleeveRightTaper),
  ];
  const hemFinishSection = renderHemFinishSection(plan);
  if (hemFinishSection) {
    sections.push(hemFinishSection);
  }
  return sections.join("\n\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/render/instructionsRenderer.test.ts`
Expected: PASS (all tests in the file, old and new).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: both pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/render/instructionsRenderer.ts tests/render/instructionsRenderer.test.ts
git commit -m "Describe optional hem ribbing in the written instructions"
```

---

### Task 4: Wire hem ribbing into the web tool

**Files:**
- Modify: `index.html`
- Modify: `src/web/app.ts`

**Interfaces:**
- Consumes: `computeGarmentPlan`'s new optional 6th parameter (Task 2); `HemFinishParams` from `../domain/ribbing.js` (Task 1).
- Produces: nothing for other tasks to consume — final integration point. Manual browser verification only (no Vitest coverage for `src/web/app.ts`, matching this file's established convention).

- [ ] **Step 1: Add the new fieldset to `index.html`**

Add this new `<fieldset>` right after the existing "Construcción" fieldset (which contains `initialSleeveStitchesPerSleeve`), still inside `<form id="measurements-form">`, before the closing `</form>`:

```html
    <fieldset>
      <legend>Terminación del ruedo</legend>
      <div class="field-grid">
        <label>Canalé
          <select id="hem-rib-structure">
            <option value="none" selected>Sin canalé</option>
            <option value="1x1">1x1</option>
            <option value="2x2">2x2</option>
          </select>
        </label>
        <label>Largo del canalé (cm) <input type="number" id="hemRibLengthCm" value="5" step="any"></label>
      </div>
    </fieldset>
```

This `<select>` does NOT get `class="preset-select"` — it isn't a preset that fills other fields, it's its own parameter.

- [ ] **Step 2: Import `HemFinishParams` in `app.ts`**

Add this import near the top of `src/web/app.ts`, alongside the other type-only imports:

```ts
import type { HemFinishParams } from "../domain/ribbing.js";
```

- [ ] **Step 3: Compute `hemFinishParams` in `calculate()` and pass it through**

In `calculate()`'s `try` block, right before the line that calls `computeGarmentPlan`, add:

```ts
    const hemRibStructureEl = document.getElementById("hem-rib-structure");
    const hemRibStructureValue =
      hemRibStructureEl instanceof HTMLSelectElement ? hemRibStructureEl.value : "none";

    let hemFinishParams: HemFinishParams | undefined;
    if (hemRibStructureValue === "1x1" || hemRibStructureValue === "2x2") {
      hemFinishParams = {
        structure: hemRibStructureValue,
        lengthCm: getNumberInput("hemRibLengthCm"),
      };
    }
```

Then change the existing line:

```ts
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, constructionParams);
```

to:

```ts
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, constructionParams, hemFinishParams);
```

- [ ] **Step 4: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all tests pass (this task adds no new Vitest coverage — `src/web/app.ts` has none, by established project convention).

- [ ] **Step 6: Manual browser verification**

Serve the built app locally (temporary `.claude/launch.json` or a plain `python3 -m http.server` from the repo root, same pattern as every prior web-tool verification) and in the browser:

1. Load the page with its default form values (including "Sin canalé" selected) and click "Calcular". Confirm the instructions do NOT contain the word "Canalé" — behavior unchanged from before this plan.
2. Change "Canalé" to "1x1", leave "Largo del canalé (cm)" at its default `5`, and click "Calcular". Confirm the instructions now end with a line like `Canalé 1x1 (212 puntos, 14 vueltas): *1 derecho, 1 revés*, repetir hasta el final. Cerrar puntos.` (the row count will be `14` at the default `5cm`, since `rowsForCm({rowsPer10cm:28}, 5) = round(14) = 14` — different from the plan's own hand-verified `10cm → 28 rows` test case, which used a different length).
3. Change "Canalé" to "2x2" with the default measurements (chest 96, hip 98, etc. — `bodyHemTaper.finalStitches = 212`, divisible by 4) and click "Calcular". Confirm it succeeds and shows a `Canalé 2x2 (...)` line with `*2 derecho, 2 revés*`.
4. With "2x2" still selected, change "Cadera" to `99` (this produces `bodyHemTaper.finalStitches = 214`, NOT divisible by 4) and click "Calcular". Confirm a clear error appears in `#error-box`: `El ruedo tiene 214 puntos, pero el canalé 2x2 necesita un múltiplo de 4.` — and confirm the result box stays hidden (same error-handling path as every other validation error in this tool).
5. Switch back to "Sin canalé" with `hipCm=99` still set. Confirm "Calcular" now succeeds again (proves the rib validation only runs when a structure is actually selected, not unconditionally).
6. Confirm no console errors appear during any of the above (`read_console_messages`).

Stop the preview server and delete any temporary `.claude/launch.json` afterward, same as every prior verification this session.

- [ ] **Step 7: Commit**

```bash
git add index.html src/web/app.ts
git commit -m "Add hem ribbing controls to the web tool"
```
