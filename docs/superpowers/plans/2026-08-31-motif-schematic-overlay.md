# Motif-on-Schematic Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Superimpose the stitch-chart motif (already designed in the web tool's chart editor) onto the schematic SVG, at the one real position in the calculated pattern where stitch count is genuinely constant across multiple rows.

**Architecture:** A new pure engine function (`findMotifSource`) scans the three relevant `TaperResult.schedule`s for the longest run of consecutive rows with identical stitch counts. A new pure render function (`renderMotifTile`) tiles a `StitchChart` into a real-cm-sized `<g>` fragment (non-square cells, no legend, no interactivity). `renderSchematicSvg` gains optional parameters to embed that fragment at the correct position (reusing its own already-computed layout constants). `app.ts` wires it end-to-end and keeps the schematic in sync whenever the motif changes.

**Tech Stack:** TypeScript (strict, NodeNext ESM, `noUncheckedIndexedAccess`), Vitest, plain `tsc` web build (no bundler).

## Global Constraints

- Every relative import uses an explicit `.js` extension (NodeNext resolution), even though sources are `.ts`.
- `noUncheckedIndexedAccess: true` — every array/record index read must be guarded (`undefined` check, early `continue`/`return`, or `??`). Never use `!` or `as` to bypass this.
- Every new module in `src/engine/` or `src/render/` MUST be added to that directory's barrel (`src/engine/index.ts` / `src/render/index.ts`) in the same task that creates it — this exact omission was an Important finding in three prior plans this session.
- `src/render/*.ts` files are pure data→string functions: no DOM, no `document`, no I/O. DOM wiring lives only in `src/web/app.ts`.
- No comments unless they explain a non-obvious WHY (hidden constraint, subtle invariant). Never comment WHAT the code does.
- Do not modify `src/render/stitchChart.ts` or its test — it stays exactly as merged. The new motif-tile renderer is a separate, standalone file (explicit design decision — see spec).
- `renderSchematicSvg`'s existing (no-motif-arguments) behavior must remain byte-for-byte unchanged — every existing caller and test in `tests/render/schematicSvg.test.ts` keeps passing unmodified.
- Design spec: `docs/superpowers/specs/2026-08-31-motif-schematic-overlay-design.md` — read it for the full rationale (why no truly "straight" body section exists, why only `sleeveLeftTaper` is evaluated, the bottom-to-top row convention, the tie-break priority order). This plan's code implements that spec exactly.

---

### Task 1: `findMotifSource` — longest flat-run detector

**Files:**
- Create: `src/engine/motifPlacement.ts`
- Test: `tests/engine/motifPlacement.test.ts`
- Modify: `src/engine/index.ts`

**Interfaces:**
- Consumes: `TaperResult`/`TaperRow` from `./taper.js` (`schedule: TaperRow[]`, `TaperRow = { rowNumber: number; isShapingRow: boolean; stitches: number }`); `GarmentPlan` from `./garmentPlan.js` (only for the `Pick<...>` type below — this task does not run `computeGarmentPlan`).
- Produces: `MotifSegment = "bodyWaist" | "bodyHem" | "sleeve"`; `MotifSource = { segment: MotifSegment; startRow: number; rowCount: number; stitches: number }`; `MotifPlacementInput = Pick<GarmentPlan, "bodyWaistTaper" | "bodyHemTaper" | "sleeveLeftTaper">`; `findMotifSource(plan: MotifPlacementInput): MotifSource | null` — Task 3 and Task 4 call this with a full `GarmentPlan` (structurally compatible with the narrower `Pick` type).

- [ ] **Step 1: Write the failing tests**

