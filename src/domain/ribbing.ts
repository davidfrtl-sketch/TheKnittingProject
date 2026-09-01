export type RibStructure = "1x1" | "2x2";

export type HemFinishParams = {
  structure: RibStructure;
  lengthCm: number;
};

export const RIB_STITCH_REPEAT: Record<RibStructure, number> = {
  "1x1": 2,
  "2x2": 4,
};

export const RIB_PATTERN_TEXT: Record<RibStructure, string> = {
  "1x1": "*1 derecho, 1 revés*",
  "2x2": "*2 derecho, 2 revés*",
};
