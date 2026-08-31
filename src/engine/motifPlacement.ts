import type { TaperRow } from "./taper.js";
import type { GarmentPlan } from "./garmentPlan.js";

export type MotifSegment = "bodyWaist" | "bodyHem" | "sleeve";

export type MotifSource = {
  segment: MotifSegment;
  startRow: number;
  rowCount: number;
  stitches: number;
};

export type MotifPlacementInput = Pick<
  GarmentPlan,
  "bodyWaistTaper" | "bodyHemTaper" | "sleeveLeftTaper"
>;

type Run = { startRow: number; rowCount: number; stitches: number };

function longestRun(schedule: TaperRow[]): Run | null {
  let best: Run | null = null;
  let current: Run | null = null;

  for (const row of schedule) {
    if (current && current.stitches === row.stitches) {
      current = {
        startRow: current.startRow,
        rowCount: current.rowCount + 1,
        stitches: current.stitches,
      };
    } else {
      current = { startRow: row.rowNumber, rowCount: 1, stitches: row.stitches };
    }
    if (!best || current.rowCount > best.rowCount) {
      best = current;
    }
  }

  return best;
}

const SEGMENT_ORDER: MotifSegment[] = ["bodyWaist", "bodyHem", "sleeve"];

export function findMotifSource(plan: MotifPlacementInput): MotifSource | null {
  const runsBySegment: Record<MotifSegment, Run | null> = {
    bodyWaist: longestRun(plan.bodyWaistTaper.schedule),
    bodyHem: longestRun(plan.bodyHemTaper.schedule),
    sleeve: longestRun(plan.sleeveLeftTaper.schedule),
  };

  let winner: { segment: MotifSegment; run: Run } | null = null;
  for (const segment of SEGMENT_ORDER) {
    const run = runsBySegment[segment];
    if (!run) {
      continue;
    }
    if (!winner || run.rowCount > winner.run.rowCount) {
      winner = { segment, run };
    }
  }

  if (!winner || winner.run.rowCount <= 1) {
    return null;
  }

  return {
    segment: winner.segment,
    startRow: winner.run.startRow,
    rowCount: winner.run.rowCount,
    stitches: winner.run.stitches,
  };
}
