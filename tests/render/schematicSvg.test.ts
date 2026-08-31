import { describe, it, expect } from "vitest";
import { renderSchematicSvg } from "../../src/render/schematicSvg.js";
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

describe("renderSchematicSvg", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
  const geometry = computeSchematicGeometry(plan, gauge);
  const svg = renderSchematicSvg(geometry);

  it("sizes the viewBox from the computed layout", () => {
    expect(svg).toContain('viewBox="0 0 145 74.1"');
  });

  it("draws exactly one polygon per piece, with the right classes", () => {
    expect(svg).toContain('class="panel-fill back"');
    expect(svg).toContain('class="panel-fill front"');
    expect(svg).toContain('class="panel-fill sleeve"');
    expect(svg.match(/<polygon/g)).toHaveLength(3);
  });

  it("titles each panel and centers it correctly", () => {
    expect(svg).toContain('x="30.5"');
    expect(svg).toContain(">Espalda<");
    expect(svg).toContain('x="89.5"');
    expect(svg).toContain(">Delantero<");
    expect(svg).toContain('x="131.5"');
    expect(svg).toContain(">Manga<");
  });

  it("labels the back panel's widths", () => {
    expect(svg).toContain(">16cm<");
    expect(svg).toContain(">52cm<");
    expect(svg).toContain(">44cm<");
    expect(svg).toContain(">53cm<");
  });

  it("labels the front panel's join width", () => {
    expect(svg).toContain(">23cm<");
  });

  it("labels the sleeve's bicep and wrist widths", () => {
    expect(svg).toContain(">19cm<");
    expect(svg).toContain(">9cm<");
  });

  it("draws the shared axila guideline at the yoke height", () => {
    expect(svg).toContain('class="axila-line" x1="4" y1="28" x2="141" y2="28"');
  });

  it("scopes each title and label with a per-panel class, so CSS can color each panel independently", () => {
    expect(svg).toContain('class="panel-title back"');
    expect(svg).toContain('class="panel-title front"');
    expect(svg).toContain('class="panel-title sleeve"');
    expect(svg.match(/class="measure-label back"/g)).toHaveLength(4);
    expect(svg.match(/class="measure-label front"/g)).toHaveLength(4);
    expect(svg.match(/class="measure-label sleeve"/g)).toHaveLength(2);
  });
});
