import { describe, it, expect } from "vitest";
import { renderMotifTile } from "../../src/render/motifTile.js";
import type { StitchChart } from "../../src/render/stitchChart.js";
import type { Gauge } from "../../src/domain/gauge.js";

describe("renderMotifTile", () => {
  const chart: StitchChart = {
    rows: 2,
    cols: 2,
    cells: [
      ["cl", "p"],
      ["k", "k"],
    ],
  };
  const gauge: Gauge = { stitchesPer10cm: 10, rowsPer10cm: 5 };

  // 5 stitches wide, 3 rows tall — neither is a multiple of the 2x2 chart,
  // so this exercises both the horizontal (col%cols) and vertical (row%rows)
  // tiling wrap, plus the cable-fallback-near-the-edge case.
  const svg = renderMotifTile(chart, gauge, 10, 20, 5, 3);

  it("wraps the tile in a group translated to the target position", () => {
    expect(svg).toContain('<g class="motif-tile" transform="translate(10,20)">');
    expect(svg.trim().endsWith("</g>")).toBe(true);
  });

  it("draws a successful 4-wide cable at the start of the bottom row (row 0)", () => {
    expect(svg).toContain('<rect class="motif-cell cable-left" x="0" y="4" width="4" height="2"></rect>');
    expect(svg).toContain('<line class="motif-cable-cross" x1="0.4" y1="5.6" x2="3.6" y2="4.4"></line>');
    expect(svg).toContain('<line class="motif-cable-cross" x1="0.4" y1="4.4" x2="3.6" y2="5.6"></line>');
  });

  it("falls back to a knit cell when the cable wraps too close to the right edge (col 4 of 5)", () => {
    expect(svg).toContain('<rect class="motif-cell k" x="4" y="4" width="1" height="2"></rect>');
    expect(svg).toContain('<rect class="motif-cell k" x="4" y="0" width="1" height="2"></rect>');
  });

  it("tiles the chart's second row (all knit) across the middle row (row 1) via modulo", () => {
    expect(svg).toContain('<rect class="motif-cell k" x="0" y="2" width="1" height="2"></rect>');
    expect(svg).toContain('<rect class="motif-cell k" x="1" y="2" width="1" height="2"></rect>');
    expect(svg).toContain('<rect class="motif-cell k" x="2" y="2" width="1" height="2"></rect>');
    expect(svg).toContain('<rect class="motif-cell k" x="3" y="2" width="1" height="2"></rect>');
  });

  it("repeats the chart's first row again at the top row (row 2), confirming vertical tiling", () => {
    expect(svg).toContain('<rect class="motif-cell cable-left" x="0" y="0" width="4" height="2"></rect>');
  });
});
