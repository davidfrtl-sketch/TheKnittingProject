import { describe, it, expect } from "vitest";
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
  hemLengthCm: 12.14,
  sleeveLengthCm: 42.14,
};
const necklineParams: NecklineParams = {
  frontOpenRounds: 12,
  frontStartStitchesPerHalf: 1,
  necklineIncreaseCadence: 1,
};
const construction: YokeConstructionParams = { initialSleeveStitchesPerSleeve: 8 };

describe("computeGarmentPlan", () => {
  it("reproduces, in one call, every golden value already verified separately for the section 9/10 example", () => {
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);

    expect(plan.yoke.finalStitchCounts).toEqual({
      back: 88,
      front: 90,
      sleeveLeft: 64,
      sleeveRight: 64,
    });

    expect(plan.axilaJoin.bodyStartStitches).toBe(208);
    expect(plan.axilaJoin.sleeveLeftStartStitches).toBe(76);
    expect(plan.axilaJoin.sleeveRightStartStitches).toBe(76);
    expect(plan.axilaJoin.castOnPerAxila.left).toEqual({ back: 8, front: 7, total: 15 });
    expect(plan.axilaJoin.castOnPerAxila.right).toEqual({ back: 8, front: 7, total: 15 });

    expect(plan.bodyWaistTaper.events).toBe(16);
    expect(plan.bodyWaistTaper.primaryCadence).toBe(3);
    expect(plan.bodyWaistTaper.reducedCadence).toBe(2);
    expect(plan.bodyWaistTaper.finalStitches).toBe(176);

    expect(plan.bodyHemTaper.events).toBe(18);
    expect(plan.bodyHemTaper.primaryCadence).toBe(2);
    expect(plan.bodyHemTaper.reducedCadence).toBe(1);
    expect(plan.bodyHemTaper.finalStitches).toBe(212);

    for (const sleeveTaper of [plan.sleeveLeftTaper, plan.sleeveRightTaper]) {
      expect(sleeveTaper.events).toBe(20);
      expect(sleeveTaper.primaryCadence).toBe(6);
      expect(sleeveTaper.reducedCadence).toBe(5);
      expect(sleeveTaper.finalStitches).toBe(36);
    }
  });
});
