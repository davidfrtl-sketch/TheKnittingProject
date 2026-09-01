# Cuff Ribbing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the already-shipped hem ribbing to the sleeve cuff — same `computeHemFinish` function, applied to the sleeve taper's final stitch count instead of the body hem's, with its own independent optional parameter.

**Architecture:** Zero changes to `src/domain/ribbing.ts` or `src/engine/hemFinish.ts` — both already generalize to any stitch count. This plan only adds a 7th optional parameter to `computeGarmentPlan`, a second conditional section to `renderInstructions`, and a second fieldset in the web tool, mirroring the hem-ribbing plan's exact shape.

**Tech Stack:** TypeScript (strict, NodeNext ESM, `noUncheckedIndexedAccess`), Vitest for engine/render, plain `tsc` web build (no bundler).

## Global Constraints

- Every relative import uses an explicit `.js` extension.
- `noUncheckedIndexedAccess: true` — no `!`/`as` escapes anywhere.
- No comments unless they explain a non-obvious WHY.
- `hemFinishParams` and `cuffFinishParams` are fully independent — nothing forces the same rib structure (or lack thereof) for both.
- `sleeveLeftTaper.finalStitches` and `sleeveRightTaper.finalStitches` are ALWAYS equal (both taper to the same `wristTargetStitches`, and `computeTaper` always lands exactly on its target end value regardless of start value) — verified against the real engine for this plan (36 with the standard fixture). The cuff finish is validated and computed ONCE against `sleeveLeftTaper.finalStitches`, never duplicated per sleeve.
- The cuff's written-instructions section is a SINGLE shared "Puño (ambas mangas)" line — not two separate per-sleeve sections like the existing taper stages.
- Design spec: `docs/superpowers/specs/2026-08-31-cuff-ribbing-design.md` — read it for the full rationale and the hand-verified test numbers (36 stitches at default measurements; 38 stitches — even but not a multiple of 4 — at `wristCm: 13`).

---

### Task 1: Generalize `computeHemFinish`'s error message, then wire `cuffFinish` into `computeGarmentPlan`

**Files:**
- Modify: `src/engine/hemFinish.ts`
- Modify: `tests/engine/hemFinish.test.ts`
- Modify: `src/engine/garmentPlan.ts`
- Modify: `tests/engine/garmentPlan.test.ts`

**Interfaces:**
- Consumes: `computeHemFinish`, `HemFinishResult` from `./hemFinish.js` (already imported for `hemFinish`); `HemFinishParams` from `../domain/ribbing.js` (already imported).
- Produces: `computeHemFinish`'s divisibility-error message is now context-free (no longer hardcodes "ruedo"). `GarmentPlan` gains `cuffFinish: HemFinishResult | null`; `computeGarmentPlan` gains a 7th optional parameter `cuffFinishParams?: HemFinishParams`. Task 2 and Task 3 both depend on `plan.cuffFinish` existing.

- [ ] **Step 1a: Generalize the divisibility error message**

`computeHemFinish`'s current error message hardcodes the word "ruedo" (`` `El ruedo tiene ${combinedFinalStitches} puntos, pero el canalé ${params.structure} necesita un múltiplo de ${repeat}.` ``), which was fine when this function only served the hem — but this plan reuses it for the cuff, where the same wording would misleadingly say "ruedo" about a problem that's actually in the sleeve/wrist. Fix this BEFORE adding the cuff, so the cuff never ships with wrong wording.

In `src/engine/hemFinish.ts`, change the error message from:

```ts
    throw new Error(
      `El ruedo tiene ${combinedFinalStitches} puntos, pero el canalé ${params.structure} necesita un múltiplo de ${repeat}.`
    );
```

to:

```ts
    throw new Error(
      `No se puede aplicar el canalé ${params.structure}: hay ${combinedFinalStitches} puntos, que no es múltiplo de ${repeat}.`
    );
```

In `tests/engine/hemFinish.test.ts`, update the two existing `.toThrow(...)` assertions that reference the old exact wording:

