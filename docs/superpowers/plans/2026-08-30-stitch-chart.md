# Stitch Chart Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let someone design and visualize a stitch motif (knit, purl, 2/2 cable crosses) — the graphic renderer half of the domain's two-renderer output model, per `docs/superpowers/specs/2026-08-30-stitch-chart-design.md`.

**Architecture:** Task 1 adds `renderStitchChart`, a pure TDD-tested function (`src/render/stitchChart.ts`) that turns a `StitchChart` grid into SVG markup with a mandatory legend — no DOM, no interactivity logic, just data-to-markup, exactly like `renderSchematicSvg`. Task 2 adds the interactive piece to the existing web tool: a new section in `index.html` and new wiring in `src/web/app.ts` that holds the chart's state in memory, re-renders on every click, and is manually verified in a browser (this project has no DOM-testing setup, same reasoning as the rest of `app.ts`).

**Tech Stack:** TypeScript (strict, ESM, NodeNext module resolution), Vitest, vanilla DOM APIs.

## Global Constraints

- Module resolution stays `NodeNext` — every relative import keeps its explicit `.js` extension, for both type-only and value imports.
- `noUncheckedIndexedAccess` is on project-wide — every array index read (`cells[row]`, `cells[row][col]`, `SYMBOL_CYCLE[...]`) must be treated as possibly `undefined` and handled explicitly (an early `continue`/`return`, or a `??` fallback) — never a non-null assertion (`!`) or an `as` cast to paper over it.
- `renderStitchChart` has no knowledge of clicks, state, or the DOM — it only emits `data-row`/`data-col` attributes so a caller can address cells. All interactivity lives in `src/web/app.ts`.
- A cable symbol (`'cl'`/`'cr'`) always consumes exactly 4 columns starting at its own column, unless fewer than 3 columns remain after it in that row — in that case it renders as a plain `'k'` instead, never a partial/broken cable glyph.
- Row 0 renders at the BOTTOM of the chart (row index increases upward) — this is the CYC "read bottom-to-top" convention already established in the domain doc, and every row reads left-to-right (no RS/WS alternation, since the motivated use case — the back panel — is worked in the round).
- Run `npm run typecheck` and `npm test` after Task 1 (both must stay green). Task 2 additionally needs `npm run build` to succeed and a manual browser check (no Vitest coverage for `app.ts`/`index.html`).

---

### Task 1: `renderStitchChart` with a golden-value regression test

**Files:**
- Create: `src/render/stitchChart.ts`
- Test: `tests/render/stitchChart.test.ts`

**Interfaces:**
- Consumes: nothing from other modules — this is a self-contained data-to-SVG function, unlike `renderSchematicSvg` which reads `SchematicGeometry`.
- Produces: `StitchSymbol`, `StitchChart` types, and `renderStitchChart(chart: StitchChart): string`. Task 2's `src/web/app.ts` will call this after every edit to the in-memory chart state.

- [ ] **Step 1: Write the failing test**

