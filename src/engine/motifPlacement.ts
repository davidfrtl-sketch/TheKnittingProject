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

export function findMotifCandidates(plan: MotifPlacementInput): MotifSource[] {
  const scheduleBySegment: Record<MotifSegment, TaperRow[]> = {
    bodyWaist: plan.bodyWaistTaper.schedule,
    bodyHem: plan.bodyHemTaper.schedule,
    sleeve: plan.sleeveLeftTaper.schedule,
  };

  const candidates: Array<{ segment: MotifSegment; run: Run }> = [];
  for (const segment of SEGMENT_ORDER) {
    const run = longestRun(scheduleBySegment[segment]);
    if (run && run.rowCount > 1) {
      candidates.push({ segment, run });
    }
  }

  candidates.sort((a, b) => b.run.rowCount - a.run.rowCount);

  return candidates.map(({ segment, run }) => ({
    segment,
    startRow: run.startRow,
    rowCount: run.rowCount,
    stitches: run.stitches,
  }));
}
