# Taper Engine (Waist and Sleeve Shaping) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `computeTaper`, a generic row-by-row shaping calculator (the "universal formula" from `docs/tejido-y-patronaje.md` section 10), reusable for both body waist shaping and sleeve tapering, per `docs/superpowers/specs/2026-08-30-taper-engine-design.md`.

**Architecture:** A single pure function in `src/engine/taper.ts`, following the same style as the existing yoke engine (`src/engine/raglanYoke.ts`): no classes, no I/O, a row-by-row schedule plus a summary. It takes plain numbers (start/end stitch counts, available rows) rather than domain types, since it has no knowledge of gauge, measurements, or garment piece names — callers (a future body/sleeve pipeline, out of scope here) are responsible for deriving those numbers and invoking this function once per shaping section.

**Tech Stack:** TypeScript (strict, ESM, NodeNext module resolution), Vitest.

## Global Constraints

- Module resolution is `NodeNext` — every relative import must include an explicit `.js` extension (e.g. `from "../../src/engine/taper.js"`), even though the source file is `.ts`.
- No business logic beyond what's in the spec: no wiring to `RaglanYokeResult`, no armpit-join derivation, no multi-section composition helper (callers chain `computeTaper` calls themselves). If a step tempts you to add any of these, stop — it's out of scope.
- Cadence is **mixed**, not fixed-plus-plain-rows: `primaryCadence = ceil(availableRows / events)`, with a minority of events (`reducedCadenceEventCount`) run at `primaryCadence - 1`, ordered first (more frequent) before the majority at `primaryCadence`. This is a corrected finding from the design spec — do not implement a fixed-cadence-plus-leading-plain-rows version.
- The first shaping row can land on row 1 (when the reduced cadence is 1) — do not special-case row 1 as always plain. This was a second corrected finding from the design spec.
- Run `npm run typecheck` and `npm test` after the task, not just at the end.

---

### Task 1: `computeTaper` with golden-value tests from section 10

**Files:**
- Create: `src/engine/taper.ts`
- Test: `tests/engine/taper.test.ts`

**Interfaces:**
- Consumes: nothing (plain numbers only, no domain types).
- Produces: `TaperRow`, `TaperResult` types, and `computeTaper(startStitches: number, endStitches: number, availableRows: number): TaperResult`. This is the function a future body/sleeve shaping pipeline (out of scope here) will call once per shaping section.

- [ ] **Step 1: Write the failing test**

Create `tests/engine/taper.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeTaper } from "../../src/engine/taper.js";

describe("computeTaper", () => {
  it("matches the axila→cintura example (section 10): 208→176 over 42 rows", () => {
    const result = computeTaper(208, 176, 42);

    expect(result.events).toBe(16);
    expect(result.primaryCadence).toBe(3);
    expect(result.reducedCadence).toBe(2);
    expect(result.reducedCadenceEventCount).toBe(6);
    expect(result.primaryCadenceEventCount).toBe(10);
    expect(result.finalStitches).toBe(176);
    expect(result.schedule).toHaveLength(42);

    const shapingRows = result.schedule
      .filter((row) => row.isShapingRow)
      .map((row) => row.rowNumber);
    expect(shapingRows).toEqual([2, 4, 6, 8, 10, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42]);
  });

  it("matches the cintura→ruedo example (section 10): 176→212 over 34 rows, first shaping row on row 1", () => {
    const result = computeTaper(176, 212, 34);

    expect(result.events).toBe(18);
    expect(result.primaryCadence).toBe(2);
    expect(result.reducedCadence).toBe(1);
    expect(result.reducedCadenceEventCount).toBe(2);
    expect(result.primaryCadenceEventCount).toBe(16);
    expect(result.finalStitches).toBe(212);
    expect(result.schedule).toHaveLength(34);

    const shapingRows = result.schedule
      .filter((row) => row.isShapingRow)
      .map((row) => row.rowNumber);
    expect(shapingRows).toEqual([
      1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34,
    ]);
  });

  it("matches the sleeve taper example (section 10): 76→36 over 118 rows", () => {
    const result = computeTaper(76, 36, 118);

    expect(result.events).toBe(20);
    expect(result.primaryCadence).toBe(6);
    expect(result.reducedCadence).toBe(5);
    expect(result.reducedCadenceEventCount).toBe(2);
    expect(result.primaryCadenceEventCount).toBe(18);
    expect(result.finalStitches).toBe(36);
    expect(result.schedule).toHaveLength(118);

    const shapingRowCount = result.schedule.filter((row) => row.isShapingRow).length;
    expect(shapingRowCount).toBe(20);
    expect(result.schedule[result.schedule.length - 1]).toMatchObject({
      rowNumber: 118,
      isShapingRow: true,
    });
  });

  it("returns a trivial no-shaping result when start and end stitches are equal", () => {
    const result = computeTaper(50, 50, 10);

    expect(result.events).toBe(0);
    expect(result.finalStitches).toBe(50);
    expect(result.schedule).toHaveLength(10);
    expect(result.schedule.every((row) => !row.isShapingRow && row.stitches === 50)).toBe(true);
  });

  it("throws when the stitch difference is odd", () => {
    expect(() => computeTaper(50, 51, 10)).toThrow(/par/);
  });

  it("throws when there are more events than available rows", () => {
    expect(() => computeTaper(50, 10, 5)).toThrow(/no alcanzan/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/engine/taper.test.ts`
