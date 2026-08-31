# Motif Segment Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the automatic "longest run wins" motif-segment selection (shipped in the previous plan) with manual selection: the user sees every usable segment (cintura/cadera/manga) and picks one, with the longest preselected by default.

**Architecture:** `findMotifSource` (returns one winner) is replaced by `findMotifCandidates` (returns all usable candidates, sorted). `renderSchematicSvg`'s signature does NOT change — it already accepts an arbitrary `MotifSource | null`. The only new work is: the engine function returning a list instead of a single winner, and `app.ts`/`index.html` gaining a `<select>` that lets the user choose which candidate to pass into the unchanged renderer.

**Tech Stack:** TypeScript (strict, NodeNext ESM, `noUncheckedIndexedAccess`), Vitest, plain `tsc` web build (no bundler).

## Global Constraints

- Every relative import uses an explicit `.js` extension (NodeNext resolution).
- `noUncheckedIndexedAccess: true` — every array index read must be guarded (undefined check, early continue/return, or `??`). Never use `!` or `as`.
- No comments unless they explain a non-obvious WHY.
- `findMotifSource` is REMOVED entirely (not deprecated, not kept as a wrapper) — replaced by `findMotifCandidates`. Delete dead code completely rather than leaving a backwards-compatibility shim.
- `renderSchematicSvg`'s signature and behavior are UNCHANGED by this plan — do not touch `src/render/schematicSvg.ts` or `src/render/motifTile.ts`.
- Design spec: `docs/superpowers/specs/2026-08-31-motif-segment-picker-design.md` — read it for the full rationale (why `Array.prototype.sort` stability is what preserves the old tie-break priority, the exact `<select>` option format, and why `refreshSchematicIfCalculated` must NOT recompute candidates).

---

### Task 1: `findMotifCandidates` — replace the single-winner picker

**Files:**
- Modify: `src/engine/motifPlacement.ts` (full-file replacement of its exported function)
- Modify: `tests/engine/motifPlacement.test.ts` (full-file replacement)
- Modify: `tests/render/schematicSvg.test.ts` (2-line change, see Step 5)

**Interfaces:**
- Consumes: `TaperRow` from `./taper.js`; `GarmentPlan` from `./garmentPlan.js` (unchanged).
- Produces: `findMotifCandidates(plan: MotifPlacementInput): MotifSource[]` — replaces `findMotifSource`. `MotifSegment`, `MotifSource`, `MotifPlacementInput` types are UNCHANGED (same shape as before). Task 2 calls `findMotifCandidates(plan)` and uses `candidates[0]` as the default selection.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `tests/engine/motifPlacement.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { findMotifCandidates } from "../../src/engine/motifPlacement.js";
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

describe("findMotifCandidates", () => {
  it("returns all three usable candidates sorted by rowCount descending", () => {
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

    expect(findMotifCandidates(plan)).toEqual([
      { segment: "bodyWaist", startRow: 3, rowCount: 3, stitches: 98 },
      { segment: "bodyHem", startRow: 2, rowCount: 2, stitches: 82 },
      { segment: "sleeve", startRow: 1, rowCount: 2, stitches: 40 },
    ]);
  });

  it("keeps stable insertion order (bodyWaist, bodyHem, sleeve) among equal-length candidates", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 10), makeRow(2, 12), makeRow(3, 12), makeRow(4, 14)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 22), makeRow(4, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 5), makeRow(2, 6), makeRow(3, 6), makeRow(4, 7)]),
    };

    expect(findMotifCandidates(plan)).toEqual([
      { segment: "bodyWaist", startRow: 2, rowCount: 2, stitches: 12 },
      { segment: "bodyHem", startRow: 2, rowCount: 2, stitches: 22 },
      { segment: "sleeve", startRow: 2, rowCount: 2, stitches: 6 },
    ]);
  });

  it("excludes phases with no usable run, keeping only the qualifying ones", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 5), makeRow(2, 5), makeRow(3, 5)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 1), makeRow(2, 2), makeRow(3, 3)]),
    };

    expect(findMotifCandidates(plan)).toEqual([
      { segment: "bodyWaist", startRow: 1, rowCount: 3, stitches: 5 },
    ]);
  });

  it("returns an empty array when no phase has any 2-row plateau", () => {
    const plan: MotifPlacementInput = {
      bodyWaistTaper: makeTaper([makeRow(1, 10), makeRow(2, 12), makeRow(3, 14)]),
      bodyHemTaper: makeTaper([makeRow(1, 20), makeRow(2, 22), makeRow(3, 24)]),
      sleeveLeftTaper: makeTaper([makeRow(1, 5), makeRow(2, 6), makeRow(3, 7)]),
    };

    expect(findMotifCandidates(plan)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/motifPlacement.test.ts`
