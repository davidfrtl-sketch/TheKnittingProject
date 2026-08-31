import { describe, it, expect } from "vitest";
import { renderInstructions } from "../../src/engine/instructionsRenderer.js";
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

describe("renderInstructions", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
  const text = renderInstructions(plan);

  it("describes the cast-on with the correct stitch counts", () => {
    expect(text).toContain("Montar 50 puntos en total");
    expect(text).toContain("32 para la espalda");
    expect(text).toContain("8 para la manga izquierda");
    expect(text).toContain("1 + 1 para el delantero");
    expect(text).toContain("8 para la manga derecha");
  });

  it("describes the raglan increase cadence and count", () => {
    expect(text).toContain("cada 2 rondas, 28 veces");
  });

  it("describes the neckline increase range and cadence", () => {
    expect(text).toContain("desde la ronda 1 hasta la ronda 12");
    expect(text).toContain("en cada ronda");
  });

  it("describes the front join with the exact round and stitch count", () => {
    expect(text).toContain("En la ronda 13: montar 8 puntos");
  });

  it("reports the yoke's final stitch counts", () => {
    expect(text).toContain(
      "espalda 88 puntos, delantero 90 puntos, manga izquierda 64 puntos, manga derecha 64 puntos"
    );
  });

  it("describes the axila join breakdown", () => {
    expect(text).toContain("montar 15 puntos en la axila izquierda (8 para la espalda + 7 para el delantero)");
    expect(text).toContain("15 puntos en la axila derecha (8 para la espalda + 7 para el delantero)");
    expect(text).toContain("Cuerpo: 208 puntos en total");
    expect(text).toContain("Manga izquierda: 76 puntos. Manga derecha: 76 puntos");
  });

  it("describes the waist taper with mixed cadence and direction", () => {
    expect(text).toContain("Cintura (fila de disminución, cada 2 filas, 6 veces, luego cada 3 filas, 10 veces)");
    expect(text).toContain("Resultado: 176 puntos");
  });

  it("describes the hip/hem taper with mixed cadence and direction", () => {
    expect(text).toContain(
      "Cadera / ruedo (fila de aumento, cada 1 fila, 2 veces, luego cada 2 filas, 16 veces)"
    );
    expect(text).toContain("Resultado: 212 puntos");
  });

  it("describes both sleeve tapers", () => {
    expect(text).toContain(
      "Manga izquierda (fila de disminución, cada 5 filas, 2 veces, luego cada 6 filas, 18 veces)"
    );
    expect(text).toContain(
      "Manga derecha (fila de disminución, cada 5 filas, 2 veces, luego cada 6 filas, 18 veces)"
    );
  });
});
