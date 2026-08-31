import { describe, it, expect } from "vitest";
import { findMotifCandidates } from "../../src/engine/motifPlacement.js";
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

describe("findMotifCandidates", () => {
  it("returns all three usable candidates sorted by rowCount descending", () => {
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

    expect(findMotifCandidates(plan)).toEqual([
      { segment: "bodyWaist", startRow: 3, rowCount: 3, stitches: 98 },
      { segment: "bodyHem", startRow: 2, rowCount: 2, stitches: 82 },
      { segment: "sleeve", startRow: 1, rowCount: 2, stitches: 40 },
    ]);
  });

  it("keeps stable insertion order (bodyWaist, bodyHem, sleeve) among equal-length candidates", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 10), makeRow(2, 12), makeRow(3, 12), makeRow(4, 14)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 22), makeRow(4, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 5), makeRow(2, 6), makeRow(3, 6), makeRow(4, 7)]),
    };

    expect(findMotifCandidates(plan)).toEqual([
      { segment: "bodyWaist", startRow: 2, rowCount: 2, stitches: 12 },
      { segment: "bodyHem", startRow: 2, rowCount: 2, stitches: 22 },
      { segment: "sleeve", startRow: 2, rowCount: 2, stitches: 6 },
    ]);
  });

  it("excludes phases with no usable run, keeping only the qualifying ones", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 5), makeRow(2, 5), makeRow(3, 5)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 1), makeRow(2, 2), makeRow(3, 3)]),
    };

    expect(findMotifCandidates(plan)).toEqual([
      { segment: "bodyWaist", startRow: 1, rowCount: 3, stitches: 5 },
    ]);
  });

  it("returns an empty array when no phase has any 2-row plateau", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 10), makeRow(2, 12), makeRow(3, 14)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 5), makeRow(2, 6), makeRow(3, 7)]),
    };

    expect(findMotifCandidates(plan)).toEqual([]);
  });
});
