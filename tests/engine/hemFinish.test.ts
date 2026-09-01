import { describe, it, expect } from "vitest";
import { computeHemFinish } from "../../src/engine/hemFinish.js";
import type { Gauge } from "../../src/domain/gauge.js";

const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };

describe("computeHemFinish", () => {
  it("computes the row count for a 1x1 rib at a valid (even) stitch count", () => {
    const result = computeHemFinish(gauge, 212, { structure: "1x1", lengthCm: 10 });
    expect(result).toEqual({ structure: "1x1", rows: 28 });
  });

  it("computes the row count for a 2x2 rib at a valid (multiple-of-4) stitch count", () => {
    const result = computeHemFinish(gauge, 212, { structure: "2x2", lengthCm: 5 });
    expect(result).toEqual({ structure: "2x2", rows: 14 });
  });

  it("throws for a 1x1 rib at an odd stitch count", () => {
    expect(() => computeHemFinish(gauge, 213, { structure: "1x1", lengthCm: 5 })).toThrow(
      "El ruedo tiene 213 puntos, pero el canalé 1x1 necesita un múltiplo de 2."
    );
  });

  it("throws for a 2x2 rib at a stitch count that's even but not a multiple of 4", () => {
    expect(() => computeHemFinish(gauge, 214, { structure: "2x2", lengthCm: 5 })).toThrow(
      "El ruedo tiene 214 puntos, pero el canalé 2x2 necesita un múltiplo de 4."
    );
  });
});
