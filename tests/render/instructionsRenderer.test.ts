import { describe, it, expect } from "vitest";
import { renderInstructions } from "../../src/render/instructionsRenderer.js";
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

describe("renderInstructions with a hem target between the waist-taper and axila-join baselines", () => {
  // hipCm = 90 => hipTargetStitches = round((90 + 8) * 2) = 196, which sits
  // strictly between bodyWaistTaper.finalStitches (176) and
  // axilaJoin.bodyStartStitches (208). If the hem stage's renderer used the
  // wrong (unchained) baseline of 208 instead of chaining from 176, "increase"
  // and "decrease" would disagree in sign and this test would catch it.
  const hipMeasurements: GarmentMeasurements = { ...measurements, hipCm: 90 };
  const plan = computeGarmentPlan(gauge, ease, hipMeasurements, necklineParams, construction);
  const text = renderInstructions(plan);

  it("reports the hem stage as an increase, not a decrease", () => {
    expect(text).toContain("Cadera / ruedo (fila de aumento");
    const hemLine = text.split("\n\n").find((section) => section.startsWith("Cadera / ruedo"));
    expect(hemLine).toBeDefined();
    expect(hemLine).not.toContain("disminución");
  });

  it("reports the correct final hem stitch count", () => {
    expect(text).toContain("Resultado: 196 puntos.");
  });
});

describe("renderInstructions with a waist target equal to the axila-join baseline (no-op taper)", () => {
  // waistCm = 96 => waistTargetStitches = round((96 + 8) * 2) = 208, exactly
  // equal to axilaJoin.bodyStartStitches, so the waist taper has 0 events.
  const waistMeasurements: GarmentMeasurements = { ...measurements, waistCm: 96 };
  const plan = computeGarmentPlan(gauge, ease, waistMeasurements, necklineParams, construction);
  const text = renderInstructions(plan);

  it("describes the waist stage as unchanged, with correct singular/plural wording", () => {
    expect(text).toContain(
      "Cintura: sin cambios, se sigue tejiendo derecho durante 42 filas. Resultado: 208 puntos."
    );
  });
});

describe("renderInstructions with a hem finish", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction, {
    structure: "1x1",
    lengthCm: 10,
  });
  const text = renderInstructions(plan);

  it("describes the 1x1 rib with the correct stitch and row counts", () => {
    expect(text).toContain(
      "Canalé 1x1 (212 puntos, 28 vueltas): *1 derecho, 1 revés*, repetir hasta el final. Cerrar puntos."
    );
  });
});

describe("renderInstructions without a hem finish", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
  const text = renderInstructions(plan);

  it("omits any hem finish section", () => {
    expect(text).not.toContain("Canalé");
  });
});

describe("renderInstructions with a cuff finish", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction, undefined, {
    structure: "1x1",
    lengthCm: 10,
  });
  const text = renderInstructions(plan);

  it("describes the shared cuff rib with the correct stitch and row counts", () => {
    expect(text).toContain(
      "Puño (ambas mangas) — canalé 1x1 (36 puntos, 28 vueltas): *1 derecho, 1 revés*, repetir hasta el final. Cerrar puntos."
    );
  });
});

describe("renderInstructions without a cuff finish", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
  const text = renderInstructions(plan);

  it("omits any cuff finish section", () => {
    expect(text).not.toContain("Puño");
  });
});

describe("renderInstructions with both a hem finish and a cuff finish", () => {
  const plan = computeGarmentPlan(
    gauge,
    ease,
    measurements,
    necklineParams,
    construction,
    { structure: "1x1", lengthCm: 10 },
    { structure: "2x2", lengthCm: 5 }
  );
  const text = renderInstructions(plan);

  it("includes both the hem and cuff sections with independent structures", () => {
    expect(text).toContain("Canalé 1x1 (212 puntos, 28 vueltas)");
    expect(text).toContain("Puño (ambas mangas) — canalé 2x2 (36 puntos, 14 vueltas)");
  });

  it("orders the hem section before the cuff section", () => {
    expect(text.indexOf("Canalé 1x1")).toBeLessThan(text.indexOf("Puño (ambas mangas)"));
  });
});
