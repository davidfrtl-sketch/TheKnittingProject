# Garment Plan Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `computeGarmentPlan`, the function that chains the three existing engines (raglan yoke, axila join, taper) into a single call driven by a complete cm-based measurement schema, per `docs/superpowers/specs/2026-08-30-garment-plan-design.md`.

**Architecture:** One new domain type (`GarmentMeasurements`, extending the existing `YokeMeasurements`) and one new engine function (`computeGarmentPlan`) that is pure composition — it calls `computeRaglanYoke`, `computeAxilaJoin`, and `computeTaper` (three times: body waist, body hem, and once per sleeve) in sequence, with no new calculation logic of its own beyond deriving each `computeTaper` call's arguments via the existing `stitchesForCm`/`rowsForCm` helpers.

**Tech Stack:** TypeScript (strict, ESM, NodeNext module resolution), Vitest.

## Global Constraints

- Module resolution is `NodeNext` — every relative import must include an explicit `.js` extension, for both type-only and value imports.
- `GarmentMeasurements` extends `YokeMeasurements` (adds fields, does not replace or rename any existing field) — it must remain structurally assignable to `YokeMeasurements` so it can be passed directly to `computeRaglanYoke` without any conversion.
- Ease reuse: waist and hip target stitches use `ease.bodyEaseCm` (the same value already used for chest); wrist target stitches use `ease.sleeveEaseCm` (the same value already used for bicep). No new ease fields.
- `bodyHemTaper` chains from `bodyWaistTaper.finalStitches`, not from `axilaJoin.bodyStartStitches` again — the hem tapers from where the waist taper left off.
- No new business logic beyond composing existing functions: this task does not touch the yoke engine, the taper engine, the axila join, the neckband, grading, or renderers.
- Run `npm run typecheck` and `npm test` after the task, not just at the end.

---

### Task 1: `GarmentMeasurements` type and `computeGarmentPlan`

**Files:**
- Modify: `src/domain/measurements.ts` (add `GarmentMeasurements`, keep the existing `YokeMeasurements` untouched)
- Create: `src/engine/garmentPlan.ts`
- Test: `tests/engine/garmentPlan.test.ts`

**Interfaces:**
- Consumes: `Gauge`, `stitchesForCm`, `rowsForCm` from `../domain/gauge.js`; `Ease` from `../domain/ease.js`; `YokeMeasurements` (existing) and the new `GarmentMeasurements` from `../domain/measurements.js`; `NecklineParams` from `../domain/neckline.js`; `YokeConstructionParams` from `../domain/construction.js`; `computeRaglanYoke`/`RaglanYokeResult` from `./raglanYoke.js`; `computeAxilaJoin`/`AxilaJoinResult` from `./axilaJoin.js`; `computeTaper`/`TaperResult` from `./taper.js`. All of these already exist — this task only wires them together.
- Produces: `GarmentMeasurements` type and `GarmentPlan` type, plus `computeGarmentPlan(gauge, ease, measurements, necklineParams, constructionParams): GarmentPlan`. This is the function a future instructions renderer will consume.

- [ ] **Step 1: Write the failing test**

First, add the new type. Open `src/domain/measurements.ts` and add, below the existing `YokeMeasurements` type (do not modify `YokeMeasurements` itself):

```ts
export type GarmentMeasurements = YokeMeasurements & {
  waistCm: number;
  hipCm: number;
  wristCm: number;
  waistLengthCm: number; // axila → cintura
  hemLengthCm: number; // cintura → ruedo
  sleeveLengthCm: number; // fin del canesú → puño
};
```

Then create `tests/engine/garmentPlan.test.ts`:

```ts
import { describe, it, expect } from "vitest";
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

describe("computeGarmentPlan", () => {
  it("reproduces, in one call, every golden value already verified separately for the section 9/10 example", () => {
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);

    expect(plan.yoke.finalStitchCounts).toEqual({
      back: 88,
      front: 90,
      sleeveLeft: 64,
      sleeveRight: 64,
    });

    expect(plan.axilaJoin.bodyStartStitches).toBe(208);
    expect(plan.axilaJoin.sleeveLeftStartStitches).toBe(76);
    expect(plan.axilaJoin.sleeveRightStartStitches).toBe(76);
    expect(plan.axilaJoin.castOnPerAxila.left).toEqual({ back: 8, front: 7, total: 15 });
    expect(plan.axilaJoin.castOnPerAxila.right).toEqual({ back: 8, front: 7, total: 15 });

    expect(plan.bodyWaistTaper.events).toBe(16);
    expect(plan.bodyWaistTaper.primaryCadence).toBe(3);
    expect(plan.bodyWaistTaper.reducedCadence).toBe(2);
    expect(plan.bodyWaistTaper.finalStitches).toBe(176);

    expect(plan.bodyHemTaper.events).toBe(18);
    expect(plan.bodyHemTaper.primaryCadence).toBe(2);
    expect(plan.bodyHemTaper.reducedCadence).toBe(1);
    expect(plan.bodyHemTaper.finalStitches).toBe(212);

    for (const sleeveTaper of [plan.sleeveLeftTaper, plan.sleeveRightTaper]) {
      expect(sleeveTaper.events).toBe(20);
      expect(sleeveTaper.primaryCadence).toBe(6);
      expect(sleeveTaper.reducedCadence).toBe(5);
      expect(sleeveTaper.finalStitches).toBe(36);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/engine/garmentPlan.test.ts`
