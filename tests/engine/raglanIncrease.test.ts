import { describe, it, expect } from "vitest";
import { computeRaglanIncrease } from "../../src/engine/raglanIncrease.js";

describe("computeRaglanIncrease", () => {
  it("matches the worked example in tejido-y-patronaje.md section 8 (boat neckline, no shaping)", () => {
    const result = computeRaglanIncrease(56, {
      back: 32,
      front: 32,
      sleeveLeft: 8,
      sleeveRight: 8,
    });

    expect(result.finalStitchCounts).toEqual({
      back: 88,
      front: 88,
      sleeveLeft: 64,
      sleeveRight: 64,
    });

    const increaseRounds = result.schedule.filter((round) => round.isIncreaseRound);
    expect(increaseRounds).toHaveLength(28);
  });

  it("increases happen every 2 rounds, starting at round 2", () => {
    const result = computeRaglanIncrease(4, {
      back: 0,
      front: 0,
      sleeveLeft: 0,
      sleeveRight: 0,
    });

    expect(result.schedule.map((round) => round.isIncreaseRound)).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });
});
