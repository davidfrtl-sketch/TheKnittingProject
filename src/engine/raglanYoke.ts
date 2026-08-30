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

  if (necklineIncreaseCadence <= 0) {
    throw new Error(
      `necklineIncreaseCadence debe ser un número positivo (recibido: ${necklineIncreaseCadence}).`
    );
  }
  if (frontOpenRounds >= totalYokeRounds) {
    throw new Error(
      `El delantero no puede quedar abierto tantas rondas: frontOpenRounds (${frontOpenRounds}) ` +
        `debe ser menor que el total de rondas del canesú (${totalYokeRounds}).`
    );
  }

  const initialBack = stitchesForCm(gauge, measurements.neckWidthBackCm);
  const initialSleeve = constructionParams.initialSleeveStitchesPerSleeve;
  const neckGapWidthSts = initialBack;

  function isNecklineIncreaseRound(roundNumber: number): boolean {
    return roundNumber <= frontOpenRounds && (roundNumber - 1) % necklineIncreaseCadence === 0;
  }

  let necklineIncreaseRoundCount = 0;
  for (let roundNumber = 1; roundNumber <= frontOpenRounds; roundNumber++) {
    if (isNecklineIncreaseRound(roundNumber)) {
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

    // Orden load-bearing: el join debe ocurrir antes del aumento raglan para que,
    // en una ronda donde coinciden, el aumento se aplique al delantero ya unido.
    if (roundNumber === frontOpenRounds + 1 && front.open) {
      const combined: number = front.left + front.right + boundOnStitches;
      events.push({ type: "frontJoin", boundOnStitches });
      front = { open: false, combined };
    }

    if (front.open && isNecklineIncreaseRound(roundNumber)) {
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
      stitchCounts: { back, front: { ...front }, sleeveLeft, sleeveRight },
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
