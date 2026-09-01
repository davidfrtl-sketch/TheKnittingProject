import { rowsForCm } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { HemFinishParams, RibStructure } from "../domain/ribbing.js";
import { RIB_STITCH_REPEAT } from "../domain/ribbing.js";

export type HemFinishResult = {
  structure: RibStructure;
  rows: number;
};

export function computeHemFinish(
  gauge: Gauge,
  combinedFinalStitches: number,
  params: HemFinishParams
): HemFinishResult {
  const repeat = RIB_STITCH_REPEAT[params.structure];
  if (combinedFinalStitches % repeat !== 0) {
    throw new Error(
      `El ruedo tiene ${combinedFinalStitches} puntos, pero el canalé ${params.structure} necesita un múltiplo de ${repeat}.`
    );
  }

  const rows = rowsForCm(gauge, params.lengthCm);
  if (rows < 1) {
    throw new Error(
      `El largo del canalé (${params.lengthCm}cm) da ${rows} vueltas — tiene que ser al menos 1 vuelta.`
    );
  }

  return {
    structure: params.structure,
    rows,
  };
}
