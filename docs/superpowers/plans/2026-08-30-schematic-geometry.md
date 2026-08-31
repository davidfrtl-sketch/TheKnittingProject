# Schematic Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `computeSchematicGeometry`, the function that converts a `GarmentPlan` into the real cm dimensions of each piece (back, front, both sleeves) needed to draw a visual schematic, per `docs/superpowers/specs/2026-08-30-schematic-geometry-design.md`.

**Architecture:** Two small additions. First, `cmForStitches`/`cmForRows` in `src/domain/gauge.ts` — the inverse of the existing `stitchesForCm`/`rowsForCm`. Second, `src/render/schematicGeometry.ts`, a pure function that reads only already-computed `GarmentPlan` fields (plus `gauge`, needed to convert stitches/rows back to cm) and returns a `SchematicGeometry` object. No new calculation logic — every number is a unit conversion of a value some earlier engine already produced.

**Tech Stack:** TypeScript (strict, ESM, NodeNext module resolution), Vitest.

## Global Constraints

- Module resolution is `NodeNext` — every relative import must include an explicit `.js` extension, for both type-only and value imports.
- `cmForStitches`/`cmForRows` do NOT round (unlike `stitchesForCm`/`rowsForCm`, which round to the nearest integer) — going from many stitches/rows back to cm should preserve exact proportions for drawing, not reintroduce rounding error.
- Panel-vs-tube convention: back and front stitch counts already represent that piece's own width directly (no division). Sleeve stitch counts represent a full tube circumference — the schematic's "flat" width for a sleeve is that circumference ÷ 2. `bodyWaistTaper`/`bodyHemTaper` operate on the combined body tube (both back and front together), so a single piece's width there is `finalStitches ÷ 2`.
- Do not modify `raglanYoke.ts`, `axilaJoin.ts`, `taper.ts`, or `garmentPlan.ts` — this task only reads their exported types/functions.
- This task computes geometry only — it does not draw anything (no SVG, no HTML). That is separate, later work.
- Run `npm run typecheck` and `npm test` after the task, not just at the end.

---

### Task 1: `cmForStitches`/`cmForRows` and `computeSchematicGeometry`

**Files:**
- Modify: `src/domain/gauge.ts` (add `cmForStitches`, `cmForRows`)
- Modify: `tests/domain/gauge.test.ts` (add tests for the two new functions)
- Create: `src/render/schematicGeometry.ts`
- Modify: `src/render/index.ts` (add `export * from "./schematicGeometry.js";`)
- Test: `tests/render/schematicGeometry.test.ts`

**Interfaces:**
- Consumes: `Gauge` from `../domain/gauge.js`; `GarmentPlan` from `../engine/garmentPlan.js`; `RaglanYokeRoundEvent` from `../engine/raglanYoke.js`. All already exist — this task only reads them.
- Produces: `cmForStitches(gauge: Gauge, stitches: number): number` and `cmForRows(gauge: Gauge, rows: number): number` in the domain layer; `PanelGeometry`, `FrontGeometry`, `SleeveGeometry`, `SchematicGeometry` types and `computeSchematicGeometry(plan: GarmentPlan, gauge: Gauge): SchematicGeometry` in the render layer. This is the function a future Artifact/preview will call to get real cm dimensions to draw.

- [ ] **Step 1: Write the failing tests**

First, add two test cases to the existing `tests/domain/gauge.test.ts` (append inside the existing `describe` block, after the current two `it`s):

```ts
  it("converts stitches to cm (inverse of stitchesForCm, no rounding)", () => {
    expect(cmForStitches(gauge, 208)).toBe(104);
    expect(cmForStitches(gauge, 32)).toBe(16);
    expect(cmForStitches(gauge, 12)).toBe(6);
  });

  it("converts rows to cm (inverse of rowsForCm, no rounding)", () => {
    expect(cmForRows(gauge, 56)).toBe(20);
    expect(cmForRows(gauge, 13)).toBeCloseTo(4.642857, 5);
    expect(cmForRows(gauge, 118)).toBeCloseTo(42.142857, 5);
  });
```