```ts
  it("throws for a 1x1 rib at an odd stitch count", () => {
    expect(() => computeHemFinish(gauge, 213, { structure: "1x1", lengthCm: 5 })).toThrow(
      "No se puede aplicar el canalé 1x1: hay 213 puntos, que no es múltiplo de 2."
    );
  });

  it("throws for a 2x2 rib at a stitch count that's even but not a multiple of 4", () => {
    expect(() => computeHemFinish(gauge, 214, { structure: "2x2", lengthCm: 5 })).toThrow(
      "No se puede aplicar el canalé 2x2: hay 214 puntos, que no es múltiplo de 4."
    );
  });
```

(Leave the other two tests in that file — the `lengthCm`-validation ones added in the hem-ribbing plan's final fix — untouched; they don't reference this message.)

Run: `npx vitest run tests/engine/hemFinish.test.ts`
Expected: PASS (all 5 tests, with the two updated assertions matching the new wording).

- [ ] **Step 1b: Update the EXISTING `hemFinish` error assertion for the new wording**

The hem-ribbing plan (already merged) added this test to `tests/engine/garmentPlan.test.ts`, which currently asserts the OLD wording — and will start FAILING the moment Step 1a's message change lands, since `computeGarmentPlan` calls the same `computeHemFinish` you just changed:

```ts
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

Update just this test's assertion string from `"necesita un múltiplo de 4"` to `"no es múltiplo de 4"` — do not change anything else in this test (not the measurements, not the call, not its position in the file).

Run: `npx vitest run tests/engine/garmentPlan.test.ts`
Expected: this one pre-existing test passes again (it should be the ONLY test in this file so far, since the `cuffFinish` tests haven't been added yet).

- [ ] **Step 1c: Write the failing `cuffFinish` tests**

Add to `tests/engine/garmentPlan.test.ts`, inside the existing `describe("computeGarmentPlan", () => { ... })` block, as three new `it()` blocks after the existing `hemFinish` tests:

```ts
  it("computes cuffFinish as null when no cuffFinishParams are given", () => {
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
    expect(plan.cuffFinish).toBeNull();
  });

  it("computes cuffFinish when cuffFinishParams are given, using the sleeve taper's shared final stitch count", () => {
    const plan = computeGarmentPlan(
      gauge,
      ease,
      measurements,
      necklineParams,
      construction,
      undefined,
      { structure: "2x2", lengthCm: 5 }
    );
    expect(plan.sleeveLeftTaper.finalStitches).toBe(36);
    expect(plan.sleeveRightTaper.finalStitches).toBe(36);
    expect(plan.cuffFinish).toEqual({ structure: "2x2", rows: 14 });
  });

  it("propagates computeHemFinish's divisibility error through computeGarmentPlan for the cuff", () => {
    const oddWristMeasurements: GarmentMeasurements = { ...measurements, wristCm: 13 };
    expect(() =>
      computeGarmentPlan(gauge, ease, oddWristMeasurements, necklineParams, construction, undefined, {
        structure: "2x2",
        lengthCm: 5,
      })
    ).toThrow("no es múltiplo de 4");
  });
```

(`wristCm: 13` produces `sleeveLeftTaper.finalStitches = 38` — even, so the taper itself computes fine, but `38 % 4 = 2`, so `computeHemFinish` throws. Verified by hand against the real engine. The assertion uses the NEW generalized wording from Step 1a above, not the old "ruedo"-specific one.)

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/engine/garmentPlan.test.ts`
Expected: the 3 new tests FAIL (TypeScript error — `computeGarmentPlan` doesn't accept a 7th argument yet, and `plan.cuffFinish` doesn't exist); all pre-existing tests still pass.

- [ ] **Step 3: Wire `cuffFinish` into `computeGarmentPlan`**

