# Back-Panel Motif Column and Fixed-Size Legend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the short-band motif-segment picker with a fixed-width motif column that runs the entire height of the back panel (neckline to hem), matching how real cable sweaters are actually constructed. Also decouple the stitch-chart legend's text size from the chart's own SVG scale.

**Architecture:** Both raglan-yoke increases and body-taper shaping always happen "1 stitch at each side" (confirmed in `instructionsRenderer.ts`) — the interior of the back panel never changes width, so a centered column can safely span the panel's entire life at a width equal to the panel's historical minimum. `computeBackMotifColumn` replaces `findMotifCandidates` entirely; `renderSchematicSvg`'s motif-embedding branch collapses to one case (no more segment routing). The chart legend moves from inside the SVG to plain HTML in `index.html`, since it's static content that never depended on the chart's data.

**Tech Stack:** TypeScript (strict, NodeNext ESM, `noUncheckedIndexedAccess`), Vitest, plain `tsc` web build (no bundler).

## Global Constraints

- Every relative import uses an explicit `.js` extension.
- `noUncheckedIndexedAccess: true` — no `!`/`as` escapes; guard every array/index read.
- No comments unless they explain a non-obvious WHY.
- `MotifSegment`, `MotifSource`, `findMotifCandidates`, the `<select id="motif-segment-select">` UI, and all its supporting `app.ts` state (`motifCandidates`, `selectedMotifSource`, `SEGMENT_LABELS`, `populateMotifSelect`, `setupMotifSelect`) are REMOVED entirely — not deprecated, not kept as unused code.
- `renderMotifTile` (`src/render/motifTile.ts`) is NOT touched by this plan — its tiling/cropping logic already works correctly for any width/height passed to it.
- Design spec: `docs/superpowers/specs/2026-08-31-motif-column-and-legend-fix-design.md` — read it for the full rationale (why shaping never touches the panel's center, the exact minimum-width algorithm, and why the legend must move out of the SVG).

---

### Task 1: `computeBackMotifColumn` — replace the segment picker's engine logic

**Files:**
- Modify: `src/engine/motifPlacement.ts` (full-file replacement)
- Modify: `tests/engine/motifPlacement.test.ts` (full-file replacement)

**Interfaces:**
- Consumes: `RaglanYokeResult` from `./raglanYoke.js`; `TaperResult`/`TaperRow` from `./taper.js`; `GarmentPlan` from `./garmentPlan.js`.
- Produces: `BackMotifColumn = { widthStitches: number; heightRows: number }`; `BackMotifColumnInput = Pick<GarmentPlan, "yoke" | "bodyWaistTaper" | "bodyHemTaper">`; `computeBackMotifColumn(plan: BackMotifColumnInput): BackMotifColumn | null`. Task 2 and Task 4 call this with a full `GarmentPlan` (structurally compatible with the narrower `Pick` type).

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `tests/engine/motifPlacement.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { computeBackMotifColumn } from "../../src/engine/motifPlacement.js";
import type { BackMotifColumnInput } from "../../src/engine/motifPlacement.js";
import type { RaglanYokeResult } from "../../src/engine/raglanYoke.js";
import type { TaperResult, TaperRow } from "../../src/engine/taper.js";

function makeRow(rowNumber: number, stitches: number): TaperRow {
  return { rowNumber, stitches, isShapingRow: false };
}

function makeTaper(schedule: TaperRow[]): TaperResult {
  const last = schedule[schedule.length - 1];
  return {
    schedule,
    finalStitches: last ? last.stitches : 0,
    events: 0,
    primaryCadence: 0,
    reducedCadence: 0,
    primaryCadenceEventCount: 0,
    reducedCadenceEventCount: 0,
  };
}

function makeYoke(castOnBack: number, backCounts: number[]): RaglanYokeResult {
  const schedule = backCounts.map((back, index) => ({
    roundNumber: index + 1,
    events: [],
    stitchCounts: { back, front: { open: false as const, combined: 0 }, sleeveLeft: 0, sleeveRight: 0 },
  }));
  return {
    schedule,
    finalStitchCounts: { back: 0, front: 0, sleeveLeft: 0, sleeveRight: 0 },
    armpitShortfall: { back: 0, front: 0, sleeveLeft: 0, sleeveRight: 0 },
    castOnBreakdown: { back: castOnBack, frontLeft: 0, frontRight: 0, sleeveLeft: 0, sleeveRight: 0 },
  };
}

describe("computeBackMotifColumn", () => {
  it("uses the yoke cast-on width when it is tighter than anything in the body taper", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(20, [20, 22, 24]),
      bodyWaistTaper: makeTaper([makeRow(1, 100), makeRow(2, 98)]),
      bodyHemTaper: makeTaper([makeRow(1, 98), makeRow(2, 100)]),
    };

    expect(computeBackMotifColumn(plan)).toEqual({ widthStitches: 20, heightRows: 7 });
  });

  it("uses the body taper's tighter width when it is narrower than the yoke cast-on", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(40, [40, 42, 44]),
      bodyWaistTaper: makeTaper([makeRow(1, 60), makeRow(2, 50)]),
      bodyHemTaper: makeTaper([makeRow(1, 50), makeRow(2, 70)]),
    };

    expect(computeBackMotifColumn(plan)).toEqual({ widthStitches: 24, heightRows: 7 });
  });

  it("finds the true minimum without assuming the waist taper always decreases", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(100, [100, 102]),
      bodyWaistTaper: makeTaper([makeRow(1, 50), makeRow(2, 60)]),
      bodyHemTaper: makeTaper([makeRow(1, 60), makeRow(2, 40)]),
    };

    expect(computeBackMotifColumn(plan)).toEqual({ widthStitches: 20, heightRows: 6 });
  });

  it("rounds an odd width down to the nearest even number", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(21, [21, 23]),
      bodyWaistTaper: makeTaper([makeRow(1, 200)]),
      bodyHemTaper: makeTaper([makeRow(1, 202)]),
    };

    expect(computeBackMotifColumn(plan)).toEqual({ widthStitches: 20, heightRows: 4 });
  });

  it("returns null when the narrowest available width is less than 1 stitch", () => {
    const plan: BackMotifColumnInput = {
      yoke: makeYoke(0, [0]),
      bodyWaistTaper: makeTaper([makeRow(1, 1000)]),
      bodyHemTaper: makeTaper([makeRow(1, 1000)]),
    };

    expect(computeBackMotifColumn(plan)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/motifPlacement.test.ts`
Expected: FAIL — `computeBackMotifColumn` does not exist yet (only `findMotifCandidates` does).

- [ ] **Step 3: Replace the implementation**

Replace the entire contents of `src/engine/motifPlacement.ts` with:

```ts
import type { GarmentPlan } from "./garmentPlan.js";

export type BackMotifColumn = {
  widthStitches: number;
  heightRows: number;
};

export type BackMotifColumnInput = Pick<GarmentPlan, "yoke" | "bodyWaistTaper" | "bodyHemTaper">;

export function computeBackMotifColumn(plan: BackMotifColumnInput): BackMotifColumn | null {
  const yokeBackValues = [
    plan.yoke.castOnBreakdown.back,
    ...plan.yoke.schedule.map((round) => round.stitchCounts.back),
  ];
  let minBack = Math.min(...yokeBackValues);

  const bodyValues = [
    ...plan.bodyWaistTaper.schedule.map((row) => row.stitches),
    ...plan.bodyHemTaper.schedule.map((row) => row.stitches),
  ];
  for (const stitches of bodyValues) {
    const backShare = stitches / 2;
    if (backShare < minBack) {
      minBack = backShare;
    }
  }

  const widthStitches = Math.floor(minBack / 2) * 2;
  if (widthStitches < 1) {
    return null;
  }

  const heightRows =
    plan.yoke.schedule.length + plan.bodyWaistTaper.schedule.length + plan.bodyHemTaper.schedule.length;

  return { widthStitches, heightRows };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/engine/motifPlacement.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: `npm test` passes for everything except `tests/render/schematicSvg.test.ts`, which will fail to even compile/run because it still imports the now-deleted `findMotifCandidates`/`MotifSource` — this is expected and is Task 2's job to fix, exactly like the equivalent interim state in the prior plan. Confirm the failure is specifically about the missing import (not something else), and that `tests/engine/motifPlacement.test.ts` itself passes.

- [ ] **Step 6: Commit**

```bash
git add src/engine/motifPlacement.ts tests/engine/motifPlacement.test.ts
git commit -m "Replace findMotifCandidates with computeBackMotifColumn: fixed-width column spanning the whole back panel"
```

---

### Task 2: Simplify `renderSchematicSvg`'s motif embedding

**Files:**
- Modify: `src/render/schematicSvg.ts`
- Modify: `tests/render/schematicSvg.test.ts`

**Interfaces:**
- Consumes: `BackMotifColumn` from `../engine/motifPlacement.js` (Task 1); `renderMotifTile` from `./motifTile.js` (unchanged); `cmForStitches` from `../domain/gauge.js`.
- Produces: `renderSchematicSvg(geometry: SchematicGeometry, motifChart?: StitchChart, gauge?: Gauge, motifColumn?: BackMotifColumn | null): string` — same 4-parameter shape as before, but the 4th parameter's type changes from `MotifSource | null` to `BackMotifColumn | null`. Task 4 calls this with all four arguments.

- [ ] **Step 1: Write the failing tests**

Replace the `describe("renderSchematicSvg — motif overlay", ...)` block in `tests/render/schematicSvg.test.ts` (everything from that `describe(` line to its closing `});`) with:

```ts
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
```

Update this test file's imports: remove `import type { MotifSource } from "../../src/engine/motifPlacement.js";` and `import { findMotifCandidates } from "../../src/engine/motifPlacement.js";`, and add instead:

```ts
import { computeBackMotifColumn } from "../../src/engine/motifPlacement.js";
import type { BackMotifColumn } from "../../src/engine/motifPlacement.js";
```

Leave the first `describe("renderSchematicSvg", ...)` block (the one testing panel geometry, labels, etc.) completely untouched — this task only replaces the second `describe` block and the two import lines named above.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/render/schematicSvg.test.ts`
Expected: FAIL — `renderSchematicSvg` doesn't accept a `BackMotifColumn` yet (still expects `MotifSource`-shaped data with a `segment` field), and the first describe block's tests should still pass unaffected.

