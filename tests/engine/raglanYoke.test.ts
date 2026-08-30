import { describe, it, expect } from "vitest";
import { computeRaglanYoke } from "../../src/engine/raglanYoke.js";
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
const construction: YokeConstructionParams = { initialSleeveStitchesPerSleeve: 8 };

describe("computeRaglanYoke", () => {
  it("matches the worked crew-neckline example in tejido-y-patronaje.md section 9", () => {
    const necklineParams: NecklineParams = {
      frontOpenRounds: 12,
      frontStartStitchesPerHalf: 1,
      necklineIncreaseCadence: 1,
    };

    const result = computeRaglanYoke(gauge, ease, measurements, necklineParams, construction);

    expect(result.castOnBreakdown).toEqual({
      back: 32,
      frontLeft: 1,
      frontRight: 1,
      sleeveLeft: 8,
      sleeveRight: 8,
    });

    const joinRound = result.schedule.find((round) =>
      round.events.some((event) => event.type === "frontJoin")
    );
    expect(joinRound?.roundNumber).toBe(13);
    expect(
      joinRound?.events.find((event) => event.type === "frontJoin")
    ).toEqual({ type: "frontJoin", boundOnStitches: 8 });

    expect(result.finalStitchCounts).toEqual({
      back: 88,
      front: 90,
      sleeveLeft: 64,
      sleeveRight: 64,
    });

    expect(result.armpitShortfall).toEqual({
      back: 16,
      front: 14,
      sleeveLeft: 12,
      sleeveRight: 12,
    });
  });

  it("handles the front join landing on the same round as a raglan increase", () => {
    const necklineParams: NecklineParams = {
      frontOpenRounds: 13,
      frontStartStitchesPerHalf: 1,
      necklineIncreaseCadence: 1,
    };

    const result = computeRaglanYoke(gauge, ease, measurements, necklineParams, construction);

    const joinRound = result.schedule.find((round) =>
      round.events.some((event) => event.type === "frontJoin")
    );
    expect(joinRound?.roundNumber).toBe(14);
    expect(joinRound?.events).toContainEqual({ type: "frontJoin", boundOnStitches: 6 });
    expect(joinRound?.events).toContainEqual({
      type: "raglanIncrease",
      deltaPerPiece: { back: 2, front: 2, sleeveLeft: 2, sleeveRight: 2 },
    });

    expect(result.finalStitchCounts.front).toBe(90);
  });

  it("throws when the neckline increases alone exceed the back neck width", () => {
    const necklineParams: NecklineParams = {
      frontOpenRounds: 20,
      frontStartStitchesPerHalf: 1,
      necklineIncreaseCadence: 1,
    };

    expect(() =>
      computeRaglanYoke(gauge, ease, measurements, necklineParams, construction)
    ).toThrow(/no puede cerrar el escote/);
  });
});
