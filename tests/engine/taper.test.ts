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

  it("handles the boundary where every row is a shaping row (events === availableRows)", () => {
    const result = computeTaper(10, 0, 5);

    expect(result.events).toBe(5);
    expect(result.primaryCadence).toBe(1);
    expect(result.reducedCadence).toBe(0);
    expect(result.reducedCadenceEventCount).toBe(0);
    expect(result.primaryCadenceEventCount).toBe(5);
    expect(result.finalStitches).toBe(0);
    expect(result.schedule).toHaveLength(5);
    expect(result.schedule.every((row) => row.isShapingRow)).toBe(true);
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