- [ ] **Step 3: Simplify `renderSchematicSvg`**

In `src/render/schematicSvg.ts`, change the imports at the top from:

```ts
import { cmForRows, cmForStitches } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { StitchChart } from "./stitchChart.js";
import type { MotifSource } from "../engine/motifPlacement.js";
import { renderMotifTile } from "./motifTile.js";
```

to:

```ts
import { cmForStitches } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { StitchChart } from "./stitchChart.js";
import type { BackMotifColumn } from "../engine/motifPlacement.js";
import { renderMotifTile } from "./motifTile.js";
```

Change the function signature from:

```ts
export function renderSchematicSvg(
  geometry: SchematicGeometry,
  motifChart?: StitchChart,
  gauge?: Gauge,
  motifSource?: MotifSource | null
): string {
```

to:

```ts
export function renderSchematicSvg(
  geometry: SchematicGeometry,
  motifChart?: StitchChart,
  gauge?: Gauge,
  motifColumn?: BackMotifColumn | null
): string {
```

Replace the entire motif-embedding block (from `const motifParts: string[] = [];` through its closing `}`) with:

```ts
  const motifParts: string[] = [];
  if (motifChart && gauge && motifColumn) {
    const widthCm = cmForStitches(gauge, motifColumn.widthStitches);
    motifParts.push(
      renderMotifTile(
        motifChart,
        gauge,
        centerBack - widthCm / 2,
        y0,
        motifColumn.widthStitches,
        motifColumn.heightRows
      )
    );
  }
```

