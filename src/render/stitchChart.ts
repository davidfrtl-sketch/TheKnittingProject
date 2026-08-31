export type StitchSymbol = "k" | "p" | "cl" | "cr";

export type StitchChart = {
  rows: number;
  cols: number;
  cells: StitchSymbol[][];
};

const CELL_SIZE = 10;
const MARGIN = 4;
const LEGEND_HEIGHT = 40;

function renderKnitCell(row: number, col: number, x: number, y: number): string {
  return `<rect class="chart-cell k" data-row="${row}" data-col="${col}" x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}"></rect>`;
}

function renderPurlCell(row: number, col: number, x: number, y: number): string {
  const midY = y + CELL_SIZE / 2;
  return [
    `<rect class="chart-cell p" data-row="${row}" data-col="${col}" x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}"></rect>`,
    `<line class="purl-mark" x1="${x + 2}" y1="${midY}" x2="${x + CELL_SIZE - 2}" y2="${midY}"></line>`,
  ].join("\n");
}

function renderCableCell(
  direction: "left" | "right",
  row: number,
  col: number,
  x: number,
  y: number
): string {
  const width = CELL_SIZE * 4;
  const insetX = 4;
  const insetY = 2;
  return [
    `<rect class="chart-cell cable-${direction}" data-row="${row}" data-col="${col}" x="${x}" y="${y}" width="${width}" height="${CELL_SIZE}"></rect>`,
    `<line class="cable-cross" x1="${x + insetX}" y1="${y + CELL_SIZE - insetY}" x2="${x + width - insetX}" y2="${y + insetY}"></line>`,
    `<line class="cable-cross" x1="${x + insetX}" y1="${y + insetY}" x2="${x + width - insetX}" y2="${y + CELL_SIZE - insetY}"></line>`,
  ].join("\n");
}

export function renderStitchChart(chart: StitchChart): string {
  const { rows, cols, cells } = chart;
  const viewBoxWidth = cols * CELL_SIZE + MARGIN * 2;
  const viewBoxHeight = rows * CELL_SIZE + MARGIN * 2 + LEGEND_HEIGHT;

  const parts: string[] = [
    `<svg class="stitch-chart" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" role="img" aria-label="Gráfico de punto">`,
  ];

  for (let row = 0; row < rows; row++) {
    const rowCells = cells[row];
    if (!rowCells) {
      continue;
    }
    const y = MARGIN + (rows - 1 - row) * CELL_SIZE;
    let col = 0;
    while (col < cols) {
      const symbol = rowCells[col];
      if (symbol === undefined) {
        col += 1;
        continue;
      }
      const x = MARGIN + col * CELL_SIZE;

      if (symbol === "cl" || symbol === "cr") {
        if (col + 3 < cols) {
          parts.push(renderCableCell(symbol === "cl" ? "left" : "right", row, col, x, y));
          col += 4;
          continue;
        }
        parts.push(renderKnitCell(row, col, x, y));
        col += 1;
        continue;
      }

      if (symbol === "p") {
        parts.push(renderPurlCell(row, col, x, y));
        col += 1;
        continue;
      }

      parts.push(renderKnitCell(row, col, x, y));
      col += 1;
    }
  }

  const legendY = MARGIN + rows * CELL_SIZE + 10;
  const legendItems: [string, string][] = [
    ["k", "Derecho"],
    ["p", "Revés"],
    ["cable-left", "Cruce 2/2 a la izquierda (2 puntos pasan por delante)"],
    ["cable-right", "Cruce 2/2 a la derecha (2 puntos pasan por detrás)"],
  ];
  legendItems.forEach(([symbolClass, label], index) => {
    const itemY = legendY + index * 8;
    parts.push(
      `<rect class="chart-cell ${symbolClass}" x="${MARGIN}" y="${itemY}" width="8" height="6"></rect>`,
      `<text class="chart-legend-label" x="${MARGIN + 12}" y="${itemY + 5}">${label}</text>`
    );
  });

  parts.push(`</svg>`);
  return parts.join("\n");
}