And update its import line to also bring in the two new functions:

```ts
import { stitchesForCm, rowsForCm, cmForStitches, cmForRows } from "../../src/domain/gauge.js";
```

Then create `tests/render/schematicGeometry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeSchematicGeometry } from "../../src/render/schematicGeometry.js";
import { computeGarmentPlan } from "../../src/engine/garmentPlan.js";
import type { Gauge } from "../../src/domain/gauge.js";
import type { Ease } from "../../src/domain/ease.js";
import type { GarmentMeasurements } from "../../src/domain/measurements.js";
import type { NecklineParams } from "../../src/domain/neckline.js";
import type { YokeConstructionParams } from "../../src/domain/construction.js";

const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };
const ease: Ease = { bodyEaseCm: 8, sleeveEaseCm: 6 };
const measurements: GarmentMeasurements = {
  chestCm: 96,
  neckWidthBackCm: 16,
  bicepCm: 32,
  armholeDepthCm: 20,
  waistCm: 80,
  hipCm: 98,
  wristCm: 12,
  waistLengthCm: 15,
  hemLengthCm: 12.14,
  sleeveLengthCm: 42.14,
};
const necklineParams: NecklineParams = {
  frontOpenRounds: 12,
  frontStartStitchesPerHalf: 1,
  necklineIncreaseCadence: 1,
};
const construction: YokeConstructionParams = { initialSleeveStitchesPerSleeve: 8 };

describe("computeSchematicGeometry", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
  const geometry = computeSchematicGeometry(plan, gauge);

  it("computes the back panel geometry", () => {
    expect(geometry.back.topWidthCm).toBe(16);
    expect(geometry.back.underarmWidthCm).toBe(52);
    expect(geometry.back.waistWidthCm).toBe(44);
    expect(geometry.back.hemWidthCm).toBe(53);
    expect(geometry.back.yokeHeightCm).toBe(20);
    expect(geometry.back.waistLengthCm).toBe(15);
    expect(geometry.back.hemLengthCm).toBeCloseTo(12.142857, 5);
  });

  it("computes the front panel geometry, sharing the back's body dimensions", () => {
    expect(geometry.front.topWidthCm).toBe(1);
    expect(geometry.front.underarmWidthCm).toBe(52);
    expect(geometry.front.waistWidthCm).toBe(44);
    expect(geometry.front.hemWidthCm).toBe(53);
    expect(geometry.front.yokeHeightCm).toBe(20);
    expect(geometry.front.waistLengthCm).toBe(15);
    expect(geometry.front.hemLengthCm).toBeCloseTo(12.142857, 5);
    expect(geometry.front.joinHeightCm).toBeCloseTo(4.642857, 5);
    expect(geometry.front.joinWidthCm).toBe(23);
    expect(geometry.front.joinBoundOnStitches).toBe(8);
  });

  it("computes both sleeves' geometry identically for this symmetric example", () => {
    for (const sleeve of [geometry.sleeveLeft, geometry.sleeveRight]) {
      expect(sleeve.topWidthCm).toBe(2);
      expect(sleeve.yokeEndWidthCm).toBe(16);
      expect(sleeve.bicepWidthCm).toBe(19);
      expect(sleeve.wristWidthCm).toBe(9);
      expect(sleeve.yokeHeightCm).toBe(20);
      expect(sleeve.taperLengthCm).toBeCloseTo(42.142857, 5);
      expect(sleeve.axilaAdditionStitches).toBe(12);
      expect(sleeve.axilaAdditionCircumferenceCm).toBe(6);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/domain/gauge.test.ts tests/render/schematicGeometry.test.ts`
Expected: FAIL — `cmForStitches`/`cmForRows` are not exported yet, and `src/render/schematicGeometry.ts` does not exist yet (module not found).

- [ ] **Step 3: Write minimal implementation**