Create `tests/engine/motifPlacement.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { findMotifSource } from "../../src/engine/motifPlacement.js";
import type { MotifPlacementInput } from "../../src/engine/motifPlacement.js";
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

describe("findMotifSource", () => {
  it("picks the longest run of equal-stitch rows across the three phases", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([
        makeRow(1, 100),
        makeRow(2, 100),
        makeRow(3, 98),
        makeRow(4, 98),
        makeRow(5, 98),
        makeRow(6, 96),
      ]),
      bodyHemTaper: makeTaper([makeRow(1, 80), makeRow(2, 82), makeRow(3, 82), makeRow(4, 84)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 40), makeRow(2, 40), makeRow(3, 42)]),
    };

    expect(findMotifSource(plan)).toEqual({
      segment: "bodyWaist",
      startRow: 3,
      rowCount: 3,
      stitches: 98,
    });
  });

  it("breaks ties with priority bodyWaist > bodyHem > sleeve", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 10), makeRow(2, 12), makeRow(3, 12), makeRow(4, 14)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 22), makeRow(4, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 5), makeRow(2, 6), makeRow(3, 6), makeRow(4, 7)]),
    };

    expect(findMotifSource(plan)).toEqual({
      segment: "bodyWaist",
      startRow: 2,
      rowCount: 2,
      stitches: 12,
    });
  });

  it("returns null when every phase changes stitch count on every row", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 10), makeRow(2, 12), makeRow(3, 14)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 5), makeRow(2, 6), makeRow(3, 7)]),
    };

    expect(findMotifSource(plan)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/motifPlacement.test.ts`
Expected: FAIL — `src/engine/motifPlacement.ts` does not exist yet.

- [ ] **Step 3: Implement `findMotifSource`**

Create `src/engine/motifPlacement.ts`:

```ts
import type { TaperRow } from "./taper.js";
import type { GarmentPlan } from "./garmentPlan.js";

export type MotifSegment = "bodyWaist" | "bodyHem" | "sleeve";

export type MotifSource = {
  segment: MotifSegment;
  startRow: number;
  rowCount: number;
  stitches: number;
};

export type MotifPlacementInput = Pick<
  GarmentPlan,
  "bodyWaistTaper" | "bodyHemTaper" | "sleeveLeftTaper"
>;

type Run = { startRow: number; rowCount: number; stitches: number };

function longestRun(schedule: TaperRow[]): Run | null {
  let best: Run | null = null;
  let current: Run | null = null;

  for (const row of schedule) {
    if (current && current.stitches === row.stitches) {
      current = { ...current, rowCount: current.rowCount + 1 };
    } else {
      current = { startRow: row.rowNumber, rowCount: 1, stitches: row.stitches };
    }
    if (!best || current.rowCount > best.rowCount) {
      best = current;
    }
  }

  return best;
}

const SEGMENT_ORDER: MotifSegment[] = ["bodyWaist", "bodyHem", "sleeve"];

export function findMotifSource(plan: MotifPlacementInput): MotifSource | null {
  const runsBySegment: Record<MotifSegment, Run | null> = {
    bodyWaist: longestRun(plan.bodyWaistTaper.schedule),
    bodyHem: longestRun(plan.bodyHemTaper.schedule),
    sleeve: longestRun(plan.sleeveLeftTaper.schedule),
  };

  let winner: { segment: MotifSegment; run: Run } | null = null;
  for (const segment of SEGMENT_ORDER) {
    const run = runsBySegment[segment];
    if (!run) {
      continue;
    }
    if (!winner || run.rowCount > winner.run.rowCount) {
      winner = { segment, run };
    }
  }

  if (!winner || winner.run.rowCount <= 1) {
    return null;
  }

  return {
    segment: winner.segment,
    startRow: winner.run.startRow,
    rowCount: winner.run.rowCount,
    stitches: winner.run.stitches,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/engine/motifPlacement.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the barrel export**

`src/engine/index.ts` currently reads:

```ts
export * from "./axilaJoin.js";
export * from "./garmentPlan.js";
export * from "./raglanIncrease.js";
export * from "./raglanYoke.js";
export * from "./taper.js";
```

Insert the new line alphabetically, between `garmentPlan.js` and `raglanIncrease.js`:

```ts
export * from "./axilaJoin.js";
export * from "./garmentPlan.js";
export * from "./motifPlacement.js";
export * from "./raglanIncrease.js";
export * from "./raglanYoke.js";
export * from "./taper.js";
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: both pass, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/engine/motifPlacement.ts src/engine/index.ts tests/engine/motifPlacement.test.ts
git commit -m "Add findMotifSource: longest flat-stitch-count run across body/sleeve tapers"
```

---

### Task 2: `renderMotifTile` — tiled motif SVG fragment

**Files:**
- Create: `src/render/motifTile.ts`
- Test: `tests/render/motifTile.test.ts`
- Modify: `src/render/index.ts`

**Interfaces:**
- Consumes: `StitchChart`/`StitchSymbol` from `./stitchChart.js` (unmodified); `Gauge` from `../domain/gauge.js`.
- Produces: `renderMotifTile(chart: StitchChart, gauge: Gauge, xCm: number, yCm: number, widthStitches: number, heightRows: number): string` — a `<g class="motif-tile" transform="translate(x,y)">...</g>` fragment with NO own `<svg>`/`viewBox`/legend, meant to be concatenated into another SVG string. Task 3 calls this directly.

- [ ] **Step 1: Write the failing test**

Create `tests/render/motifTile.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render/motifTile.test.ts`
Expected: FAIL — `src/render/motifTile.ts` does not exist yet.

- [ ] **Step 3: Implement `renderMotifTile`**

Create `src/render/motifTile.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render/motifTile.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the barrel export**