Create `tests/render/stitchChart.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/render/stitchChart.test.ts`
Expected: FAIL — `src/render/stitchChart.ts` does not exist yet (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/render/stitchChart.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/render/stitchChart.test.ts`
Expected: PASS (8 tests).

Then run: `npm run typecheck`
Expected: no errors.

Then run the full suite: `npm test`
Expected: all tests pass (this task's 8 tests plus every existing test).

- [ ] **Step 5: Commit**

```bash
git add src/render/stitchChart.ts tests/render/stitchChart.test.ts
git commit -m "Add renderStitchChart: knit/purl/cable-cross SVG chart with legend"
```

---

### Task 2: Interactive chart editor in the web tool

**Files:**
- Modify: `index.html` (new section + CSS)
- Modify: `src/web/app.ts` (new state, rendering, and event-wiring code, appended — does not change any existing function)

**Interfaces:**
- Consumes: `renderStitchChart`, `StitchChart`, `StitchSymbol` from `../render/stitchChart.js` (Task 1).
- Produces: nothing consumed elsewhere — this is the last piece of the current scope.

- [ ] **Step 1: Add the CSS and HTML section**

In `index.html`, add these rules to the existing `<style>` block (anywhere after the `#instructions-container` rule is fine):

```css
  #chart-container { overflow-x: auto; margin-top: 12px; }
  #chart-container svg { min-width: 400px; }
  .chart-cell { fill: var(--surface); stroke: var(--ink); stroke-width: 0.5; cursor: pointer; }
  .chart-cell.p { fill: var(--paper); }
  .chart-cell.cable-left, .chart-cell.cable-right { fill: var(--electric); }
  .purl-mark { stroke: var(--ink); stroke-width: 0.6; }
  .cable-cross { stroke: #ffffff; stroke-width: 0.6; }
  .chart-legend-label { font-family: var(--font-body); font-size: 4px; fill: var(--ink); }
  .chart-controls { display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
```

Then add this new section, placed right after the closing `</div>` of `#result-box` and before the `<script type="module" ...>` line:

```html
  <div class="result-card">
    <h2>Gráfico de punto</h2>
    <p class="lede">Diseñá un motivo con derecho, revés y cruces de trenza 2/2. Hacé clic en una celda para rotar su símbolo.</p>
    <div class="field-grid">
      <label>Filas <input type="number" id="chart-rows" value="7" step="1"></label>
      <label>Columnas <input type="number" id="chart-cols" value="13" step="1"></label>
    </div>
    <div class="chart-controls">
      <button type="button" id="chart-resize-button">Redimensionar</button>
      <button type="button" id="chart-preset-button">Cargar cruz de ejemplo</button>
    </div>
    <div id="chart-container"></div>
  </div>
```

- [ ] **Step 2: Add the chart state and wiring to `src/web/app.ts`**

At the top of `src/web/app.ts`, add to the existing import block:

```ts
import { renderStitchChart } from "../render/stitchChart.js";
import type { StitchChart, StitchSymbol } from "../render/stitchChart.js";
```

At the end of the file (after the existing `const button = document.getElementById("calculate-button"); ...` block), append:

```ts
const SYMBOL_CYCLE: StitchSymbol[] = ["k", "p", "cl", "cr"];

function nextSymbol(symbol: StitchSymbol): StitchSymbol {
  const index = SYMBOL_CYCLE.indexOf(symbol);
  const next = SYMBOL_CYCLE[(index + 1) % SYMBOL_CYCLE.length];
  return next ?? "k";
}

function createBlankChart(rows: number, cols: number): StitchChart {
  const cells: StitchSymbol[][] = [];
  for (let row = 0; row < rows; row++) {
    cells.push(Array.from({ length: cols }, (): StitchSymbol => "k"));
  }
  return { rows, cols, cells };
}

function createCrossPreset(): StitchChart {
  const size = 13;
  const chart = createBlankChart(size, size);
  const mid = Math.floor(size / 2);
  for (let row = 0; row < size; row++) {
    const rowCells = chart.cells[row];
    if (!rowCells) {
      continue;
    }
    for (let col = 0; col < size; col++) {
      if (row === mid || col === mid) {
        rowCells[col] = "p";
      }
    }
    if (row % 4 === 0) {
      rowCells[0] = "cl";
      rowCells[size - 4] = "cr";
    }
  }
  return chart;
}

let currentChart: StitchChart = createBlankChart(7, 13);

function renderChart(): void {
  const container = document.getElementById("chart-container");
  if (container) {
    container.innerHTML = renderStitchChart(currentChart);
  }
}

function showChartError(error: unknown): void {
  const errorBox = document.getElementById("error-box");
  if (errorBox) {
    errorBox.hidden = false;
    errorBox.textContent = error instanceof Error ? error.message : String(error);
  }
}

function setupChartEditor(): void {
  const container = document.getElementById("chart-container");
  const resizeButton = document.getElementById("chart-resize-button");
  const presetButton = document.getElementById("chart-preset-button");

  if (container) {
    container.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const cell = target.closest("[data-row][data-col]");
      if (!(cell instanceof Element)) {
        return;
      }
      const row = Number(cell.getAttribute("data-row"));
      const col = Number(cell.getAttribute("data-col"));
      const rowCells = currentChart.cells[row];
      if (!rowCells) {
        return;
      }
      const symbol = rowCells[col];
      if (symbol === undefined) {
        return;
      }
      rowCells[col] = nextSymbol(symbol);
      renderChart();
    });
  }

  if (resizeButton) {
    resizeButton.addEventListener("click", () => {
      try {
        const rows = getNumberInput("chart-rows");
        const cols = getNumberInput("chart-cols");
        if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
          throw new Error("Filas y columnas deben ser números enteros positivos.");
        }
        currentChart = createBlankChart(rows, cols);
        renderChart();
      } catch (error) {
        showChartError(error);
      }
    });
  }

  if (presetButton) {
    presetButton.addEventListener("click", () => {
      currentChart = createCrossPreset();
      renderChart();
    });
  }

  renderChart();
}

setupChartEditor();
```

This reuses the file's existing `getNumberInput` helper (already defined earlier in `app.ts` from the prior plan) — no need to redefine it. It also reuses the existing `#error-box` element for chart-resize validation errors, sharing it with the measurements form's errors rather than adding a second error UI (an accepted simplification for this pass).

- [ ] **Step 3: Build and verify manually in a browser**

Run: `npm run build`
Expected: no errors; `dist/web/app.js` still present and now includes the chart code, `dist/render/stitchChart.js` exists.

Run: `npm run typecheck` and `npm test` — both must stay green (this step doesn't touch anything they cover, but confirm no regression).

Serve the repo root (e.g. `npx serve .` or `python3 -m http.server`) and open `index.html`. Verify by hand:
1. A "Gráfico de punto" card appears below the instructions, showing a blank 7×13 grid of empty (knit) cells with a legend of 4 lines underneath.
2. Clicking a cell cycles it through: empty (knit) → a cell with a horizontal line (purl) → a wide 4-cell blue rectangle with a crossing X (cable-left) → the same wide shape (cable-right) → back to empty. Clicking near the right edge of the grid (fewer than 3 columns remaining) never produces a broken/partial cable shape.
3. Clicking "Cargar cruz de ejemplo" replaces the grid with a 13×13 chart showing a plus-shaped purl motif on a knit background, with cable crosses at the left and right edges of some rows.
4. Changing the rows/columns fields to something like `9`/`20` and clicking "Redimensionar" replaces the grid with a new blank grid of that size.
5. Setting rows to `0` and clicking "Redimensionar" shows the validation error in the shared error banner, without touching the chart already on screen destructively (i.e. no crash, no blank page).

This step has no automated pass/fail — record what you observed in your report.

- [ ] **Step 4: Commit**

```bash
git add index.html src/web/app.ts
git commit -m "Add interactive stitch chart editor (knit/purl/cable crosses) to the web tool"
```

Do NOT commit `dist/`.

---

## Self-Review Notes

- **Spec coverage:** The `StitchChart`/`StitchSymbol` model, the left-to-right greedy cable-consumption algorithm with edge fallback, the bottom-to-top row orientation, the mandatory legend, the `data-row`/`data-col` addressing scheme, and the interactive editor (resize, click-to-cycle, cross preset) are all covered across the two tasks. The spec's explicitly-out-of-scope items (lace, colorwork, connecting the motif to the real body panel, configurable cable width) have no corresponding code, correctly.
- **Placeholder scan:** No TBD/TODO. Every numeric value in the golden test (viewBox, x/y positions, the fallback case) is derived and stated in the spec, not guessed.
- **Type consistency:** `renderStitchChart(chart: StitchChart): string` matches the spec exactly. `noUncheckedIndexedAccess` is handled consistently in both the render function (Task 1) and the editor's click handler and preset builder (Task 2) — every 2D-array read goes through an explicit undefined-check, never a non-null assertion. `app.ts`'s new code reuses the existing `getNumberInput` and `#error-box` rather than duplicating that logic, matching the plan's stated interface.
