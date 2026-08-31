import { describe, it, expect } from "vitest";
import { computeSchematicGeometry } from "../../src/render/schematicGeometry.js";
import { computeGarmentPlan } from "../../src/engine/garmentPlan.js";
import type { Gauge } from "../../src/domain/gauge.js";
import type { Ease } from "../../src/domain/ease.js";
import type { GarmentMeasurements } from "../../src/domain/measurements.js";
import type { NecklineParams } from "../../src/domain/neckline.js";
import type { YokeConstructionParams } from "../../src/domain/construction.js";

const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };
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
  // Decimals chosen so rowsForCm (2.8 rows/cm) rounds to exactly 34 and 118 rows respectively.
  hemLengthCm: 12.14,
  sleeveLengthCm: 42.14,
};
const necklineParams: NecklineParams = {
  frontOpenRounds: 12,
  frontStartStitchesPerHalf: 1,
  necklineIncreaseCadence: 1,
};
const construction: YokeConstructionParams = { initialSleeveStitchesPerSleeve: 8 };

describe("computeSchematicGeometry", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
  const geometry = computeSchematicGeometry(plan, gauge);

  it("computes the back panel geometry", () => {
    expect(geometry.back.topWidthCm).toBe(16);
    expect(geometry.back.underarmWidthCm).toBe(52);
    expect(geometry.back.waistWidthCm).toBe(44);
    expect(geometry.back.hemWidthCm).toBe(53);
    expect(geometry.back.yokeHeightCm).toBe(20);
    expect(geometry.back.waistLengthCm).toBe(15);
    expect(geometry.back.hemLengthCm).toBeCloseTo(12.142857, 5);
  });

  it("computes the front panel geometry, sharing the back's body dimensions", () => {
    expect(geometry.front.topWidthCm).toBe(1);
    expect(geometry.front.underarmWidthCm).toBe(52);
    expect(geometry.front.waistWidthCm).toBe(44);
    expect(geometry.front.hemWidthCm).toBe(53);
    expect(geometry.front.yokeHeightCm).toBe(20);
    expect(geometry.front.waistLengthCm).toBe(15);
    expect(geometry.front.hemLengthCm).toBeCloseTo(12.142857, 5);
    expect(geometry.front.joinHeightCm).toBeCloseTo(4.642857, 5);
    expect(geometry.front.joinWidthCm).toBe(23);
    expect(geometry.front.joinBoundOnStitches).toBe(8);
  });

  it("computes both sleeves' geometry identically for this symmetric example", () => {
    for (const sleeve of [geometry.sleeveLeft, geometry.sleeveRight]) {
      expect(sleeve.topWidthCm).toBe(2);
      expect(sleeve.yokeEndWidthCm).toBe(16);
      expect(sleeve.bicepWidthCm).toBe(19);
      expect(sleeve.wristWidthCm).toBe(9);
      expect(sleeve.yokeHeightCm).toBe(20);
      expect(sleeve.taperLengthCm).toBeCloseTo(42.142857, 5);
      expect(sleeve.axilaAdditionStitches).toBe(12);
      expect(sleeve.axilaAdditionCircumferenceCm).toBe(6);
    }
  });
});