Add to `src/domain/gauge.ts` (below the existing two functions):

```ts
export function cmForStitches(gauge: Gauge, stitches: number): number {
  return (stitches / gauge.stitchesPer10cm) * 10;
}

export function cmForRows(gauge: Gauge, rows: number): number {
  return (rows / gauge.rowsPer10cm) * 10;
}
```

Create `src/render/schematicGeometry.ts`:

```ts
import { cmForRows, cmForStitches } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { GarmentPlan } from "../engine/garmentPlan.js";
import type { RaglanYokeRoundEvent } from "../engine/raglanYoke.js";

function isFrontJoinEvent(
  event: RaglanYokeRoundEvent
): event is Extract<RaglanYokeRoundEvent, { type: "frontJoin" }> {
  return event.type === "frontJoin";
}

export type PanelGeometry = {
  topWidthCm: number;
  underarmWidthCm: number;
  waistWidthCm: number;
  hemWidthCm: number;
  yokeHeightCm: number;
  waistLengthCm: number;
  hemLengthCm: number;
};

export type FrontGeometry = PanelGeometry & {
  joinHeightCm: number;
  joinWidthCm: number;
  joinBoundOnStitches: number;
};

export type SleeveGeometry = {
  topWidthCm: number;
  yokeEndWidthCm: number;
  bicepWidthCm: number;
  wristWidthCm: number;
  yokeHeightCm: number;
  taperLengthCm: number;
  axilaAdditionStitches: number;
  axilaAdditionCircumferenceCm: number;
};

export type SchematicGeometry = {
  back: PanelGeometry;
  front: FrontGeometry;
  sleeveLeft: SleeveGeometry;
  sleeveRight: SleeveGeometry;
};

function computeBackGeometry(plan: GarmentPlan, gauge: Gauge): PanelGeometry {
  return {
    topWidthCm: cmForStitches(gauge, plan.yoke.castOnBreakdown.back),
    underarmWidthCm: cmForStitches(
      gauge,
      plan.yoke.finalStitchCounts.back + plan.yoke.armpitShortfall.back
    ),
    waistWidthCm: cmForStitches(gauge, plan.bodyWaistTaper.finalStitches) / 2,
    hemWidthCm: cmForStitches(gauge, plan.bodyHemTaper.finalStitches) / 2,
    yokeHeightCm: cmForRows(gauge, plan.yoke.schedule.length),
    waistLengthCm: cmForRows(gauge, plan.bodyWaistTaper.schedule.length),
    hemLengthCm: cmForRows(gauge, plan.bodyHemTaper.schedule.length),
  };
}

function computeFrontGeometry(plan: GarmentPlan, gauge: Gauge, back: PanelGeometry): FrontGeometry {
  const joinRound = plan.yoke.schedule.find((round) => round.events.some(isFrontJoinEvent));
  const joinEvent = joinRound?.events.find(isFrontJoinEvent);

  if (!joinRound || !joinEvent) {
    throw new Error("No se encontró la ronda de unión del delantero en el cronograma del canesú.");
  }

  const frontState = joinRound.stitchCounts.front;
  if (frontState.open) {
    throw new Error("La ronda de unión del delantero no dejó al delantero unido.");
  }

  return {
    topWidthCm: cmForStitches(
      gauge,
      plan.yoke.castOnBreakdown.frontLeft + plan.yoke.castOnBreakdown.frontRight
    ),
    underarmWidthCm: back.underarmWidthCm,
    waistWidthCm: back.waistWidthCm,
    hemWidthCm: back.hemWidthCm,
    yokeHeightCm: back.yokeHeightCm,
    waistLengthCm: back.waistLengthCm,
    hemLengthCm: back.hemLengthCm,
    joinHeightCm: cmForRows(gauge, joinRound.roundNumber),
    joinWidthCm: cmForStitches(gauge, frontState.combined),
    joinBoundOnStitches: joinEvent.boundOnStitches,
  };
}

function computeSleeveGeometry(
  plan: GarmentPlan,
  gauge: Gauge,
  side: "sleeveLeft" | "sleeveRight"
): SleeveGeometry {
  const castOn = plan.yoke.castOnBreakdown[side];
  const yokeEnd = plan.yoke.finalStitchCounts[side];
  const axilaShortfall = plan.yoke.armpitShortfall[side];
  const bicepStart =
    side === "sleeveLeft"
      ? plan.axilaJoin.sleeveLeftStartStitches
      : plan.axilaJoin.sleeveRightStartStitches;
  const taper = side === "sleeveLeft" ? plan.sleeveLeftTaper : plan.sleeveRightTaper;

  return {
    topWidthCm: cmForStitches(gauge, castOn) / 2,
    yokeEndWidthCm: cmForStitches(gauge, yokeEnd) / 2,
    bicepWidthCm: cmForStitches(gauge, bicepStart) / 2,
    wristWidthCm: cmForStitches(gauge, taper.finalStitches) / 2,
    yokeHeightCm: cmForRows(gauge, plan.yoke.schedule.length),
    taperLengthCm: cmForRows(gauge, taper.schedule.length),
    axilaAdditionStitches: axilaShortfall,
    axilaAdditionCircumferenceCm: cmForStitches(gauge, axilaShortfall),
  };
}

export function computeSchematicGeometry(plan: GarmentPlan, gauge: Gauge): SchematicGeometry {
  const back = computeBackGeometry(plan, gauge);
  const front = computeFrontGeometry(plan, gauge, back);
  const sleeveLeft = computeSleeveGeometry(plan, gauge, "sleeveLeft");
  const sleeveRight = computeSleeveGeometry(plan, gauge, "sleeveRight");

  return { back, front, sleeveLeft, sleeveRight };
}
```

