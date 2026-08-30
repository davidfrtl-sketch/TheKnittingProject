# Raglan Yoke Engine (Crew Neckline, Single Size) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the domain types and the raglan yoke calculation engine (symmetric raglan increases + crew neckline shaping) for a single size, per `docs/superpowers/specs/2026-08-30-raglan-yoke-engine-design.md`.

**Architecture:** Pure functions over plain data types, no classes, no I/O. `src/domain/` holds types and unit-conversion helpers (gauge → stitches/rows). `src/engine/` holds two layers: a low-level raglan-increase mechanic (`raglanIncrease.ts`, reusable building block, no neckline awareness) and the public yoke function (`raglanYoke.ts`) that composes it with crew-neckline shaping into a round-by-round schedule plus a final summary. Every numeric claim is checked against the worked examples already verified in `docs/tejido-y-patronaje.md` (sections 8 and 9).

**Tech Stack:** TypeScript (strict, ESM, NodeNext module resolution), Vitest.

## Global Constraints

- Module resolution is `NodeNext` (see `tsconfig.json`) — every relative import must include an explicit `.js` extension (e.g. `from "../domain/gauge.js"`), even though the source file is `.ts`. Omitting it fails `npm run typecheck`.
- No business logic beyond what's in the spec: no scoop/V-neck, no body/sleeve shaping (entallado/manga), no grading, no renderers. If a task tempts you to add any of these, stop — it's out of scope.
- All rounding of cm→stitches/rows happens through `stitchesForCm`/`rowsForCm` (Task 1) — never inline `Math.round` elsewhere.
- Every new file with runtime behavior gets a colocated golden-value test before being considered done (TDD). Pure type-only files do not need a runtime test — `npm run typecheck` is their verification.
- Run `npm run typecheck` and `npm test` after every task, not just at the end.

---

### Task 1: Gauge type and cm-conversion helpers

**Files:**
- Create: `src/domain/gauge.ts`
- Test: `tests/domain/gauge.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `Gauge` type, `stitchesForCm(gauge: Gauge, cm: number): number`, `rowsForCm(gauge: Gauge, cm: number): number`. All later tasks that convert cm to stitches/rows must use these two functions.

- [ ] **Step 1: Write the failing test**

Create `tests/domain/gauge.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { stitchesForCm, rowsForCm } from "../../src/domain/gauge.js";
import type { Gauge } from "../../src/domain/gauge.js";

