import { describe, it, expect } from "vitest";
import { renderSchematicSvg } from "../../src/render/schematicSvg.js";
import { computeSchematicGeometry } from "../../src/render/schematicGeometry.js";
import { computeGarmentPlan } from "../../src/engine/garmentPlan.js";
import type { Gauge } from "../../src/domain/gauge.js";
import type { Ease } from "../../src/domain/ease.js";
import type { GarmentMeasurements } from "../../src/domain/measurements.js";
import type { NecklineParams } from "../../src/domain/neckline.js";
import type { YokeConstructionParams } from "../../src/domain/construction.js";
import { computeBackMotifColumn } from "../../src/engine/motifPlacement.js";
import type { BackMotifColumn } from "../../src/engine/motifPlacement.js";
import type { SchematicGeometry } from "../../src/render/schematicGeometry.js";
import type { StitchChart } from "../../src/render/stitchChart.js";

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

describe("renderSchematicSvg — motif overlay", () => {
  // Hand-built geometry with round numbers (independent of computeSchematicGeometry)
  // so the expected pixel positions below can be verified by arithmetic, not by
  // re-deriving a real taper cascade.
  const geometry: SchematicGeometry = {
    back: {
      topWidthCm: 10,
      underarmWidthCm: 20,
      waistWidthCm: 16,
      hemWidthCm: 22,
      yokeHeightCm: 10,
      waistLengthCm: 8,
      hemLengthCm: 6,
    },
    front: {
      topWidthCm: 6,
      underarmWidthCm: 20,
      waistWidthCm: 16,
      hemWidthCm: 22,
      yokeHeightCm: 10,
      waistLengthCm: 8,
      hemLengthCm: 6,
      joinHeightCm: 4,
      joinWidthCm: 6,
      joinBoundOnStitches: 2,
    },
    sleeveLeft: {
      topWidthCm: 6,
      yokeEndWidthCm: 8,
      bicepWidthCm: 8,
      wristWidthCm: 4,
      yokeHeightCm: 10,
      taperLengthCm: 6,
      axilaAdditionStitches: 0,
      axilaAdditionCircumferenceCm: 0,
    },
    sleeveRight: {
      topWidthCm: 6,
      yokeEndWidthCm: 8,
      bicepWidthCm: 8,
      wristWidthCm: 4,
      yokeHeightCm: 10,
      taperLengthCm: 6,
      axilaAdditionStitches: 0,
      axilaAdditionCircumferenceCm: 0,
    },
  };
  // With these numbers the layout works out to: centerBack=15, y0=8 (TOP_MARGIN)
  // (verified by hand against the exact formulas in renderSchematicSvg).
  // Named distinctly from the file-scope `gauge` (used below by the real-plan
  // end-to-end test) so that test can reference the real 20/28 gauge without
  // being shadowed by this hand-built fixture's round-number gauge.
  const fixtureGauge = { stitchesPer10cm: 10, rowsPer10cm: 10 };
  const chart: StitchChart = { rows: 1, cols: 1, cells: [["k"]] };

  it("embeds no motif group when the motif arguments are omitted (no regression)", () => {
    const svg = renderSchematicSvg(geometry);
    expect(svg).not.toContain("motif-tile");
  });

  it("embeds exactly one motif tile in the back panel, spanning the full height from y0", () => {
    const motifColumn: BackMotifColumn = { widthStitches: 20, heightRows: 4 };
    const svg = renderSchematicSvg(geometry, chart, fixtureGauge, motifColumn);

    expect(svg.match(/<g class="motif-tile"/g)).toHaveLength(1);
    expect(svg).toContain('<g class="motif-tile" transform="translate(5,8)">');
  });

  it("embeds nothing when an explicit null motif column is passed", () => {
    const svg = renderSchematicSvg(geometry, chart, fixtureGauge, null);
    expect(svg).not.toContain("motif-tile");
  });

  it("keeps the motif tile aligned with the back panel's real cast-on width (end-to-end with a real GarmentPlan)", () => {
    const realPlan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
    const realGeometry = computeSchematicGeometry(realPlan, gauge);
    const motifColumn = computeBackMotifColumn(realPlan);
    expect(motifColumn).toEqual({ widthStitches: 32, heightRows: 132 });

    const smallChart: StitchChart = { rows: 1, cols: 1, cells: [["k"]] };
    const svgWithMotif = renderSchematicSvg(realGeometry, smallChart, gauge, motifColumn);

    expect(svgWithMotif).toContain('<g class="motif-tile" transform="translate(22.5,8)">');
  });
});