Then add the barrel export. Open `src/render/index.ts` and add:

```ts
export * from "./schematicGeometry.js";
```

alongside its existing `instructionsRenderer.js` line.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/domain/gauge.test.ts tests/render/schematicGeometry.test.ts`
Expected: PASS (4 tests in gauge.test.ts, 3 tests in schematicGeometry.test.ts).

Then run: `npm run typecheck`
Expected: no errors.

Then run the full suite to make sure nothing regressed: `npm test`
Expected: all tests pass (this task's tests plus every existing test).

- [ ] **Step 5: Commit**

```bash
git add src/domain/gauge.ts tests/domain/gauge.test.ts src/render/schematicGeometry.ts src/render/index.ts tests/render/schematicGeometry.test.ts
git commit -m "Add computeSchematicGeometry for the visual preview, plus cm inverse conversions"
```

---

## Self-Review Notes

- **Spec coverage:** `cmForStitches`/`cmForRows`, the panel-vs-tube convention (back/front direct, sleeves ÷2, body taper ÷2 for a single piece), back/front/sleeve geometry derivation (including scanning the schedule for the join round, mirroring the technique already used in `instructionsRenderer.ts`), and the golden-value regression test against the already-verified example are all covered by this single task. The spec's explicitly-out-of-scope item (drawing/SVG) has no corresponding code, correctly.
- **Placeholder scan:** No TBD/TODO. Every geometry field's formula is written out in full, matching the spec's worked-example numbers exactly (verified by hand in the spec itself before this plan was written).
- **Type consistency:** `PanelGeometry`/`FrontGeometry`/`SleeveGeometry`/`SchematicGeometry` field names match the spec exactly and are used consistently across `computeBackGeometry`/`computeFrontGeometry`/`computeSleeveGeometry`/`computeSchematicGeometry` and the test. `computeFrontGeometry` reuses `computeBackGeometry`'s already-computed `back: PanelGeometry` for the shared body fields rather than recomputing them — no duplicated formulas between back and front for `underarmWidthCm`/`waistWidthCm`/`hemWidthCm`/`yokeHeightCm`/`waistLengthCm`/`hemLengthCm`.