In `src/engine/garmentPlan.ts`, change the `GarmentPlan` type from:

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
  cuffFinish: HemFinishResult | null;
};
```

Change the function signature from:

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

to:

```ts
export function computeGarmentPlan(
  gauge: Gauge,
  ease: Ease,
  measurements: GarmentMeasurements,
  necklineParams: NecklineParams,
  constructionParams: YokeConstructionParams,
  hemFinishParams?: HemFinishParams,
  cuffFinishParams?: HemFinishParams
): GarmentPlan {
```

Right after the existing `hemFinish` computation:

```ts
  const hemFinish = hemFinishParams
    ? computeHemFinish(gauge, bodyHemTaper.finalStitches, hemFinishParams)
    : null;
```

add:

```ts
  const cuffFinish = cuffFinishParams
    ? computeHemFinish(gauge, sleeveLeftTaper.finalStitches, cuffFinishParams)
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
    hemFinish,
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
    cuffFinish,
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/engine/garmentPlan.test.ts`
Expected: PASS (7 tests total in this file).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: both pass, no regressions (103 tests — 100 existing + 3 new).

- [ ] **Step 6: Commit**

```bash
git add src/engine/garmentPlan.ts tests/engine/garmentPlan.test.ts
git commit -m "Wire optional cuffFinish into computeGarmentPlan, reusing computeHemFinish"
```

---

### Task 2: Describe the cuff finish in written instructions

**Files:**
- Modify: `src/render/instructionsRenderer.ts`
- Modify: `tests/render/instructionsRenderer.test.ts`

**Interfaces:**
- Consumes: `plan.cuffFinish` (Task 1) and `plan.sleeveLeftTaper.finalStitches` (existing); `RIB_PATTERN_TEXT` from `../domain/ribbing.js` (already imported for `renderHemFinishSection`).
- Produces: `renderInstructions(plan: GarmentPlan): string` — same signature, now appends a second conditional section (after the hem finish one) when `plan.cuffFinish` is non-null.

- [ ] **Step 1: Write the failing tests**

Add to `tests/render/instructionsRenderer.test.ts`, as two new top-level `describe` blocks at the very end of the file (after the existing "renderInstructions without a hem finish" block):

```ts
describe("renderInstructions with a cuff finish", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction, undefined, {
    structure: "1x1",
    lengthCm: 10,
  });
  const text = renderInstructions(plan);

  it("describes the shared cuff rib with the correct stitch and row counts", () => {
    expect(text).toContain(
      "Puño (ambas mangas) — canalé 1x1 (36 puntos, 28 vueltas): *1 derecho, 1 revés*, repetir hasta el final. Cerrar puntos."
    );
  });
});