Leave everything else in the file (the polygon-point helpers, the layout constants, the final `return [...]` array) exactly as-is.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/render/schematicSvg.test.ts`
Expected: PASS (all tests in both describe blocks).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: everything passes except `tests/render/stitchChart.test.ts` (Task 3's job) and `src/web/app.ts`'s build (Task 4's job, still references the deleted picker code) — confirm the render/engine test suite itself (everything except those two known-pending items) is fully green.

- [ ] **Step 6: Commit**

```bash
git add src/render/schematicSvg.ts tests/render/schematicSvg.test.ts
git commit -m "Simplify renderSchematicSvg's motif embedding to a single full-height back column"
```

---

### Task 3: Decouple the stitch-chart legend from the SVG's scale

**Files:**
- Modify: `src/render/stitchChart.ts`
- Modify: `tests/render/stitchChart.test.ts`
- Modify: `index.html`

**Interfaces:**
- Consumes: nothing new.
- Produces: `renderStitchChart(chart: StitchChart): string` — same signature, but the returned SVG no longer contains any legend markup (no `<text class="chart-legend-label">`, no legend `<rect>`s), and its `viewBox` height drops by 40 units (the removed `LEGEND_HEIGHT`). Task 4 does not depend on this — it is independent of the motif-column work and can be verified on its own.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `tests/render/stitchChart.test.ts` with:

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

  it("sizes the viewBox from rows/cols only (no legend space)", () => {
    expect(svg).toContain('viewBox="0 0 68 48"');
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

  it("does not render a legend inside the SVG", () => {
    expect(svg).not.toContain("chart-legend-label");
    expect(svg).not.toContain("Derecho");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/render/stitchChart.test.ts`