describe("gauge conversions", () => {
  const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };

  it("converts cm to stitches, rounding to the nearest integer", () => {
    expect(stitchesForCm(gauge, 104)).toBe(208);
    expect(stitchesForCm(gauge, 16)).toBe(32);
    expect(stitchesForCm(gauge, 38)).toBe(76);
  });

  it("converts cm to rows, rounding to the nearest integer", () => {
    expect(rowsForCm(gauge, 20)).toBe(56);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/domain/gauge.test.ts`
Expected: FAIL — `src/domain/gauge.ts` does not exist yet (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/domain/gauge.ts`:

```ts
export type Gauge = {
  stitchesPer10cm: number;
  rowsPer10cm: number;
};

export function stitchesForCm(gauge: Gauge, cm: number): number {
  return Math.round((gauge.stitchesPer10cm / 10) * cm);
}

export function rowsForCm(gauge: Gauge, cm: number): number {
  return Math.round((gauge.rowsPer10cm / 10) * cm);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/domain/gauge.test.ts`
Expected: PASS (2 tests).

Then run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/domain/gauge.ts tests/domain/gauge.test.ts
git commit -m "Add Gauge type and cm-conversion helpers"
```

---

### Task 2: Remaining domain types (Ease, YokeMeasurements, NecklineParams, YokeConstructionParams)

These are pure type declarations with no runtime behavior — nothing to assert in a test, so this task skips the TDD test steps and is verified by `npm run typecheck` instead.

**Files:**
- Create: `src/domain/ease.ts`
- Create: `src/domain/measurements.ts`
- Create: `src/domain/neckline.ts`
- Create: `src/domain/construction.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Ease`, `YokeMeasurements`, `NecklineParams`, `YokeConstructionParams` types, all consumed by Task 4 (`raglanYoke.ts`).

- [ ] **Step 1: Create `src/domain/ease.ts`**

```ts
export type Ease = {
  bodyEaseCm: number;
  sleeveEaseCm: number;
};
```

- [ ] **Step 2: Create `src/domain/measurements.ts`**

```ts
export type YokeMeasurements = {
  chestCm: number;
  neckWidthBackCm: number;
  bicepCm: number;
  armholeDepthCm: number;
};
```

- [ ] **Step 3: Create `src/domain/neckline.ts`**

```ts
export type NecklineParams = {
  frontOpenRounds: number;
  frontStartStitchesPerHalf: number;
  necklineIncreaseCadence: number;
};
```

- [ ] **Step 4: Create `src/domain/construction.ts`**

```ts
export type YokeConstructionParams = {
  initialSleeveStitchesPerSleeve: number;
};
```

- [ ] **Step 5: Verify with typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/domain/ease.ts src/domain/measurements.ts src/domain/neckline.ts src/domain/construction.ts
git commit -m "Add Ease, YokeMeasurements, NecklineParams, YokeConstructionParams types"
```

---

### Task 3: Pure raglan-increase mechanic (building block, no neckline)

Implements the physical rule from section 8 of the domain doc in isolation: every piece touching two raglan lines gains 2 stitches every 2 rounds. This is the building block Task 4 composes with neckline shaping — keeping it separate lets us pin down the "no neckline" (crew-boat) numbers from section 8 as their own golden test, without forcing them through the crew-neckline code path (which structurally assumes a small, growing front — see the spec's Testing section for why).

**Files:**
- Create: `src/engine/raglanIncrease.ts`
- Test: `tests/engine/raglanIncrease.test.ts`

**Interfaces:**
- Consumes: nothing beyond plain numbers (no domain types needed at this layer).
- Produces: `RaglanIncreasePieceCounts`, `RaglanIncreaseRound`, `RaglanIncreaseResult` types, and `computeRaglanIncrease(totalYokeRounds: number, initialStitchCounts: RaglanIncreasePieceCounts): RaglanIncreaseResult`. Task 4 does not call this function directly (it inlines the same per-round rule for back/sleeves/front since front's rule differs while open), but this task's golden test is what pins down the "every 2 rounds, +2 per piece" rule that Task 4 must reproduce.

- [ ] **Step 1: Write the failing test**

Create `tests/engine/raglanIncrease.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeRaglanIncrease } from "../../src/engine/raglanIncrease.js";

describe("computeRaglanIncrease", () => {
  it("matches the worked example in tejido-y-patronaje.md section 8 (boat neckline, no shaping)", () => {
    const result = computeRaglanIncrease(56, {
      back: 32,
      front: 32,
      sleeveLeft: 8,
      sleeveRight: 8,
    });

    expect(result.finalStitchCounts).toEqual({
      back: 88,
      front: 88,
      sleeveLeft: 64,
      sleeveRight: 64,
    });

    const increaseRounds = result.schedule.filter((round) => round.isIncreaseRound);
    expect(increaseRounds).toHaveLength(28);
  });

  it("increases happen every 2 rounds, starting at round 2", () => {
    const result = computeRaglanIncrease(4, {
      back: 0,
      front: 0,
      sleeveLeft: 0,
      sleeveRight: 0,
    });

    expect(result.schedule.map((round) => round.isIncreaseRound)).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/engine/raglanIncrease.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/raglanIncrease.ts`:

```ts
export type RaglanIncreasePieceCounts = {
  back: number;
  front: number;
  sleeveLeft: number;
  sleeveRight: number;
};

export type RaglanIncreaseRound = {
  roundNumber: number;
  isIncreaseRound: boolean;
  stitchCounts: RaglanIncreasePieceCounts;
};

export type RaglanIncreaseResult = {
  schedule: RaglanIncreaseRound[];
  finalStitchCounts: RaglanIncreasePieceCounts;
};

export function computeRaglanIncrease(
  totalYokeRounds: number,
  initialStitchCounts: RaglanIncreasePieceCounts
): RaglanIncreaseResult {
  const schedule: RaglanIncreaseRound[] = [];
  let counts: RaglanIncreasePieceCounts = { ...initialStitchCounts };

  for (let roundNumber = 1; roundNumber <= totalYokeRounds; roundNumber++) {
    const isIncreaseRound = roundNumber % 2 === 0;
    if (isIncreaseRound) {
      counts = {
        back: counts.back + 2,
        front: counts.front + 2,
        sleeveLeft: counts.sleeveLeft + 2,
        sleeveRight: counts.sleeveRight + 2,
      };
    }
    schedule.push({ roundNumber, isIncreaseRound, stitchCounts: { ...counts } });
  }

  return { schedule, finalStitchCounts: counts };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/engine/raglanIncrease.test.ts`
Expected: PASS (2 tests).

Then run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/raglanIncrease.ts tests/engine/raglanIncrease.test.ts
git commit -m "Add pure raglan-increase mechanic, verified against section 8 numbers"
```

---

### Task 4: Full raglan yoke engine with crew neckline

Composes gauge/ease/measurements/neckline/construction inputs into the round-by-round schedule and final summary described in the spec. This is the public entry point of the engine for this pass.

**Files:**
- Create: `src/engine/raglanYoke.ts`
- Test: `tests/engine/raglanYoke.test.ts`

**Interfaces:**
- Consumes: `Gauge`, `stitchesForCm`, `rowsForCm` from `../domain/gauge.js` (Task 1); `Ease` from `../domain/ease.js` (Task 2); `YokeMeasurements` from `../domain/measurements.js` (Task 2); `NecklineParams` from `../domain/neckline.js` (Task 2); `YokeConstructionParams` from `../domain/construction.js` (Task 2).
- Produces: `FrontState`, `RaglanYokePieceCounts`, `RaglanYokeRoundEvent`, `RaglanYokeRound`, `RaglanYokeResult` types, and `computeRaglanYoke(gauge, ease, measurements, necklineParams, constructionParams): RaglanYokeResult`. This is the function a future renderer (out of scope here) will call.

- [ ] **Step 1: Write the failing test**

Create `tests/engine/raglanYoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeRaglanYoke } from "../../src/engine/raglanYoke.js";
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
const construction: YokeConstructionParams = { initialSleeveStitchesPerSleeve: 8 };

describe("computeRaglanYoke", () => {
  it("matches the worked crew-neckline example in tejido-y-patronaje.md section 9", () => {
    const necklineParams: NecklineParams = {
      frontOpenRounds: 12,
      frontStartStitchesPerHalf: 1,
      necklineIncreaseCadence: 1,
    };

    const result = computeRaglanYoke(gauge, ease, measurements, necklineParams, construction);

    expect(result.castOnBreakdown).toEqual({
      back: 32,
      frontLeft: 1,
      frontRight: 1,
      sleeveLeft: 8,
      sleeveRight: 8,
    });

    const joinRound = result.schedule.find((round) =>
      round.events.some((event) => event.type === "frontJoin")
    );
    expect(joinRound?.roundNumber).toBe(13);
    expect(
      joinRound?.events.find((event) => event.type === "frontJoin")
    ).toEqual({ type: "frontJoin", boundOnStitches: 8 });

    expect(result.finalStitchCounts).toEqual({
      back: 88,
      front: 90,
      sleeveLeft: 64,
      sleeveRight: 64,
    });

    expect(result.armpitShortfall).toEqual({
      back: 16,
      front: 14,
      sleeveLeft: 12,
      sleeveRight: 12,
    });
  });

  it("throws when the neckline increases alone exceed the back neck width", () => {
    const necklineParams: NecklineParams = {
      frontOpenRounds: 20,
      frontStartStitchesPerHalf: 1,
      necklineIncreaseCadence: 1,
    };

    expect(() =>
      computeRaglanYoke(gauge, ease, measurements, necklineParams, construction)
    ).toThrow(/no puede cerrar el escote/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/engine/raglanYoke.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/raglanYoke.ts`:

```ts
import { rowsForCm, stitchesForCm } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { Ease } from "../domain/ease.js";
import type { YokeMeasurements } from "../domain/measurements.js";
import type { NecklineParams } from "../domain/neckline.js";
import type { YokeConstructionParams } from "../domain/construction.js";

export type FrontState =
  | { open: true; left: number; right: number }
  | { open: false; combined: number };

export type RaglanYokePieceCounts = {
  back: number;
  front: number;
  sleeveLeft: number;
  sleeveRight: number;
};

export type RaglanYokeRoundEvent =
  | {
      type: "raglanIncrease";
      deltaPerPiece: { back: number; front: number; sleeveLeft: number; sleeveRight: number };
    }
  | { type: "necklineIncrease"; deltaPerSide: { left: number; right: number } }
  | { type: "frontJoin"; boundOnStitches: number };

export type RaglanYokeRound = {
  roundNumber: number;
  events: RaglanYokeRoundEvent[];
  stitchCounts: { back: number; front: FrontState; sleeveLeft: number; sleeveRight: number };
};

export type RaglanYokeResult = {
  schedule: RaglanYokeRound[];
  finalStitchCounts: RaglanYokePieceCounts;
  armpitShortfall: RaglanYokePieceCounts;
  castOnBreakdown: {
    back: number;
    frontLeft: number;
    frontRight: number;
    sleeveLeft: number;
    sleeveRight: number;
  };
};

export function computeRaglanYoke(
  gauge: Gauge,
  ease: Ease,
  measurements: YokeMeasurements,
  necklineParams: NecklineParams,
  constructionParams: YokeConstructionParams
): RaglanYokeResult {
  const totalYokeRounds = rowsForCm(gauge, measurements.armholeDepthCm);
  const { frontOpenRounds, frontStartStitchesPerHalf, necklineIncreaseCadence } = necklineParams;

  const initialBack = stitchesForCm(gauge, measurements.neckWidthBackCm);
  const initialSleeve = constructionParams.initialSleeveStitchesPerSleeve;
  const neckGapWidthSts = initialBack;

  let necklineIncreaseRoundCount = 0;
  for (let roundNumber = 1; roundNumber <= frontOpenRounds; roundNumber++) {
    if ((roundNumber - 1) % necklineIncreaseCadence === 0) {
      necklineIncreaseRoundCount += 1;
    }
  }
  const necklineIncreaseTotalSts = necklineIncreaseRoundCount * 2;
  const boundOnStitches = neckGapWidthSts - necklineIncreaseTotalSts;
  if (boundOnStitches < 0) {
    throw new Error(
      `El delantero no puede cerrar el escote: se necesitan ${necklineIncreaseTotalSts} pts ` +
        `de aumento de escote, más que el ancho de cuello de espalda disponible (${neckGapWidthSts} pts). ` +
        `Aumentá frontOpenRounds o reducí necklineIncreaseCadence.`
    );
  }

  const schedule: RaglanYokeRound[] = [];
  let back = initialBack;
  let sleeveLeft = initialSleeve;
  let sleeveRight = initialSleeve;
  let front: FrontState = {
    open: true,
    left: frontStartStitchesPerHalf,
    right: frontStartStitchesPerHalf,
  };

  for (let roundNumber = 1; roundNumber <= totalYokeRounds; roundNumber++) {
    const events: RaglanYokeRoundEvent[] = [];

    if (roundNumber === frontOpenRounds + 1 && front.open) {
      const combined = front.left + front.right + boundOnStitches;
      events.push({ type: "frontJoin", boundOnStitches });
      front = { open: false, combined };
    }

    if (
      front.open &&
      roundNumber <= frontOpenRounds &&
      (roundNumber - 1) % necklineIncreaseCadence === 0
    ) {
      front = { open: true, left: front.left + 1, right: front.right + 1 };
      events.push({ type: "necklineIncrease", deltaPerSide: { left: 1, right: 1 } });
    }

    if (roundNumber % 2 === 0) {
      back += 2;
      sleeveLeft += 2;
      sleeveRight += 2;
      front = front.open
        ? { open: true, left: front.left + 1, right: front.right + 1 }
        : { open: false, combined: front.combined + 2 };
      events.push({
        type: "raglanIncrease",
        deltaPerPiece: { back: 2, front: 2, sleeveLeft: 2, sleeveRight: 2 },
      });
    }

    schedule.push({
      roundNumber,
      events,
      stitchCounts: { back, front, sleeveLeft, sleeveRight },
    });
  }

  const finalFront = front.open ? front.left + front.right : front.combined;
  const finalStitchCounts: RaglanYokePieceCounts = {
    back,
    front: finalFront,
    sleeveLeft,
    sleeveRight,
  };

  const targetChestStitches = stitchesForCm(gauge, measurements.chestCm + ease.bodyEaseCm);
  const targetPerBodyPiece = Math.round(targetChestStitches / 2);
  const targetSleeveStitches = stitchesForCm(gauge, measurements.bicepCm + ease.sleeveEaseCm);

  const armpitShortfall: RaglanYokePieceCounts = {
    back: targetPerBodyPiece - back,
    front: targetPerBodyPiece - finalFront,
    sleeveLeft: targetSleeveStitches - sleeveLeft,
    sleeveRight: targetSleeveStitches - sleeveRight,
  };

  return {
    schedule,
    finalStitchCounts,
    armpitShortfall,
    castOnBreakdown: {
      back: initialBack,
      frontLeft: frontStartStitchesPerHalf,
      frontRight: frontStartStitchesPerHalf,
      sleeveLeft: initialSleeve,
      sleeveRight: initialSleeve,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/engine/raglanYoke.test.ts`
Expected: PASS (2 tests).

Then run: `npm run typecheck`
Expected: no errors.

Then run the full suite to make sure nothing regressed: `npm test`
Expected: all tests pass (Task 1 + Task 3 + Task 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/raglanYoke.ts tests/engine/raglanYoke.test.ts
git commit -m "Add raglan yoke engine with crew neckline, verified against section 9 numbers"
```

---

## Self-Review Notes

- **Spec coverage:** `Gauge`/conversions → Task 1. `Ease`/`YokeMeasurements`/`NecklineParams`/`YokeConstructionParams` → Task 2. Pure raglan mechanic (section 8 golden values) → Task 3. Full crew-neckline engine, round-by-round schedule, final summary, armpit shortfall, cast-on breakdown, boundary validation (section 9 golden values) → Task 4. All spec sections are covered; renderers and out-of-scope items (scoop/V-neck, shaping, grading) are correctly left untouched.
- **Placeholder scan:** no TBD/TODO, no "add validation" without code — the validation in Task 4 has the exact `if` and error message. No "similar to Task N" shortcuts — Task 4's full implementation is written out in full even though it echoes Task 3's per-round idea.
- **Type consistency:** `RaglanYokePieceCounts`, `FrontState`, `RaglanYokeRoundEvent`, `RaglanYokeRound`, `RaglanYokeResult` are defined once in Task 4 and used consistently in its own test; Task 3's `RaglanIncreasePieceCounts`/`RaglanIncreaseResult` are a separate, intentionally simpler type family (no front-open/closed union) since that layer never sees a split front. Import paths all carry the required `.js` extension per the Global Constraints (NodeNext resolution).