Expected: FAIL — `findMotifCandidates` does not exist yet (only `findMotifSource` does).

- [ ] **Step 3: Replace `findMotifSource` with `findMotifCandidates`**

Replace the entire contents of `src/engine/motifPlacement.ts` with:

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
      current = {
        startRow: current.startRow,
        rowCount: current.rowCount + 1,
        stitches: current.stitches,
      };
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

export function findMotifCandidates(plan: MotifPlacementInput): MotifSource[] {
  const scheduleBySegment: Record<MotifSegment, TaperRow[]> = {
    bodyWaist: plan.bodyWaistTaper.schedule,
    bodyHem: plan.bodyHemTaper.schedule,
    sleeve: plan.sleeveLeftTaper.schedule,
  };

  const candidates: Array<{ segment: MotifSegment; run: Run }> = [];
  for (const segment of SEGMENT_ORDER) {
    const run = longestRun(scheduleBySegment[segment]);
    if (run && run.rowCount > 1) {
      candidates.push({ segment, run });
    }
  }

  candidates.sort((a, b) => b.run.rowCount - a.run.rowCount);

  return candidates.map(({ segment, run }) => ({
    segment,
    startRow: run.startRow,
    rowCount: run.rowCount,
    stitches: run.stitches,
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/engine/motifPlacement.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Update the one other test file that referenced `findMotifSource`**

`tests/render/schematicSvg.test.ts` has an end-to-end test that calls the old function. Change its import line (currently `import { findMotifSource } from "../../src/engine/motifPlacement.js";`) to:

```ts
import { findMotifCandidates } from "../../src/engine/motifPlacement.js";
```

And inside the test `"keeps the motif tile within the sleeve panel's real edges (end-to-end with a real GarmentPlan)"`, change:

```ts
    const realMotifSource = findMotifSource(realPlan);
    if (!realMotifSource) {
      throw new Error("Expected findMotifSource to return a result for this fixture's real plan.");
    }
```

to:

```ts
    const realMotifSource = findMotifCandidates(realPlan)[0];
    if (!realMotifSource) {
      throw new Error("Expected findMotifCandidates to return at least one candidate for this fixture's real plan.");
    }
```

The rest of that test (the `expect(realMotifSource).toEqual(...)` and everything after it) stays exactly as-is — this fixture's real plan has sleeve as the only-longest candidate (rowCount 6, vs. 3 and 2 for the body phases), so `findMotifCandidates(realPlan)[0]` equals what `findMotifSource(realPlan)` used to return.

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: both pass, no regressions (64 tests, same count as before — this task only renames/restructures, it doesn't add or remove test cases in `schematicSvg.test.ts`, and replaces 3 tests with 4 in `motifPlacement.test.ts`).

- [ ] **Step 7: Commit**

```bash
git add src/engine/motifPlacement.ts tests/engine/motifPlacement.test.ts tests/render/schematicSvg.test.ts
git commit -m "Replace findMotifSource with findMotifCandidates: list all usable motif segments"
```

---

### Task 2: manual segment picker in the web tool

**Files:**
- Modify: `index.html`
- Modify: `src/web/app.ts`

**Interfaces:**
- Consumes: `findMotifCandidates` from `../engine/motifPlacement.js` (Task 1); `MotifSource`, `MotifSegment` types from the same module; the existing (unchanged) `renderSchematicSvg`, `computeSchematicGeometry`, `calculate()`, `refreshSchematicIfCalculated()`.
- Produces: nothing new for other tasks to consume — this is the final integration point. Manual browser verification only (no Vitest coverage for `src/web/app.ts`, matching this file's established convention).

- [ ] **Step 1: Add the `<select>` markup to `index.html`**

Inside the `<div id="result-box" hidden>` block, in the "Esquema" `result-card` (the one currently containing just `<h2>Esquema</h2>` and `<div id="svg-container"></div>`), add the new wrapper right before `<div id="svg-container"></div>`:

```html
      <div id="motif-select-wrapper" hidden>
        <label for="motif-segment-select">Motivo en:</label>
        <select id="motif-segment-select"></select>
      </div>
```

So that `result-card` becomes:

```html
    <div class="result-card">
      <h2>Esquema</h2>
      <div id="motif-select-wrapper" hidden>
        <label for="motif-segment-select">Motivo en:</label>
        <select id="motif-segment-select"></select>
      </div>
      <div id="svg-container"></div>
    </div>
```

- [ ] **Step 2: Add CSS for the new select**

In `index.html`'s `<style>` block, add these rules right before the existing `#svg-container { ... }` rule:

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

- [ ] **Step 3: Update `app.ts`'s imports**

Change:

```ts
import { findMotifSource } from "../engine/motifPlacement.js";
```

to:

```ts
import { findMotifCandidates } from "../engine/motifPlacement.js";
import type { MotifSource, MotifSegment } from "../engine/motifPlacement.js";
```

- [ ] **Step 4: Add module-level state and the label map**

Right after the existing `let lastGauge: Gauge | null = null;` line, add:

```ts
let motifCandidates: MotifSource[] = [];
let selectedMotifSource: MotifSource | null = null;
```

Right after `renderChart()`'s function definition (before `refreshSchematicIfCalculated`), add:

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

- [ ] **Step 5: Update `calculate()` to populate candidates instead of auto-picking one**

Replace:

```ts
    const motifSource = findMotifSource(plan);
    const svg = renderSchematicSvg(geometry, currentChart, gauge, motifSource);
```

with:

```ts
    const candidates = findMotifCandidates(plan);
    motifCandidates = candidates;
    const firstCandidate = candidates[0];
    selectedMotifSource = firstCandidate ?? null;
    populateMotifSelect(candidates);
    const svg = renderSchematicSvg(geometry, currentChart, gauge, selectedMotifSource);
```

In the `catch (error)` block, right after the existing `lastPlan = null; lastGauge = null;` lines, add:

```ts
    motifCandidates = [];
    selectedMotifSource = null;
    populateMotifSelect([]);
```

- [ ] **Step 6: Update `refreshSchematicIfCalculated` to stop recomputing candidates**

Replace its body (currently calling `findMotifSource(lastPlan)`):

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

with:

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

- [ ] **Step 7: Wire the `<select>`'s change listener**

Add this new function right after `setupChartEditor()`'s definition:

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

Then, at the very bottom of the file, right after the existing `setupChartEditor();` call, add:

```ts
setupMotifSelect();
```

- [ ] **Step 8: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 9: Run the full test suite**

Run: `npm test`
Expected: all existing tests still pass (this task adds no new Vitest coverage — `src/web/app.ts` has none, by established project convention).

- [ ] **Step 10: Manual browser verification**

Serve the built app locally (temporary `.claude/launch.json` or a plain `python3 -m http.server` from the repo root, same pattern as every prior web-tool verification) and in the browser:

1. Load the page with its default form values and click "Calcular". Confirm `#motif-select-wrapper` is visible and `#motif-segment-select` has exactly 3 `<option>` elements (with this fixture's default measurements, all three phases — cintura, cadera, manga — have a usable run), and that the select's initial value is `"sleeve"` (the longest, per the plan's own hand-verified numbers: 6 rows for the sleeve vs. 3 for cintura and 2 for cadera).
2. Confirm the schematic shows exactly 1 `motif-tile` group (sleeve only).
3. Change the select to "Cintura". Confirm the schematic re-renders immediately with 2 `motif-tile` groups (back + front), without touching "Calcular".
4. With "Cintura" still selected, click a cell in the stitch-chart editor to change a symbol. Confirm the schematic updates live AND stays on the cintura segment (does not silently revert to "Manga").
5. Click "Calcular" again (same values). Confirm the select resets to `"sleeve"` (the default) rather than remembering the previous "Cintura" choice — this is the explicit, intentional behavior from this plan.
6. Confirm no console errors appear during any of the above (`read_console_messages`).

Stop the preview server and delete any temporary `.claude/launch.json` afterward, same as every prior verification this session.

- [ ] **Step 11: Commit**

```bash
git add index.html src/web/app.ts
git commit -m "Let the user manually pick which segment gets the stitch motif"
```
