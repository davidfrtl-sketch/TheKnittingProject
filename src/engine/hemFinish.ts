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
  params: HemFinishParams,
  label: string
): HemFinishResult {
  const repeat = RIB_STITCH_REPEAT[params.structure];
  if (combinedFinalStitches % repeat !== 0) {
    throw new Error(
      `No se puede aplicar el canalé ${params.structure} al ${label}: hay ${combinedFinalStitches} puntos, que no es múltiplo de ${repeat}.`
    );
  }

  const rows = rowsForCm(gauge, params.lengthCm);
  if (rows < 1) {
    throw new Error(
      `El largo del canalé del ${label} (${params.lengthCm}cm) da ${rows} vueltas — tiene que ser al menos 1 vuelta.`
    );
  }

  return {
    structure: params.structure,
    rows,
  };
}