`src/render/index.ts` currently reads:

```ts
export * from "./instructionsRenderer.js";
export * from "./schematicGeometry.js";
```

Insert the new line alphabetically, between them:

```ts
export * from "./instructionsRenderer.js";
export * from "./motifTile.js";
export * from "./schematicGeometry.js";
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: both pass, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/render/motifTile.ts src/render/index.ts tests/render/motifTile.test.ts
git commit -m "Add renderMotifTile: tiled stitch-motif SVG fragment at real cm scale"
```

---

### Task 3: Embed the motif into `renderSchematicSvg`

**Files:**
- Modify: `src/render/schematicSvg.ts`
- Modify: `tests/render/schematicSvg.test.ts`

**Interfaces:**
- Consumes: `renderMotifTile` from `./motifTile.js` (Task 2); `MotifSource` from `../engine/motifPlacement.js` (Task 1); `StitchChart` from `./stitchChart.js`; `Gauge`, `cmForRows`, `cmForStitches` from `../domain/gauge.js`.
- Produces: `renderSchematicSvg(geometry: SchematicGeometry, motifChart?: StitchChart, gauge?: Gauge, motifSource?: MotifSource | null): string` — same return type as before, now embedding motif `<g>` fragments when all three optional arguments are present and `motifSource` is non-null. Task 4 calls this with all four arguments.

- [ ] **Step 1: Write the failing tests**

Add to `tests/render/schematicSvg.test.ts` (append after the existing `describe("renderSchematicSvg", ...)` block — do not modify the existing block or its fixtures):

```ts
import { renderMotifTile } from "../../src/render/motifTile.js";
import type { MotifSource } from "../../src/engine/motifPlacement.js";
import type { SchematicGeometry } from "../../src/render/schematicGeometry.js";

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
  // With these numbers the layout works out to: centerBack=15, centerFront=43,
  // centerSleeve=64, yUnderarm=18, yWaist=26, yYokeEnd=18 (verified by hand
  // against the exact formulas in renderSchematicSvg).
  const gauge = { stitchesPer10cm: 10, rowsPer10cm: 10 };
  const chart: StitchChart = { rows: 1, cols: 1, cells: [["k"]] };

  it("embeds no motif group when the motif arguments are omitted (no regression)", () => {
    const svg = renderSchematicSvg(geometry);
    expect(svg).not.toContain("motif-tile");
  });

  it("embeds the motif in both back and front when the source is a body segment", () => {
    const motifSource: MotifSource = { segment: "bodyWaist", startRow: 3, rowCount: 4, stitches: 20 };
    const svg = renderSchematicSvg(geometry, chart, gauge, motifSource);

    expect(svg.match(/<g class="motif-tile"/g)).toHaveLength(2);
    expect(svg).toContain('<g class="motif-tile" transform="translate(10,20)">');
    expect(svg).toContain('<g class="motif-tile" transform="translate(38,20)">');
  });

  it("embeds the motif only once when the source is the sleeve segment", () => {
    const motifSource: MotifSource = { segment: "sleeve", startRow: 2, rowCount: 3, stitches: 8 };
    const svg = renderSchematicSvg(geometry, chart, gauge, motifSource);

    expect(svg.match(/<g class="motif-tile"/g)).toHaveLength(1);
    expect(svg).toContain('<g class="motif-tile" transform="translate(62,19)">');
  });

  it("embeds nothing when findMotifSource-style null is passed explicitly", () => {
    const svg = renderSchematicSvg(geometry, chart, gauge, null);
    expect(svg).not.toContain("motif-tile");
  });
});
```

