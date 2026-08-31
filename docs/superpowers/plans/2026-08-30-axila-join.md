# Axila Join Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `computeAxilaJoin`, the function that converts a `RaglanYokeResult` into the body and sleeve starting stitch counts (plus the per-axila cast-on breakdown) needed to feed `computeTaper`, per `docs/superpowers/specs/2026-08-30-axila-join-design.md`.

**Architecture:** A single pure function in `src/engine/axilaJoin.ts`, following the same style as the existing engine files (`raglanYoke.ts`, `taper.ts`): no classes, no I/O. It consumes the `RaglanYokeResult` type produced by `computeRaglanYoke` and reads only two of its fields (`finalStitchCounts`, `armpitShortfall`) — it does not touch `schedule` or `castOnBreakdown`.

**Tech Stack:** TypeScript (strict, ESM, NodeNext module resolution), Vitest.

## Global Constraints

- Module resolution is `NodeNext` — every relative import must include an explicit `.js` extension, for both type-only and value imports.
- Physical model: back and front each touch both of the 2 physical underarms, so their shortfall is split in half between the two; each sleeve touches only its own single underarm, so its full shortfall goes there, unsplit.
- Odd-shortfall rounding: the left axila gets the extra stitch (`ceil` on the left, `floor` on the right) — a fixed, documented convention, not a case to special-case per call.
- A negative shortfall on any piece is a validation error (thrown), not a case to silently coerce to zero or otherwise "fix."
- No business logic beyond what's in the spec: this task does not call `computeTaper`, does not touch the neckband, grading, or renderers.
- Run `npm run typecheck` and `npm test` after the task, not just at the end.

---

### Task 1: `computeAxilaJoin` with golden-value and edge-case tests

**Files:**
- Create: `src/engine/axilaJoin.ts`
- Test: `tests/engine/axilaJoin.test.ts`

**Interfaces:**
- Consumes: `RaglanYokeResult` type from `../engine/raglanYoke.js` (already implemented — has fields `schedule`, `finalStitchCounts: { back, front, sleeveLeft, sleeveRight }`, `armpitShortfall: { back, front, sleeveLeft, sleeveRight }`, `castOnBreakdown`). Also uses `computeRaglanYoke` from the same file, and `Gauge`/`Ease`/`YokeMeasurements`/`NecklineParams`/`YokeConstructionParams` from `../domain/*.js`, purely to build the golden-value test's input (not used by the implementation itself).
- Produces: `AxilaCastOn`, `AxilaJoinResult` types, and `computeAxilaJoin(yokeResult: RaglanYokeResult): AxilaJoinResult`. This is the function a future pipeline step will call between `computeRaglanYoke` and `computeTaper` (that chaining itself is out of scope for this task).

- [ ] **Step 1: Write the failing test**

Create `tests/engine/axilaJoin.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeAxilaJoin } from "../../src/engine/axilaJoin.js";
import { computeRaglanYoke } from "../../src/engine/raglanYoke.js";
import type { RaglanYokeResult } from "../../src/engine/raglanYoke.js";
import type { Gauge } from "../../src/domain/gauge.js";
import type { Ease } from "../../src/domain/ease.js";
import type { YokeMeasurements } from "../../src/domain/measurements.js";
import type { NecklineParams } from "../../src/domain/neckline.js";
import type { YokeConstructionParams } from "../../src/domain/construction.js";

const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };
const ease: Ease = { bodyEaseCm: 8, sleeveEaseCm: 6 };
const measurements: YokeMeasurements = {
  chestCm: 96,
  neckWidthBackCm: 16,
  bicepCm: 32,
  armholeDepthCm: 20,
};
const necklineParams: NecklineParams = {
  frontOpenRounds: 12,
  frontStartStitchesPerHalf: 1,
  necklineIncreaseCadence: 1,
};
const construction: YokeConstructionParams = { initialSleeveStitchesPerSleeve: 8 };

function yokeResultWithShortfall(
  armpitShortfall: RaglanYokeResult["armpitShortfall"]
): RaglanYokeResult {
  return {
    schedule: [],
    finalStitchCounts: { back: 0, front: 0, sleeveLeft: 0, sleeveRight: 0 },
    armpitShortfall,
    castOnBreakdown: { back: 0, frontLeft: 0, frontRight: 0, sleeveLeft: 0, sleeveRight: 0 },
  };
}

describe("computeAxilaJoin", () => {
  it("matches the worked crew-neckline example (section 9) fed through the real yoke engine", () => {
    const yokeResult = computeRaglanYoke(gauge, ease, measurements, necklineParams, construction);

    const result = computeAxilaJoin(yokeResult);

    expect(result.bodyStartStitches).toBe(208);
    expect(result.sleeveLeftStartStitches).toBe(76);
    expect(result.sleeveRightStartStitches).toBe(76);
    expect(result.castOnPerAxila.left).toEqual({ back: 8, front: 7, total: 15 });
    expect(result.castOnPerAxila.right).toEqual({ back: 8, front: 7, total: 15 });
  });

  it("gives the extra stitch to the left axila when back/front shortfall is odd", () => {
    const yokeResult = yokeResultWithShortfall({ back: 15, front: 9, sleeveLeft: 0, sleeveRight: 0 });

    const result = computeAxilaJoin(yokeResult);

    expect(result.castOnPerAxila.left).toEqual({ back: 8, front: 5, total: 13 });
    expect(result.castOnPerAxila.right).toEqual({ back: 7, front: 4, total: 11 });
  });

  it("throws when a shortfall is negative", () => {
    const yokeResult = yokeResultWithShortfall({ back: -1, front: 0, sleeveLeft: 0, sleeveRight: 0 });

    expect(() => computeAxilaJoin(yokeResult)).toThrow(/faltante en axila/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/engine/axilaJoin.test.ts`