describe("renderInstructions without a cuff finish", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
  const text = renderInstructions(plan);

  it("omits any cuff finish section", () => {
    expect(text).not.toContain("Puño");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/render/instructionsRenderer.test.ts`
Expected: the 2 new tests FAIL (no "Puño" text is ever produced yet); all pre-existing tests in the file still PASS.

- [ ] **Step 3: Add the cuff finish section**

In `src/render/instructionsRenderer.ts`, add this new function right after `renderHemFinishSection`'s definition:

```ts
function renderCuffFinishSection(plan: GarmentPlan): string | null {
  if (!plan.cuffFinish) {
    return null;
  }
  const { structure, rows } = plan.cuffFinish;
  const stitches = plan.sleeveLeftTaper.finalStitches;
  const patternText = RIB_PATTERN_TEXT[structure];
  const rowsWord = rows === 1 ? "vuelta" : "vueltas";
  return (
    `Puño (ambas mangas) — canalé ${structure} (${stitches} puntos, ${rows} ${rowsWord}): ` +
    `${patternText}, repetir hasta el final. Cerrar puntos.`
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
  const hemFinishSection = renderHemFinishSection(plan);
  if (hemFinishSection) {
    sections.push(hemFinishSection);
  }
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
  const cuffFinishSection = renderCuffFinishSection(plan);
  if (cuffFinishSection) {
    sections.push(cuffFinishSection);
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
git commit -m "Describe optional cuff ribbing (shared across both sleeves) in written instructions"
```

---

### Task 3: Wire cuff ribbing into the web tool

**Files:**
- Modify: `index.html`
- Modify: `src/web/app.ts`

**Interfaces:**
- Consumes: `computeGarmentPlan`'s new optional 7th parameter (Task 1).
- Produces: nothing for other tasks to consume — final integration point. Manual browser verification only (no Vitest coverage for `src/web/app.ts`, matching this file's established convention).

- [ ] **Step 1: Add the new fieldset to `index.html`**

Add this new `<fieldset>` right after the existing "Terminación del ruedo" fieldset (which contains `hem-rib-structure`/`hemRibLengthCm`), still inside `<form id="measurements-form">`, before the `<button id="calculate-button">`:

```html
    <fieldset>
      <legend>Terminación del puño</legend>
      <div class="field-grid">
        <label>Canalé
          <select id="cuff-rib-structure">
            <option value="none" selected>Sin canalé</option>
            <option value="1x1">1x1</option>
            <option value="2x2">2x2</option>
          </select>
        </label>
        <label>Largo del canalé (cm) <input type="number" id="cuffRibLengthCm" value="5" step="any" min="0"></label>
      </div>
    </fieldset>
```

(`min="0"` is included from the start this time — the prior hem-ribbing plan's final review found it was needed and added it after the fact.)

- [ ] **Step 2: Compute `cuffFinishParams` in `calculate()` and pass it through**

In `calculate()`'s `try` block, right after the existing `hemFinishParams` block (and before the `computeGarmentPlan` call), add:

```ts
    const cuffRibStructureEl = document.getElementById("cuff-rib-structure");
    const cuffRibStructureValue =
      cuffRibStructureEl instanceof HTMLSelectElement ? cuffRibStructureEl.value : "none";

    let cuffFinishParams: HemFinishParams | undefined;
    if (cuffRibStructureValue === "1x1" || cuffRibStructureValue === "2x2") {
      cuffFinishParams = {
        structure: cuffRibStructureValue,
        lengthCm: getNumberInput("cuffRibLengthCm"),
      };
    }
```

Then change the existing line:

```ts
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, constructionParams, hemFinishParams);
```

to:

```ts
    const plan = computeGarmentPlan(
      gauge,
      ease,
      measurements,
      necklineParams,
      constructionParams,
      hemFinishParams,
      cuffFinishParams
    );
```

(`HemFinishParams` is already imported in `app.ts` from the hem-ribbing plan — no new import needed.)

- [ ] **Step 3: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass (this task adds no new Vitest coverage — `src/web/app.ts` has none, by established project convention).

- [ ] **Step 5: Manual browser verification**

Serve the built app locally (temporary `.claude/launch.json` or a plain `python3 -m http.server` from the repo root, same pattern as every prior web-tool verification) and in the browser:

1. Load the page with its default form values (both "Sin canalé" selected) and click "Calcular". Confirm the instructions contain neither "Canalé" nor "Puño" — behavior unchanged from before this plan.
2. Change the cuff's "Canalé" to "1x1" (leave the hem's at "Sin canalé"), leave "Largo del canalé (cm)" at its default `5`, and click "Calcular". Confirm the instructions now end with a line like `Puño (ambas mangas) — canalé 1x1 (36 puntos, 14 vueltas): *1 derecho, 1 revés*, repetir hasta el final. Cerrar puntos.` (rows = 14 at the default 5cm, matching `rowsForCm({rowsPer10cm:28}, 5) = 14`), and still no "Canalé" line (hem ribbing still off).
3. With the cuff still on "1x1", ALSO set the hem's "Canalé" to "2x2" and click "Calcular". Confirm BOTH sections now appear — a "Canalé 2x2 (...)" line for the hem and a "Puño (ambas mangas) — canalé 1x1 (...)" line for the cuff, each with its own correct stitch/row counts, proving the two are independent.
4. With cuff still on "1x1", change "Muñeca" to `13` (this produces `sleeveLeftTaper.finalStitches = 38`, not divisible by 4 — but 1x1 only needs a multiple of 2, so this should NOT error) and click "Calcular". Confirm it still succeeds. Then change the cuff's "Canalé" to "2x2" and click "Calcular" again — confirm a clear, context-free error now appears in `#error-box`: `No se puede aplicar el canalé 2x2: hay 38 puntos, que no es múltiplo de 4.` (this is the generalized wording from Task 1, Step 1a — it correctly says nothing about "ruedo" even though the problem is in the sleeve).
5. Confirm no console errors appear during any of the above (`read_console_messages`).

Stop the preview server and delete any temporary `.claude/launch.json` afterward, same as every prior verification this session.

- [ ] **Step 6: Commit**

```bash
git add index.html src/web/app.ts
git commit -m "Add cuff ribbing controls to the web tool"
```
