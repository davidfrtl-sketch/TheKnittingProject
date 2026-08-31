export const FIT_REGULAR = { bodyEaseCm: 8, sleeveEaseCm: 6 };
export const FIT_OVERSIZED = { bodyEaseCm: 20, sleeveEaseCm: 14 };

export const LENGTH_CROPPED = { hemLengthCm: 10 };
export const LENGTH_REGULAR = { hemLengthCm: 12.14 };
export const LENGTH_LONG = { hemLengthCm: 30 };

export const SIZE_S = {
  chestCm: 84, neckWidthBackCm: 15, bicepCm: 26, armholeDepthCm: 17,
  waistCm: 66, hipCm: 90, wristCm: 11, waistLengthCm: 14, sleeveLengthCm: 43,
};
export const SIZE_M = {
  chestCm: 94, neckWidthBackCm: 16, bicepCm: 28, armholeDepthCm: 18,
  waistCm: 74, hipCm: 100, wristCm: 12, waistLengthCm: 15, sleeveLengthCm: 43,
};
export const SIZE_L = {
  chestCm: 104, neckWidthBackCm: 17, bicepCm: 30, armholeDepthCm: 20,
  waistCm: 84, hipCm: 110, wristCm: 13, waistLengthCm: 16, sleeveLengthCm: 44,
};
export const SIZE_XL = {
  chestCm: 114, neckWidthBackCm: 18, bicepCm: 34, armholeDepthCm: 21,
  waistCm: 94, hipCm: 118, wristCm: 15, waistLengthCm: 17, sleeveLengthCm: 44,
};

export type SizePreset = typeof SIZE_S;
