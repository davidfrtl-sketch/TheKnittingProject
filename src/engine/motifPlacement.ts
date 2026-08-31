import type { GarmentPlan } from "./garmentPlan.js";

export type BackMotifColumn = {
  widthStitches: number;
  heightRows: number;
};

export type BackMotifColumnInput = Pick<GarmentPlan, "yoke" | "bodyWaistTaper" | "bodyHemTaper">;

export function computeBackMotifColumn(plan: BackMotifColumnInput): BackMotifColumn | null {
  const yokeBackValues = [
    plan.yoke.castOnBreakdown.back,
    ...plan.yoke.schedule.map((round) => round.stitchCounts.back),
  ];
  let minBack = Math.min(...yokeBackValues);

  const bodyValues = [
    ...plan.bodyWaistTaper.schedule.map((row) => row.stitches),
    ...plan.bodyHemTaper.schedule.map((row) => row.stitches),
  ];
  for (const stitches of bodyValues) {
    const backShare = stitches / 2;
    if (backShare < minBack) {
      minBack = backShare;
    }
  }

  const widthStitches = Math.floor(minBack / 2) * 2;
  if (widthStitches < 1) {
    return null;
  }

  const heightRows =
    plan.yoke.schedule.length + plan.bodyWaistTaper.schedule.length + plan.bodyHemTaper.schedule.length;

  return { widthStitches, heightRows };
}
