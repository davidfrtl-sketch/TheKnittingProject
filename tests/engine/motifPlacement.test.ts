import { describe, it, expect } from "vitest";
import { findMotifSource } from "../../src/engine/motifPlacement.js";
import type { MotifPlacementInput } from "../../src/engine/motifPlacement.js";
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

describe("findMotifSource", () => {
  it("picks the longest run of equal-stitch rows across the three phases", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([
        makeRow(1, 100),
        makeRow(2, 100),
        makeRow(3, 98),
        makeRow(4, 98),
        makeRow(5, 98),
        makeRow(6, 96),
      ]),
      bodyHemTaper: makeTaper([makeRow(1, 80), makeRow(2, 82), makeRow(3, 82), makeRow(4, 84)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 40), makeRow(2, 40), makeRow(3, 42)]),
    };

    expect(findMotifSource(plan)).toEqual({
      segment: "bodyWaist",
      startRow: 3,
      rowCount: 3,
      stitches: 98,
    });
  });

  it("breaks ties with priority bodyWaist > bodyHem > sleeve", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 10), makeRow(2, 12), makeRow(3, 12), makeRow(4, 14)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 22), makeRow(4, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 5), makeRow(2, 6), makeRow(3, 6), makeRow(4, 7)]),
    };

    expect(findMotifSource(plan)).toEqual({
      segment: "bodyWaist",
      startRow: 2,
      rowCount: 2,
      stitches: 12,
    });
  });

  it("returns null when every phase changes stitch count on every row", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 10), makeRow(2, 12), makeRow(3, 14)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 5), makeRow(2, 6), makeRow(3, 7)]),
    };

    expect(findMotifSource(plan)).toBeNull();
  });
});