Expected: FAIL — the current implementation still has `LEGEND_HEIGHT` in the viewBox (so it's `"0 0 68 88"`, not `"0 0 68 48"`) and still renders the legend text.

- [ ] **Step 3: Remove the legend from `renderStitchChart`**

In `src/render/stitchChart.ts`, remove the `const LEGEND_HEIGHT = 40;` line, change:

```ts
  const viewBoxHeight = rows * CELL_SIZE + MARGIN * 2 + LEGEND_HEIGHT;
```

to:

```ts
  const viewBoxHeight = rows * CELL_SIZE + MARGIN * 2;
```

and remove this entire block (everything from `const legendY = ...` through the `legendItems.forEach(...)` call, right before the final `parts.push('</svg>');`):

```ts
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
```

Everything else in the file (cell-drawing helpers, the row/column scanning loop) stays exactly as-is.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/render/stitchChart.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Add the static HTML legend to `index.html`**

In `index.html`'s `<style>` block, replace this line:

```css
  .chart-legend-label { font-family: var(--font-body); font-size: 4px; fill: var(--ink); }
```

with:

```css
  .chart-legend { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .chart-legend li { display: flex; align-items: center; gap: 8px; }
  .chart-legend-swatch { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--ink); flex-shrink: 0; }
  .chart-legend-swatch.k { background: var(--surface); }
  .chart-legend-swatch.p { background: var(--paper); }
  .chart-legend-swatch.cable-left, .chart-legend-swatch.cable-right { background: var(--electric); }
```

In the body, right after `<div id="chart-container"></div>`, add:

```html
    <ul class="chart-legend">
      <li><span class="chart-legend-swatch k"></span> Derecho</li>
      <li><span class="chart-legend-swatch p"></span> Revés</li>
      <li><span class="chart-legend-swatch cable-left"></span> Cruce 2/2 a la izquierda (2 puntos pasan por delante)</li>
      <li><span class="chart-legend-swatch cable-right"></span> Cruce 2/2 a la derecha (2 puntos pasan por detrás)</li>
    </ul>
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: `tests/render/stitchChart.test.ts` and everything not touched by Tasks 1/2/4 passes; the build (`npm run build`) is still expected to fail until Task 4 lands (unrelated, pre-existing interim state).

- [ ] **Step 7: Commit**

```bash
git add src/render/stitchChart.ts tests/render/stitchChart.test.ts index.html
git commit -m "Move the stitch-chart legend out of the SVG into fixed-size HTML"
```

---

### Task 4: Remove the segment picker from the web tool, wire the motif column

**Files:**
- Modify: `src/web/app.ts`
- Modify: `index.html`

**Interfaces:**
- Consumes: `computeBackMotifColumn` from `../engine/motifPlacement.js` (Task 1); the updated `renderSchematicSvg` signature (Task 2).
- Produces: nothing new for other tasks to consume — this is the final integration point. Manual browser verification only (no Vitest coverage for `src/web/app.ts`, matching this file's established convention).

- [ ] **Step 1: Remove the `<select>` markup and its CSS from `index.html`**

Remove this block from inside the "Esquema" `result-card` (right before `<div id="svg-container"></div>`):

```html
      <div id="motif-select-wrapper" hidden>
        <label for="motif-segment-select">Motivo en:</label>
        <select id="motif-segment-select"></select>
      </div>
```

Remove these CSS rules from the `<style>` block:

```css
  #motif-select-wrapper { margin-bottom: 10px; font-size: 13px; display: flex; align-items: center; gap: 8px; }
  #motif-segment-select {
    font-family: var(--font-body);
    font-size: 13px;
    padding: 4px 6px;
    border: 2px solid var(--ink);
    border-radius: 0;
    background: var(--paper);
    color: var(--ink);
  }
