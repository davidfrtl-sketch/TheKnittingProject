import { describe, it, expect } from "vitest";
import { renderStitchChart } from "../../src/render/stitchChart.js";
import type { StitchChart } from "../../src/render/stitchChart.js";

const chart: StitchChart = {
  rows: 4,
  cols: 6,
  cells: [
    ["k", "k", "k", "k", "k", "k"],
    ["p", "k", "k", "k", "k", "p"],
    ["k", "cl", "k", "k", "k", "k"],
    ["k", "k", "k", "k", "cr", "p"],
  ],
};

describe("renderStitchChart", () => {
  const svg = renderStitchChart(chart);

  it("sizes the viewBox from rows/cols plus the legend", () => {
    expect(svg).toContain('viewBox="0 0 68 88"');
  });

  it("draws row 0 at the bottom of the chart", () => {
    expect(svg).toContain('class="chart-cell k" data-row="0" data-col="0" x="4" y="34"');
  });

  it("draws row 3 at the top of the chart", () => {
    expect(svg).toContain('data-row="3" data-col="0" x="4" y="4"');
  });

  it("draws a successful 4-wide cable starting at row 2, col 1", () => {
    expect(svg).toContain(
      'class="chart-cell cable-left" data-row="2" data-col="1" x="14" y="14" width="40" height="10"'
    );
  });

  it("renders the column right after a consumed cable as its own normal cell", () => {
    expect(svg).toContain('class="chart-cell k" data-row="2" data-col="5" x="54" y="14"');
  });

  it("falls back to a plain knit cell when a cable would run past the row's edge", () => {
    expect(svg).toContain('class="chart-cell k" data-row="3" data-col="4" x="44" y="4"');
    expect(svg).not.toContain('cable-right" data-row="3"');
  });

  it("renders the independent purl cell after the fallback", () => {
    expect(svg).toContain('class="chart-cell p" data-row="3" data-col="5" x="54" y="4"');
  });

  it("includes the full legend", () => {
    expect(svg).toContain("Derecho");
    expect(svg).toContain("Revés");
    expect(svg).toContain("Cruce 2/2 a la izquierda");
    expect(svg).toContain("Cruce 2/2 a la derecha");
  });
});