Expected: FAIL — `src/engine/garmentPlan.ts` does not exist yet (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/garmentPlan.ts`:

```ts
import { rowsForCm, stitchesForCm } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { Ease } from "../domain/ease.js";
import type { GarmentMeasurements } from "../domain/measurements.js";
import type { NecklineParams } from "../domain/neckline.js";
import type { YokeConstructionParams } from "../domain/construction.js";
import { computeRaglanYoke } from "./raglanYoke.js";
import type { RaglanYokeResult } from "./raglanYoke.js";
import { computeAxilaJoin } from "./axilaJoin.js";
import type { AxilaJoinResult } from "./axilaJoin.js";
import { computeTaper } from "./taper.js";
import type { TaperResult } from "./taper.js";

export type GarmentPlan = {
  yoke: RaglanYokeResult;
  axilaJoin: AxilaJoinResult;
  bodyWaistTaper: TaperResult;
  bodyHemTaper: TaperResult;
  sleeveLeftTaper: TaperResult;
  sleeveRightTaper: TaperResult;
};

export function computeGarmentPlan(
  gauge: Gauge,
  ease: Ease,
  measurements: GarmentMeasurements,
  necklineParams: NecklineParams,
  constructionParams: YokeConstructionParams
): GarmentPlan {
  const yoke = computeRaglanYoke(gauge, ease, measurements, necklineParams, constructionParams);
  const axilaJoin = computeAxilaJoin(yoke);

  const waistTargetStitches = stitchesForCm(gauge, measurements.waistCm + ease.bodyEaseCm);
  const bodyWaistTaper = computeTaper(
    axilaJoin.bodyStartStitches,
    waistTargetStitches,
    rowsForCm(gauge, measurements.waistLengthCm)
  );

  const hipTargetStitches = stitchesForCm(gauge, measurements.hipCm + ease.bodyEaseCm);
  const bodyHemTaper = computeTaper(
    bodyWaistTaper.finalStitches,
    hipTargetStitches,
    rowsForCm(gauge, measurements.hemLengthCm)
  );

  const wristTargetStitches = stitchesForCm(gauge, measurements.wristCm + ease.sleeveEaseCm);
  const sleeveRows = rowsForCm(gauge, measurements.sleeveLengthCm);
  const sleeveLeftTaper = computeTaper(
    axilaJoin.sleeveLeftStartStitches,
    wristTargetStitches,
    sleeveRows
  );
  const sleeveRightTaper = computeTaper(
    axilaJoin.sleeveRightStartStitches,
    wristTargetStitches,
    sleeveRows
  );

  return {
    yoke,
    axilaJoin,
    bodyWaistTaper,
    bodyHemTaper,
    sleeveLeftTaper,
    sleeveRightTaper,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/engine/garmentPlan.test.ts`
Expected: PASS (1 test).

Then run: `npm run typecheck`
Expected: no errors.

Then run the full suite to make sure nothing regressed: `npm test`
Expected: all tests pass (this task's test plus every existing test from the domain and engine layers).

- [ ] **Step 5: Commit**

```bash
git add src/domain/measurements.ts src/engine/garmentPlan.ts tests/engine/garmentPlan.test.ts
git commit -m "Add computeGarmentPlan, chaining yoke, axila join, and taper into one call"
```

---

## Self-Review Notes

- **Spec coverage:** `GarmentMeasurements` (extending, not replacing, `YokeMeasurements`), the ease-reuse rule (waist/hip via `bodyEaseCm`, wrist via `sleeveEaseCm`), the 5-step composition (yoke → axila join → waist taper → hem taper chained from the waist taper's result → both sleeve tapers), and the golden-value regression test are all covered by this single task. The spec's explicitly-out-of-scope items (unified timeline, stitch-pattern charting, scoop/V-neck, grading, renderers/UI) have no corresponding task, correctly.
- **Placeholder scan:** No TBD/TODO. The exact measurement values that reproduce the previously-verified 42/34/118-row taper examples are given directly (including the two non-round decimal lengths, with the reasoning — "chosen so the row counts match" — already recorded in the spec).
- **Type consistency:** `GarmentPlan`'s field names (`yoke`, `axilaJoin`, `bodyWaistTaper`, `bodyHemTaper`, `sleeveLeftTaper`, `sleeveRightTaper`) match the spec exactly and are used consistently in the test. `GarmentMeasurements`'s new field names (`waistCm`, `hipCm`, `wristCm`, `waistLengthCm`, `hemLengthCm`, `sleeveLengthCm`) match between the type definition and every call site in `computeGarmentPlan`.
