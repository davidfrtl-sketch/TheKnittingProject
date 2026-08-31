import type { RaglanYokeResult } from "./raglanYoke.js";

export type AxilaCastOn = {
  back: number;
  front: number;
  total: number;
};

export type AxilaJoinResult = {
  bodyStartStitches: number;
  sleeveLeftStartStitches: number;
  sleeveRightStartStitches: number;
  castOnPerAxila: {
    left: AxilaCastOn;
    right: AxilaCastOn;
  };
};

function splitLeftHeavy(total: number): { left: number; right: number } {
  return { left: Math.ceil(total / 2), right: Math.floor(total / 2) };
}

export function computeAxilaJoin(yokeResult: RaglanYokeResult): AxilaJoinResult {
  const { finalStitchCounts, armpitShortfall } = yokeResult;

  (["back", "front", "sleeveLeft", "sleeveRight"] as const).forEach((key) => {
    if (armpitShortfall[key] < 0) {
      throw new Error(
        `El faltante en axila de ${key} es negativo (${armpitShortfall[key]}): ` +
          `el canesú ya superó el objetivo de talla en esa pieza, y este cálculo ` +
          `solo sabe montar puntos, no disminuir.`
      );
    }
  });

  const backSplit = splitLeftHeavy(armpitShortfall.back);
  const frontSplit = splitLeftHeavy(armpitShortfall.front);

  const left: AxilaCastOn = {
    back: backSplit.left,
    front: frontSplit.left,
    total: backSplit.left + frontSplit.left,
  };
  const right: AxilaCastOn = {
    back: backSplit.right,
    front: frontSplit.right,
    total: backSplit.right + frontSplit.right,
  };

  return {
    bodyStartStitches:
      finalStitchCounts.back +
      finalStitchCounts.front +
      armpitShortfall.back +
      armpitShortfall.front,
    sleeveLeftStartStitches: finalStitchCounts.sleeveLeft + armpitShortfall.sleeveLeft,
    sleeveRightStartStitches: finalStitchCounts.sleeveRight + armpitShortfall.sleeveRight,
    castOnPerAxila: { left, right },
  };
}
