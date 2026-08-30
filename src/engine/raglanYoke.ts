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
      const combined: number = front.left + front.right + boundOnStitches;
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
      if (front.open) {
        front = { open: true, left: front.left + 1, right: front.right + 1 };
      } else {
        front = { open: false, combined: front.combined + 2 };
      }
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