```

- [ ] **Step 2: Update `app.ts`'s imports**

Change:

```ts
import { findMotifCandidates } from "../engine/motifPlacement.js";
import type { MotifSource, MotifSegment } from "../engine/motifPlacement.js";
```

to:

```ts
import { computeBackMotifColumn } from "../engine/motifPlacement.js";
```

- [ ] **Step 3: Simplify `calculate()`**

Replace:

```ts
    const geometry = computeSchematicGeometry(plan, gauge);
    const candidates = findMotifCandidates(plan);
    motifCandidates = candidates;
    const firstCandidate = candidates[0];
    selectedMotifSource = firstCandidate ?? null;
    populateMotifSelect(candidates);
    const svg = renderSchematicSvg(geometry, currentChart, gauge, selectedMotifSource);
```

with:

```ts
    const geometry = computeSchematicGeometry(plan, gauge);
    const motifColumn = computeBackMotifColumn(plan);
    const svg = renderSchematicSvg(geometry, currentChart, gauge, motifColumn);
```

In the `catch (error)` block, remove these three lines (leave `lastPlan = null; lastGauge = null;` in place):

```ts
    motifCandidates = [];
    selectedMotifSource = null;
    populateMotifSelect([]);
```

- [ ] **Step 4: Remove the picker's module state and functions**

Remove these two lines from the module-level state block:

```ts
let motifCandidates: MotifSource[] = [];
let selectedMotifSource: MotifSource | null = null;
```

Remove the entire `SEGMENT_LABELS` constant and `populateMotifSelect` function:

```ts
const SEGMENT_LABELS: Record<MotifSegment, string> = {
  bodyWaist: "Cintura",
  bodyHem: "Cadera",
  sleeve: "Manga",
};

