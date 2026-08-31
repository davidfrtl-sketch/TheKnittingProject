import { rowsForCm, stitchesForCm } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { Ease } from "../domain/ease.js";
import type { GarmentMeasurements } from "../domain/measurements.js";
import type { NecklineParams } from "../domain/neckline.js";
import type { YokeConstructionParams } from "../domain/construction.js";
import { computeRaglanYoke } from "./raglanYoke.js";
import type { RaglanYokeResult } from "./raglanYoke.js";
import { computeAxilaJoin } from "./axilaJoin.js";
import type { AxilaJoinResult } from "./axilaJoin.js";
import { computeTaper } from "./taper.js";
import type { TaperResult } from "./taper.js";

export type GarmentPlan = {
  yoke: RaglanYokeResult;
  axilaJoin: AxilaJoinResult;
  bodyWaistTaper: TaperResult;
  bodyHemTaper: TaperResult;
  sleeveLeftTaper: TaperResult;
  sleeveRightTaper: TaperResult;
};

export function computeGarmentPlan(
  gauge: Gauge,
  ease: Ease,
  measurements: GarmentMeasurements,
  necklineParams: NecklineParams,
  constructionParams: YokeConstructionParams
): GarmentPlan {
  const yoke = computeRaglanYoke(gauge, ease, measurements, necklineParams, constructionParams);
  const axilaJoin = computeAxilaJoin(yoke);

  const waistTargetStitches = stitchesForCm(gauge, measurements.waistCm + ease.bodyEaseCm);
  const bodyWaistTaper = computeTaper(
    axilaJoin.bodyStartStitches,
    waistTargetStitches,
    rowsForCm(gauge, measurements.waistLengthCm)
  );

  const hipTargetStitches = stitchesForCm(gauge, measurements.hipCm + ease.bodyEaseCm);
  const bodyHemTaper = computeTaper(
    bodyWaistTaper.finalStitches,
    hipTargetStitches,
    rowsForCm(gauge, measurements.hemLengthCm)
  );

  const wristTargetStitches = stitchesForCm(gauge, measurements.wristCm + ease.sleeveEaseCm);
  const sleeveRows = rowsForCm(gauge, measurements.sleeveLengthCm);
  const sleeveLeftTaper = computeTaper(
    axilaJoin.sleeveLeftStartStitches,
    wristTargetStitches,
    sleeveRows
  );
  const sleeveRightTaper = computeTaper(
    axilaJoin.sleeveRightStartStitches,
    wristTargetStitches,
    sleeveRows
  );

  return {
    yoke,
    axilaJoin,
    bodyWaistTaper,
    bodyHemTaper,
    sleeveLeftTaper,
    sleeveRightTaper,
  };
}
