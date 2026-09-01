import { describe, it, expect } from "vitest";
import { computeGarmentPlan } from "../../src/engine/garmentPlan.js";
import {
  FIT_REGULAR,
  FIT_OVERSIZED,
  LENGTH_CROPPED,
  LENGTH_REGULAR,
  LENGTH_LONG,
  SIZE_S,
  SIZE_M,
  SIZE_L,
  SIZE_XL,
} from "../../src/domain/presets.js";
import type { Gauge } from "../../src/domain/gauge.js";
import type { Ease } from "../../src/domain/ease.js";
import type { GarmentMeasurements } from "../../src/domain/measurements.js";
import type { NecklineParams } from "../../src/domain/neckline.js";
import type { YokeConstructionParams } from "../../src/domain/construction.js";

const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };
const necklineParams: NecklineParams = {
  frontOpenRounds: 12,
  frontStartStitchesPerHalf: 1,
  necklineIncreaseCadence: 1,
};
const construction: YokeConstructionParams = { initialSleeveStitchesPerSleeve: 8 };

const fits = [
  { name: "Regular", value: FIT_REGULAR },
  { name: "Oversized", value: FIT_OVERSIZED },
];
const lengths = [
  { name: "Cropped", value: LENGTH_CROPPED },
  { name: "Regular", value: LENGTH_REGULAR },
  { name: "Long", value: LENGTH_LONG },
];
const sizes = [
  { name: "S", value: SIZE_S },
  { name: "M", value: SIZE_M },
  { name: "L", value: SIZE_L },
  { name: "XL", value: SIZE_XL },
];

describe("preset combinations succeed at the tool's default gauge", () => {
  for (const size of sizes) {
    for (const fit of fits) {
      for (const length of lengths) {
        it(`${size.name} + ${fit.name} + ${length.name}`, () => {
          const ease: Ease = { bodyEaseCm: fit.value.bodyEaseCm, sleeveEaseCm: fit.value.sleeveEaseCm };
          const measurements: GarmentMeasurements = {
            chestCm: size.value.chestCm,
            neckWidthBackCm: size.value.neckWidthBackCm,
            bicepCm: size.value.bicepCm,
            armholeDepthCm: size.value.armholeDepthCm,
            waistCm: size.value.waistCm,
            hipCm: size.value.hipCm,
            wristCm: size.value.wristCm,
            waistLengthCm: size.value.waistLengthCm,
            hemLengthCm: length.value.hemLengthCm,
            sleeveLengthCm: size.value.sleeveLengthCm,
          };
          expect(() =>
            computeGarmentPlan(gauge, ease, measurements, necklineParams, construction)
          ).not.toThrow();
        });
      }
    }
  }

  it("the shipped form's raw default values (no preset selected)", () => {
    const ease: Ease = { bodyEaseCm: 8, sleeveEaseCm: 6 };
    const measurements: GarmentMeasurements = {
      chestCm: 96,
      neckWidthBackCm: 16,
      bicepCm: 32,
      armholeDepthCm: 20,
      waistCm: 80,
      hipCm: 98,
      wristCm: 12,
      waistLengthCm: 15,
      hemLengthCm: 12.14,
      sleeveLengthCm: 42.14,
    };
    expect(() =>
      computeGarmentPlan(gauge, ease, measurements, necklineParams, construction)
    ).not.toThrow();
  });
});

describe("cuff 2x2 rib is a known limitation for some sizes (documented, not fixed)", () => {
  const cuffParams = { structure: "2x2" as const, lengthCm: 5 };

  function planFor(size: typeof SIZE_S) {
    const ease: Ease = { bodyEaseCm: FIT_REGULAR.bodyEaseCm, sleeveEaseCm: FIT_REGULAR.sleeveEaseCm };
    const measurements: GarmentMeasurements = {
      chestCm: size.chestCm,
      neckWidthBackCm: size.neckWidthBackCm,
      bicepCm: size.bicepCm,
      armholeDepthCm: size.armholeDepthCm,
      waistCm: size.waistCm,
      hipCm: size.hipCm,
      wristCm: size.wristCm,
      waistLengthCm: size.waistLengthCm,
      hemLengthCm: LENGTH_REGULAR.hemLengthCm,
      sleeveLengthCm: size.sleeveLengthCm,
    };
    return () =>
      computeGarmentPlan(
        gauge,
        ease,
        measurements,
        necklineParams,
        construction,
        undefined,
        cuffParams
      );
  }

  it("S: throws (34 stitches, not a multiple of 4)", () => {
    expect(planFor(SIZE_S)).toThrow("no es múltiplo de 4");
  });

  it("M: succeeds (36 stitches, a multiple of 4)", () => {
    expect(planFor(SIZE_M)).not.toThrow();
  });

  it("L: throws (38 stitches, not a multiple of 4)", () => {
    expect(planFor(SIZE_L)).toThrow("no es múltiplo de 4");
  });

  it("XL: throws (42 stitches, not a multiple of 4)", () => {
    expect(planFor(SIZE_XL)).toThrow("no es múltiplo de 4");
  });
});
