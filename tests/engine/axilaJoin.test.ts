import { describe, it, expect } from "vitest";
import { computeAxilaJoin } from "../../src/engine/axilaJoin.js";
import { computeRaglanYoke } from "../../src/engine/raglanYoke.js";
import type { RaglanYokeResult } from "../../src/engine/raglanYoke.js";
import type { Gauge } from "../../src/domain/gauge.js";
import type { Ease } from "../../src/domain/ease.js";
import type { YokeMeasurements } from "../../src/domain/measurements.js";
import type { NecklineParams } from "../../src/domain/neckline.js";
import type { YokeConstructionParams } from "../../src/domain/construction.js";

const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };
const ease: Ease = { bodyEaseCm: 8, sleeveEaseCm: 6 };
const measurements: YokeMeasurements = {
  chestCm: 96,
  neckWidthBackCm: 16,
  bicepCm: 32,
  armholeDepthCm: 20,
};
const necklineParams: NecklineParams = {
  frontOpenRounds: 12,
  frontStartStitchesPerHalf: 1,
  necklineIncreaseCadence: 1,
};
const construction: YokeConstructionParams = { initialSleeveStitchesPerSleeve: 8 };

function yokeResultWithShortfall(
  armpitShortfall: RaglanYokeResult["armpitShortfall"]
): RaglanYokeResult {
  return {
    schedule: [],
    finalStitchCounts: { back: 0, front: 0, sleeveLeft: 0, sleeveRight: 0 },
    armpitShortfall,
    castOnBreakdown: { back: 0, frontLeft: 0, frontRight: 0, sleeveLeft: 0, sleeveRight: 0 },
  };
}

describe("computeAxilaJoin", () => {
  it("matches the worked crew-neckline example (section 9) fed through the real yoke engine", () => {
    const yokeResult = computeRaglanYoke(gauge, ease, measurements, necklineParams, construction);

    const result = computeAxilaJoin(yokeResult);

    expect(result.bodyStartStitches).toBe(208);
    expect(result.sleeveLeftStartStitches).toBe(76);
    expect(result.sleeveRightStartStitches).toBe(76);
    expect(result.castOnPerAxila.left).toEqual({ back: 8, front: 7, total: 15 });
    expect(result.castOnPerAxila.right).toEqual({ back: 8, front: 7, total: 15 });
  });

  it("gives the extra stitch to the left axila when back/front shortfall is odd", () => {
    const yokeResult = yokeResultWithShortfall({ back: 15, front: 9, sleeveLeft: 0, sleeveRight: 0 });

    const result = computeAxilaJoin(yokeResult);

    expect(result.castOnPerAxila.left).toEqual({ back: 8, front: 5, total: 13 });
    expect(result.castOnPerAxila.right).toEqual({ back: 7, front: 4, total: 11 });
  });

  it("throws when a shortfall is negative", () => {
    const yokeResult = yokeResultWithShortfall({ back: -1, front: 0, sleeveLeft: 0, sleeveRight: 0 });

    expect(() => computeAxilaJoin(yokeResult)).toThrow(/faltante en axila/i);
  });
});
