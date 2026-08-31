import { describe, it, expect } from "vitest";
import { computeBackMotifColumn } from "../../src/engine/motifPlacement.js";
import type { BackMotifColumnInput } from "../../src/engine/motifPlacement.js";
import type { RaglanYokeResult } from "../../src/engine/raglanYoke.js";
import type { TaperResult, TaperRow } from "../../src/engine/taper.js";

function makeRow(rowNumber: number, stitches: number): TaperRow {
  return { rowNumber, stitches, isShapingRow: false };
}

function makeTaper(schedule: TaperRow[]): TaperResult {
  const last = schedule[schedule.length - 1];
  return {
    schedule,
    finalStitches: last ? last.stitches : 0,
    events: 0,
    primaryCadence: 0,
    reducedCadence: 0,
    primaryCadenceEventCount: 0,
    reducedCadenceEventCount: 0,
  };
}

function makeYoke(castOnBack: number, backCounts: number[]): RaglanYokeResult {
  const schedule = backCounts.map((back, index) => ({
    roundNumber: index + 1,
    events: [],
    stitchCounts: { back, front: { open: false as const, combined: 0 }, sleeveLeft: 0, sleeveRight: 0 },
  }));
  return {
    schedule,
    finalStitchCounts: { back: 0, front: 0, sleeveLeft: 0, sleeveRight: 0 },
    armpitShortfall: { back: 0, front: 0, sleeveLeft: 0, sleeveRight: 0 },
    castOnBreakdown: { back: castOnBack, frontLeft: 0, frontRight: 0, sleeveLeft: 0, sleeveRight: 0 },
  };
}

describe("computeBackMotifColumn", () => {
  it("uses the yoke cast-on width when it is tighter than anything in the body taper", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(20, [20, 22, 24]),
      bodyWaistTaper: makeTaper([makeRow(1, 100), makeRow(2, 98)]),
      bodyHemTaper: makeTaper([makeRow(1, 98), makeRow(2, 100)]),
    };

    expect(computeBackMotifColumn(plan)).toEqual({ widthStitches: 20, heightRows: 7 });
  });

  it("uses the body taper's tighter width when it is narrower than the yoke cast-on", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(40, [40, 42, 44]),
      bodyWaistTaper: makeTaper([makeRow(1, 60), makeRow(2, 50)]),
      bodyHemTaper: makeTaper([makeRow(1, 50), makeRow(2, 70)]),
    };

    expect(computeBackMotifColumn(plan)).toEqual({ widthStitches: 24, heightRows: 7 });
  });

  it("finds the true minimum without assuming the waist taper always decreases", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(100, [100, 102]),
      bodyWaistTaper: makeTaper([makeRow(1, 50), makeRow(2, 60)]),
      bodyHemTaper: makeTaper([makeRow(1, 60), makeRow(2, 40)]),
    };

    expect(computeBackMotifColumn(plan)).toEqual({ widthStitches: 20, heightRows: 6 });
  });

  it("rounds an odd width down to the nearest even number", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(21, [21, 23]),
      bodyWaistTaper: makeTaper([makeRow(1, 200)]),
      bodyHemTaper: makeTaper([makeRow(1, 202)]),
    };

    expect(computeBackMotifColumn(plan)).toEqual({ widthStitches: 20, heightRows: 4 });
  });

  it("returns null when the narrowest available width is less than 1 stitch", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(0, [0]),
      bodyWaistTaper: makeTaper([makeRow(1, 1000)]),
      bodyHemTaper: makeTaper([makeRow(1, 1000)]),
    };

    expect(computeBackMotifColumn(plan)).toBeNull();
  });
});
