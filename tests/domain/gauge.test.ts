import { describe, it, expect } from "vitest";
import { stitchesForCm, rowsForCm, cmForStitches, cmForRows } from "../../src/domain/gauge.js";
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

  it("converts stitches to cm (inverse of stitchesForCm, no rounding)", () => {
    expect(cmForStitches(gauge, 208)).toBe(104);
    expect(cmForStitches(gauge, 32)).toBe(16);
    expect(cmForStitches(gauge, 12)).toBe(6);
  });

  it("converts rows to cm (inverse of rowsForCm, no rounding)", () => {
    expect(cmForRows(gauge, 56)).toBe(20);
    expect(cmForRows(gauge, 13)).toBeCloseTo(4.642857, 5);
    expect(cmForRows(gauge, 118)).toBeCloseTo(42.142857, 5);
  });
});
