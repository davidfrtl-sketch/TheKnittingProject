export type YokeMeasurements = {
  chestCm: number;
  neckWidthBackCm: number;
  bicepCm: number;
  armholeDepthCm: number;
};

export type GarmentMeasurements = YokeMeasurements & {
  waistCm: number;
  hipCm: number;
  wristCm: number;
  waistLengthCm: number; // axila → cintura
  hemLengthCm: number; // cintura → ruedo
  sleeveLengthCm: number; // fin del canesú → puño
};
