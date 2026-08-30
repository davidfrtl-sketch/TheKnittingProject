import { describe, it, expect } from "vitest";
import { stitchesForCm, rowsForCm } from "../../src/domain/gauge.js";
import type { Gauge } from "../../src/domain/gauge.js";

describe("gauge conversions", () => {
  const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };

  it("converts cm to stitches, rounding to the nearest integer", () => {
    expect(stitchesForCm(gauge, 104)).toBe(208);
    expect(stitchesForCm(gauge, 16)).toBe(32);
    expect(stitchesForCm(gauge, 38)).toBe(76);
  });

  it("converts cm to rows, rounding to the nearest integer", () => {
    expect(rowsForCm(gauge, 20)).toBe(56);
  });
});
