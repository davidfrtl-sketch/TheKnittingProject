import type { StitchChart, StitchSymbol } from "./stitchChart.js";
import type { Gauge } from "../domain/gauge.js";

function formatCm(value: number): string {
  return String(Number(value.toFixed(1)));
}

function renderKnitCell(x: number, y: number, width: number, height: number): string {
  return `<rect class="motif-cell k" x="${formatCm(x)}" y="${formatCm(y)}" width="${formatCm(width)}" height="${formatCm(height)}"></rect>`;
}

function renderPurlCell(x: number, y: number, width: number, height: number): string {
  const midY = y + height / 2;
  return [
    `<rect class="motif-cell p" x="${formatCm(x)}" y="${formatCm(y)}" width="${formatCm(width)}" height="${formatCm(height)}"></rect>`,
    `<line class="motif-purl-mark" x1="${formatCm(x + width * 0.2)}" y1="${formatCm(midY)}" x2="${formatCm(x + width * 0.8)}" y2="${formatCm(midY)}"></line>`,
  ].join("\n");
}

function renderCableCell(
  direction: "left" | "right",
  x: number,
  y: number,
  cellWidth: number,
  height: number
): string {
  const width = cellWidth * 4;
  const insetX = cellWidth * 0.4;
  const insetY = height * 0.2;
  return [
    `<rect class="motif-cell cable-${direction}" x="${formatCm(x)}" y="${formatCm(y)}" width="${formatCm(width)}" height="${formatCm(height)}"></rect>`,
    `<line class="motif-cable-cross" x1="${formatCm(x + insetX)}" y1="${formatCm(y + height - insetY)}" x2="${formatCm(x + width - insetX)}" y2="${formatCm(y + insetY)}"></line>`,
    `<line class="motif-cable-cross" x1="${formatCm(x + insetX)}" y1="${formatCm(y + insetY)}" x2="${formatCm(x + width - insetX)}" y2="${formatCm(y + height - insetY)}"></line>`,
  ].join("\n");
}

export function renderMotifTile(
  chart: StitchChart,
  gauge: Gauge,
  xCm: number,
  yCm: number,
  widthStitches: number,
  heightRows: number
): string {
  const cellWidthCm = 10 / gauge.stitchesPer10cm;
  const cellHeightCm = 10 / gauge.rowsPer10cm;

  const parts: string[] = [
    `<g class="motif-tile" transform="translate(${formatCm(xCm)},${formatCm(yCm)})">`,
  ];

  for (let row = 0; row < heightRows; row++) {
    const sourceRow = chart.cells[row % chart.rows];
    if (!sourceRow) {
      continue;
    }
    const y = (heightRows - 1 - row) * cellHeightCm;
    let col = 0;
    while (col < widthStitches) {
      const symbol: StitchSymbol | undefined = sourceRow[col % chart.cols];
      if (symbol === undefined) {
        col += 1;
        continue;
      }
      const x = col * cellWidthCm;

      if (symbol === "cl" || symbol === "cr") {
        if (col + 3 < widthStitches) {
          parts.push(renderCableCell(symbol === "cl" ? "left" : "right", x, y, cellWidthCm, cellHeightCm));
          col += 4;
          continue;
        }
        parts.push(renderKnitCell(x, y, cellWidthCm, cellHeightCm));
        col += 1;
        continue;
      }

      if (symbol === "p") {
        parts.push(renderPurlCell(x, y, cellWidthCm, cellHeightCm));
        col += 1;
        continue;
      }

      parts.push(renderKnitCell(x, y, cellWidthCm, cellHeightCm));
      col += 1;
    }
  }

  parts.push(`</g>`);
  return parts.join("\n");
}