function populateMotifSelect(candidates: MotifSource[]): void {
  const wrapper = document.getElementById("motif-select-wrapper");
  const select = document.getElementById("motif-segment-select");
  if (!wrapper || !(select instanceof HTMLSelectElement)) {
    return;
  }
  select.innerHTML = "";
  for (const candidate of candidates) {
    const option = document.createElement("option");
    option.value = candidate.segment;
    option.textContent = `${SEGMENT_LABELS[candidate.segment]} — ${candidate.rowCount} filas, ${candidate.stitches} puntos`;
    select.appendChild(option);
  }
  wrapper.hidden = candidates.length === 0;
  const first = candidates[0];
  if (first) {
    select.value = first.segment;
  }
}
```

Remove the entire `setupMotifSelect` function:

```ts
function setupMotifSelect(): void {
  const select = document.getElementById("motif-segment-select");
  if (!select) {
    return;
  }
  select.addEventListener("change", () => {
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const match = motifCandidates.find((candidate) => candidate.segment === select.value);
    selectedMotifSource = match ?? null;
    refreshSchematicIfCalculated();
  });
}
```

And remove its call at the bottom of the file:

```ts
setupMotifSelect();
```

(leave the `setupChartEditor();` call right above it in place).

- [ ] **Step 5: Update `refreshSchematicIfCalculated`**

Replace:

```ts
function refreshSchematicIfCalculated(): void {
  const resultBox = document.getElementById("result-box");
  const svgContainer = document.getElementById("svg-container");
  if (!resultBox || resultBox.hidden || !svgContainer || !lastPlan || !lastGauge) {
    return;
  }
  const geometry = computeSchematicGeometry(lastPlan, lastGauge);
  svgContainer.innerHTML = renderSchematicSvg(geometry, currentChart, lastGauge, selectedMotifSource);
}
```

with:

```ts
function refreshSchematicIfCalculated(): void {
  const resultBox = document.getElementById("result-box");
  const svgContainer = document.getElementById("svg-container");
  if (!resultBox || resultBox.hidden || !svgContainer || !lastPlan || !lastGauge) {
    return;
  }
  const geometry = computeSchematicGeometry(lastPlan, lastGauge);
  const motifColumn = computeBackMotifColumn(lastPlan);
  svgContainer.innerHTML = renderSchematicSvg(geometry, currentChart, lastGauge, motifColumn);
}
```

- [ ] **Step 6: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed with no errors (this is what fixes the interim build breakage from Tasks 1-3).

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: all tests pass (this task adds no new Vitest coverage — `src/web/app.ts` has none, by established project convention).

- [ ] **Step 8: Manual browser verification**

Serve the built app locally (temporary `.claude/launch.json` or a plain `python3 -m http.server` from the repo root, same pattern as every prior web-tool verification) and in the browser:

1. Load the page with its default form values and click "Calcular". Confirm the schematic SVG contains exactly one `<g class="motif-tile">` element, positioned in the back panel (inspect via `javascript_tool`, not just visually).
2. Confirm there is no `<select>`/dropdown for choosing a segment anywhere on the page anymore.
3. Confirm the motif tile's rendered height corresponds to spanning the entire back panel (from the very top of the schematic down to the hem line) — e.g. by checking that the `<g>`'s `transform` y-coordinate matches `y0` (8) and that visually (via screenshot) the motif column runs the full height of the espalda panel, not just a short band.
4. Click "Cargar cruz de ejemplo" in the stitch-chart editor. Confirm the schematic re-renders automatically (without clicking "Calcular" again) and now shows the cross motif's purl/cable pattern running the full height of the back panel, centered.
5. Scroll to the "Gráfico de punto" card. Confirm the legend below the grid (Derecho/Revés/Cruce 2/2 izquierda/derecha) renders at a small, fixed, readable text size. Resize the chart grid to something small (e.g. 3×3) and something large (e.g. 20×20) via "Redimensionar", and confirm the legend's text size does NOT change between the two (only the grid above it changes size) — this is the core bug being fixed.
6. Confirm no console errors appear during any of the above (`read_console_messages`).

Stop the preview server and delete any temporary `.claude/launch.json` afterward, same as every prior verification this session.

- [ ] **Step 9: Commit**

```bash
git add src/web/app.ts index.html
git commit -m "Remove the motif-segment picker UI, wire the full-height back motif column"
```