Expected: FAIL — `src/engine/axilaJoin.ts` does not exist yet (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/axilaJoin.ts`:

```ts
import type { RaglanYokeResult } from "./raglanYoke.js";

export type AxilaCastOn = {
  back: number;
  front: number;
  total: number;
};

export type AxilaJoinResult = {
  bodyStartStitches: number;
  sleeveLeftStartStitches: number;
  sleeveRightStartStitches: number;
  castOnPerAxila: {
    left: AxilaCastOn;
    right: AxilaCastOn;
  };
};

function splitLeftHeavy(total: number): { left: number; right: number } {
  return { left: Math.ceil(total / 2), right: Math.floor(total / 2) };
}

export function computeAxilaJoin(yokeResult: RaglanYokeResult): AxilaJoinResult {
  const { finalStitchCounts, armpitShortfall } = yokeResult;

  (["back", "front", "sleeveLeft", "sleeveRight"] as const).forEach((key) => {
    if (armpitShortfall[key] < 0) {
      throw new Error(
        `El faltante en axila de ${key} es negativo (${armpitShortfall[key]}): ` +
          `el canesú ya superó el objetivo de talla en esa pieza, y este cálculo ` +
          `solo sabe montar puntos, no disminuir.`
      );
    }
  });

  const backSplit = splitLeftHeavy(armpitShortfall.back);
  const frontSplit = splitLeftHeavy(armpitShortfall.front);

  const left: AxilaCastOn = {
    back: backSplit.left,
    front: frontSplit.left,
    total: backSplit.left + frontSplit.left,
  };
  const right: AxilaCastOn = {
    back: backSplit.right,
    front: frontSplit.right,
    total: backSplit.right + frontSplit.right,
  };

  return {
    bodyStartStitches:
      finalStitchCounts.back +
      finalStitchCounts.front +
      armpitShortfall.back +
      armpitShortfall.front,
    sleeveLeftStartStitches: finalStitchCounts.sleeveLeft + armpitShortfall.sleeveLeft,
    sleeveRightStartStitches: finalStitchCounts.sleeveRight + armpitShortfall.sleeveRight,
    castOnPerAxila: { left, right },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/engine/axilaJoin.test.ts`
Expected: PASS (3 tests).

Then run: `npm run typecheck`
Expected: no errors.

Then run the full suite to make sure nothing regressed: `npm test`
Expected: all tests pass (this task's 3 tests plus the existing gauge/raglanIncrease/raglanYoke/taper tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/axilaJoin.ts tests/engine/axilaJoin.test.ts
git commit -m "Add axila join, connecting the yoke engine to the taper engine"
```

---

## Self-Review Notes

- **Spec coverage:** `bodyStartStitches`, `sleeveLeftStartStitches`/`sleeveRightStartStitches`, the half-split-with-left-heavy-rounding for back/front, the whole-shortfall-to-one-axila for sleeves, and the negative-shortfall validation are all implemented and covered by the three tests (golden value via the real engine, odd-split rounding, and the validation error). The spec's explicitly-out-of-scope item (chaining into `computeTaper`) has no task, correctly.
- **Placeholder scan:** No TBD/TODO. The rounding convention and validation behavior are both fully specified in code, not described abstractly.
- **Type consistency:** `AxilaCastOn`/`AxilaJoinResult` are defined once and used consistently in the same file's test. `RaglanYokeResult`'s field names (`finalStitchCounts`, `armpitShortfall`, `schedule`, `castOnBreakdown`) match exactly what `src/engine/raglanYoke.ts` already exports — the test's `yokeResultWithShortfall` helper builds a literal of that exact shape.