Add `import type { StitchChart } from "../../src/render/stitchChart.js";` to the top of the test file alongside the other imports (it is not yet imported there).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/render/schematicSvg.test.ts`
Expected: the 4 new tests FAIL (TypeScript error / wrong arity) — `renderSchematicSvg` doesn't accept these parameters yet; all pre-existing tests in the file still PASS.

- [ ] **Step 3: Implement the embedding in `renderSchematicSvg`**

In `src/render/schematicSvg.ts`, add these imports at the top:

```ts
import { cmForRows, cmForStitches } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { StitchChart } from "./stitchChart.js";
import type { MotifSource } from "../engine/motifPlacement.js";
import { renderMotifTile } from "./motifTile.js";
```

Change the `renderSchematicSvg` signature and add the motif block right before the final `return [...]`:

```ts
export function renderSchematicSvg(
  geometry: SchematicGeometry,
  motifChart?: StitchChart,
  gauge?: Gauge,
  motifSource?: MotifSource | null
): string {
```

(leave everything from `const { back, front, sleeveLeft } = geometry;` down through `const sleevePoints = ...` untouched), then just before the final `return [...]` statement add:

```ts
  const motifParts: string[] = [];
  if (motifChart && gauge && motifSource) {
    const rowOffsetCm = cmForRows(gauge, motifSource.startRow - 1);
    const widthCm = cmForStitches(gauge, motifSource.stitches) / 2;

    if (motifSource.segment === "sleeve") {
      const yTop = yYokeEnd + rowOffsetCm;
      motifParts.push(
        renderMotifTile(
          motifChart,
          gauge,
          centerSleeve - widthCm / 2,
          yTop,
          motifSource.stitches,
          motifSource.rowCount
        )
      );
    } else {
      const phaseStartY = motifSource.segment === "bodyWaist" ? yUnderarm : yWaist;
      const yTop = phaseStartY + rowOffsetCm;
      motifParts.push(
        renderMotifTile(
          motifChart,
          gauge,
          centerBack - widthCm / 2,
          yTop,
          motifSource.stitches,
          motifSource.rowCount
        ),
        renderMotifTile(
          motifChart,
          gauge,
          centerFront - widthCm / 2,
          yTop,
          motifSource.stitches,
          motifSource.rowCount
        )
      );
    }
  }
```

Then change the final `return [...]` to splice `motifParts` in before the closing `</svg>` line:

```ts
  return [
    `<svg class="schematic" viewBox="0 0 ${formatCm(totalWidth)} ${formatCm(totalHeight)}" role="img" aria-label="Esquema simplificado de espalda, delantero y manga">`,
    `<text class="panel-title back" x="${formatCm(centerBack)}" y="${formatCm(y0 - 3)}">Espalda</text>`,
    `<polygon class="panel-fill back" points="${backPoints}"></polygon>`,
    `<text class="measure-label back" x="${formatCm(centerBack)}" y="${formatCm(y0 + 2)}">${formatCm(back.topWidthCm)}cm</text>`,
    `<text class="measure-label back" x="${formatCm(centerBack)}" y="${formatCm(yUnderarm - 1)}">${formatCm(back.underarmWidthCm)}cm</text>`,
    `<text class="measure-label back" x="${formatCm(centerBack)}" y="${formatCm(yWaist - 1)}">${formatCm(back.waistWidthCm)}cm</text>`,
    `<text class="measure-label back" x="${formatCm(centerBack)}" y="${formatCm(yHem - 1)}">${formatCm(back.hemWidthCm)}cm</text>`,
    `<text class="panel-title front" x="${formatCm(centerFront)}" y="${formatCm(y0 - 3)}">Delantero</text>`,
    `<polygon class="panel-fill front" points="${frontPoints}"></polygon>`,
    `<text class="measure-label front" x="${formatCm(centerFront)}" y="${formatCm(yJoin - 1)}">${formatCm(front.joinWidthCm)}cm</text>`,
    `<text class="measure-label front" x="${formatCm(centerFront)}" y="${formatCm(yUnderarm - 1)}">${formatCm(front.underarmWidthCm)}cm</text>`,
    `<text class="measure-label front" x="${formatCm(centerFront)}" y="${formatCm(yWaist - 1)}">${formatCm(front.waistWidthCm)}cm</text>`,
    `<text class="measure-label front" x="${formatCm(centerFront)}" y="${formatCm(yHem - 1)}">${formatCm(front.hemWidthCm)}cm</text>`,
    `<text class="panel-title sleeve" x="${formatCm(centerSleeve)}" y="${formatCm(y0 - 3)}">Manga</text>`,
    `<polygon class="panel-fill sleeve" points="${sleevePoints}"></polygon>`,
    `<text class="measure-label sleeve" x="${formatCm(centerSleeve)}" y="${formatCm(yYokeEnd - 1)}">${formatCm(sleeveLeft.bicepWidthCm)}cm</text>`,
    `<text class="measure-label sleeve" x="${formatCm(centerSleeve)}" y="${formatCm(yWrist - 1)}">${formatCm(sleeveLeft.wristWidthCm)}cm</text>`,
    `<line class="axila-line" x1="${formatCm(SIDE_MARGIN)}" y1="${formatCm(yUnderarm)}" x2="${formatCm(totalWidth - SIDE_MARGIN)}" y2="${formatCm(yUnderarm)}"></line>`,
    ...motifParts,
    `</svg>`,
  ].join("\n");
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/render/schematicSvg.test.ts`
Expected: PASS (all pre-existing tests + 4 new ones).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: both pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/render/schematicSvg.ts tests/render/schematicSvg.test.ts
git commit -m "Embed the stitch motif into renderSchematicSvg at its real flat-run position"
```

---

### Task 4: Wire the motif into the web tool

**Files:**
- Modify: `index.html`
- Modify: `src/web/app.ts`

**Interfaces:**
- Consumes: `findMotifSource` from `../engine/motifPlacement.js` (Task 1); the updated `renderSchematicSvg` signature (Task 3); the existing `currentChart`, `calculate()`, `renderChart()`, `setupChartEditor()` in `app.ts`.
- Produces: nothing new for other tasks to consume — this is the final integration point. Manual browser verification only (no Vitest coverage for this file, matching the rest of `src/web/app.ts`).

- [ ] **Step 1: Add CSS for the embedded motif cells**

In `index.html`, inside the existing `<style>` block, add these rules right after the existing `.axila-line` rule (around where `.chart-cell`/`.purl-mark`/`.cable-cross` are defined — keep the same visual language: surface/paper/electric fills, thin ink strokes scaled to the schematic's cm-based coordinate system rather than the chart editor's pixel-based one):

```css
.motif-cell { fill: var(--surface); stroke: var(--ink); stroke-width: 0.08; }
.motif-cell.p { fill: var(--paper); }
.motif-cell.cable-left { fill: var(--electric); }
.motif-cell.cable-right { fill: var(--electric-deep); }
.motif-purl-mark, .motif-cable-cross { stroke: var(--ink); stroke-width: 0.08; pointer-events: none; }
```

- [ ] **Step 2: Update `app.ts` imports and module-level state**

At the top of `src/web/app.ts`, add:

```ts
import { findMotifSource } from "../engine/motifPlacement.js";
```

and change the `import { computeGarmentPlan } from "../engine/garmentPlan.js";` line to also import the type:

```ts
import { computeGarmentPlan } from "../engine/garmentPlan.js";
import type { GarmentPlan } from "../engine/garmentPlan.js";
```

Add module-level state next to the existing `let currentChart: StitchChart = createBlankChart(7, 13);` line:

```ts
let lastPlan: GarmentPlan | null = null;
let lastGauge: Gauge | null = null;
```

- [ ] **Step 3: Update `calculate()` to compute and pass the motif**

In `calculate()`, replace:

```ts
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, constructionParams);
    const geometry = computeSchematicGeometry(plan, gauge);
    const svg = renderSchematicSvg(geometry);
    const instructions = renderInstructions(plan);
```

with:

```ts
    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, constructionParams);
    const geometry = computeSchematicGeometry(plan, gauge);
    const motifSource = findMotifSource(plan);
    const svg = renderSchematicSvg(geometry, currentChart, gauge, motifSource);
    const instructions = renderInstructions(plan);
```

Right after `resultBox.hidden = false;` (still inside the `try` block), add:

```ts
    lastPlan = plan;
    lastGauge = gauge;
```

In the `catch (error)` block, right after `resultBox.hidden = true;`, add:

```ts
    lastPlan = null;
    lastGauge = null;
```

- [ ] **Step 4: Add `refreshSchematicIfCalculated` and call it from the chart editor**

Add this new function right after `renderChart()`'s definition:

```ts
function refreshSchematicIfCalculated(): void {
  const resultBox = document.getElementById("result-box");
  const svgContainer = document.getElementById("svg-container");
  if (!resultBox || resultBox.hidden || !svgContainer || !lastPlan || !lastGauge) {
    return;
  }
  const geometry = computeSchematicGeometry(lastPlan, lastGauge);
  const motifSource = findMotifSource(lastPlan);
  svgContainer.innerHTML = renderSchematicSvg(geometry, currentChart, lastGauge, motifSource);
}
```

Then call it after every `renderChart();` inside `setupChartEditor()` — there are three call sites: the cell-click listener, the resize button's success path, and the preset button. Each becomes:

```ts
      rowCells[col] = nextSymbol(symbol);
      renderChart();
      refreshSchematicIfCalculated();
```

```ts
        currentChart = createBlankChart(rows, cols);
        renderChart();
        refreshSchematicIfCalculated();
```

```ts
      currentChart = createCrossPreset();
      renderChart();
      refreshSchematicIfCalculated();
```

(The initial `renderChart();` call at the very end of `setupChartEditor()` — before any calculation has happened — does NOT need `refreshSchematicIfCalculated()`, since `resultBox` is still hidden at that point and the guard would no-op anyway; leave it as-is.)

- [ ] **Step 5: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all existing tests still pass (this task adds no new Vitest coverage — `src/web/app.ts` has none, by established project convention).

- [ ] **Step 7: Manual browser verification**

Serve the built app locally (temporary `.claude/launch.json` pointing `npx http-server` or `python3 -m http.server` at the repo root, same as every prior web-tool verification this session) and in the browser:

1. Load the page with its default form values and click "Calcular". Confirm the schematic SVG now contains at least one `<g class="motif-tile">` element (inspect via `read_page`/`javascript_tool`, not just visually) — the default blank 7×13 all-knit chart will render as an unremarkable flat region, which is correct (not an error).
2. Click "Cargar cruz de ejemplo" in the stitch-chart editor. Confirm the schematic re-renders automatically (without clicking "Calcular" again) and now shows the cross motif's purl/cable pattern inside the highlighted rectangle.
3. Click a single cell in the chart editor to cycle its symbol. Confirm the schematic updates automatically to reflect that one changed cell, still without touching "Calcular".
4. Resize the chart editor's grid (e.g. to 5×5) and confirm the schematic updates automatically with the new (blank) motif tiled at its same real position.
5. Confirm no console errors appear during any of the above (`read_console_messages`).

Stop the preview server and delete the temporary `.claude/launch.json` afterward, same as every prior verification this session.

- [ ] **Step 8: Commit**

```bash
git add index.html src/web/app.ts
git commit -m "Wire the stitch motif into the web tool's schematic preview, with live refresh"
```