Expected: FAIL — `src/engine/taper.ts` does not exist yet (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/taper.ts`:

```ts
export type TaperRow = {
  rowNumber: number;
  isShapingRow: boolean;
  stitches: number;
};

export type TaperResult = {
  schedule: TaperRow[];
  finalStitches: number;
  events: number;
  primaryCadence: number;
  reducedCadence: number;
  primaryCadenceEventCount: number;
  reducedCadenceEventCount: number;
};

export function computeTaper(
  startStitches: number,
  endStitches: number,
  availableRows: number
): TaperResult {
  const totalStitchChange = endStitches - startStitches;

  if (totalStitchChange % 2 !== 0) {
    throw new Error(
      `El cambio de puntos debe ser par para un reparto simétrico (2 puntos por evento): ` +
        `se pidió pasar de ${startStitches} a ${endStitches} (diferencia de ${totalStitchChange}).`
    );
  }

  const events = Math.abs(totalStitchChange) / 2;

  if (events === 0) {
    const schedule: TaperRow[] = [];
    for (let rowNumber = 1; rowNumber <= availableRows; rowNumber++) {
      schedule.push({ rowNumber, isShapingRow: false, stitches: startStitches });
    }
    return {
      schedule,
      finalStitches: startStitches,
      events: 0,
      primaryCadence: 0,
      reducedCadence: 0,
      primaryCadenceEventCount: 0,
      reducedCadenceEventCount: 0,
    };
  }

  if (events > availableRows) {
    throw new Error(
      `No alcanzan las filas disponibles para completar el entallado: se necesitan ${events} ` +
        `eventos de cambio pero solo hay ${availableRows} filas disponibles (ni siquiera "cada fila" alcanza).`
    );
  }

  const direction = totalStitchChange > 0 ? 1 : -1;
  const primaryCadence = Math.ceil(availableRows / events);
  const reducedCadence = primaryCadence - 1;
  const reducedCadenceEventCount = events * primaryCadence - availableRows;
  const primaryCadenceEventCount = events - reducedCadenceEventCount;

  const cadenceForEvent = (eventIndex: number): number =>
    eventIndex < reducedCadenceEventCount ? reducedCadence : primaryCadence;

  const schedule: TaperRow[] = [];
  let stitches = startStitches;
  let eventIndex = 0;
  let nextShapingRow = cadenceForEvent(0);

  for (let rowNumber = 1; rowNumber <= availableRows; rowNumber++) {
    const isShapingRow = eventIndex < events && rowNumber === nextShapingRow;
    if (isShapingRow) {
      stitches += direction * 2;
      eventIndex += 1;
      if (eventIndex < events) {
        nextShapingRow += cadenceForEvent(eventIndex);
      }
    }
    schedule.push({ rowNumber, isShapingRow, stitches });
  }

  return {
    schedule,
    finalStitches: stitches,
    events,
    primaryCadence,
    reducedCadence,
    primaryCadenceEventCount,
    reducedCadenceEventCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/engine/taper.test.ts`
Expected: PASS (6 tests).

Then run: `npm run typecheck`
Expected: no errors.

Then run the full suite to make sure nothing regressed: `npm test`
Expected: all tests pass (this task's 6 tests plus the existing gauge/raglanIncrease/raglanYoke tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/taper.ts tests/engine/taper.test.ts
git commit -m "Add generic taper engine, verified against section 10 numbers"
```

---

## Self-Review Notes

- **Spec coverage:** The spec's entire scope is `computeTaper` plus its three golden tests (axila→cintura, cintura→ruedo, sleeve) and its two validation errors (odd difference, events > availableRows) — all covered by Task 1's single test file. The spec's explicitly-out-of-scope items (armpit-join derivation, multi-section composition, neckband) have no corresponding task, correctly.
- **Placeholder scan:** No TBD/TODO. The two corrected findings from the spec (mixed cadence instead of fixed-cadence-plus-plain-rows; first shaping row can be row 1) are called out in the Global Constraints so an implementer who only skims constraints still gets them right.
- **Type consistency:** `TaperRow`/`TaperResult` are defined once and used consistently in the same file's test. No cross-task type reuse to check (single task, no dependencies on prior plans' types).
