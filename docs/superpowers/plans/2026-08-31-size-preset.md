# Size Preset Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Talla" (S/M/L/XL) preset selector to the existing "Ajustes rápidos" fieldset, filling 9 body-measurement inputs from a standard size table, with the same two-way sync as the Fit/Largo presets already shipped.

**Architecture:** Extends the existing `setupPresetSelectors()` function in `src/web/app.ts` (added by the Fit/Length presets plan) — this is the same "presets in one fieldset" concern, not a new setup function. Named constants per size, explicit `if`/`else if` matching, no `as`/`!`.

**Tech Stack:** TypeScript (strict, NodeNext ESM, `noUncheckedIndexedAccess`), plain `tsc` web build (no bundler). No new Vitest coverage — matches `src/web/app.ts`'s existing convention (manual browser verification only).

## Global Constraints

- Every relative import uses an explicit `.js` extension.
- `noUncheckedIndexedAccess: true` — no `!`/`as` escapes anywhere.
- No comments unless they explain a non-obvious WHY.
- The size values are fixed, named constants (`SIZE_S`, `SIZE_M`, `SIZE_L`, `SIZE_XL`), never a generic `Record` keyed by a value cast from `select.value: string`.
- This selector NEVER touches `hemLengthCm` — that field is the exclusive domain of the existing "Largo" preset. The two selectors must never write to the same field.
- None of S/M/L/XL match the form's current default values exactly (unlike "Regular" in Fit/Largo) — the size select must start on "Personalizado" (`selected hidden` on that `<option>`).
- Design spec: `docs/superpowers/specs/2026-08-31-size-preset-design.md` — read it for the full rationale (which CYC columns map to which fields, and why the 3 non-standard fields — neck/wrist/waistLength — use a custom table anchored at M).

---

### Task 1: Add the Talla preset selector

**Files:**
- Modify: `index.html`
- Modify: `src/web/app.ts`

**Interfaces:**
- Consumes: the existing `setNumberInputValue` helper and `setupPresetSelectors()` function (both added by the Fit/Length presets plan, already merged to `main`).
- Produces: nothing for other tasks to consume — self-contained UI feature. Manual browser verification only.

- [ ] **Step 1: Add the third `<label>` to the "Ajustes rápidos" fieldset in `index.html`**

The fieldset currently reads (lines 230-248):

```html
    <fieldset>
      <legend>Ajustes rápidos</legend>
      <div class="field-grid">
        <label>Fit
          <select id="fit-preset-select" class="preset-select">
            <option value="regular" selected>Regular</option>
            <option value="oversized">Oversized</option>
            <option value="custom" hidden>Personalizado</option>
          </select>
        </label>
        <label>Largo
          <select id="length-preset-select" class="preset-select">
            <option value="cropped">Cropped</option>
            <option value="regular" selected>Regular</option>
            <option value="long">Long</option>
            <option value="custom" hidden>Personalizado</option>
          </select>
        </label>
      </div>
    </fieldset>
```

Add a third `<label>` right after the "Largo" one (still inside the same `<div class="field-grid">`, before its closing `</div>`):

```html
        <label>Talla
          <select id="size-preset-select" class="preset-select">
            <option value="s">S</option>
            <option value="m">M</option>
            <option value="l">L</option>
            <option value="xl">XL</option>
            <option value="custom" selected hidden>Personalizado</option>
          </select>
        </label>
```

No new CSS needed — it reuses the already-merged `.preset-select` class.

- [ ] **Step 2: Add the size constants to `src/web/app.ts`**

Add these right after the existing `LENGTH_LONG` constant (near the top of the file, alongside `FIT_REGULAR`/`FIT_OVERSIZED`/`LENGTH_CROPPED`/`LENGTH_REGULAR`/`LENGTH_LONG`):

```ts
const SIZE_S = {
  chestCm: 83.5, neckWidthBackCm: 15, bicepCm: 26, armholeDepthCm: 17,
  waistCm: 65.5, hipCm: 90.25, wristCm: 11, waistLengthCm: 14, sleeveLengthCm: 43,
};
const SIZE_M = {
  chestCm: 94, neckWidthBackCm: 16, bicepCm: 28, armholeDepthCm: 18.25,
  waistCm: 73.5, hipCm: 99, wristCm: 12, waistLengthCm: 15, sleeveLengthCm: 43,
};
const SIZE_L = {
  chestCm: 104, neckWidthBackCm: 17, bicepCm: 30.5, armholeDepthCm: 19.75,
  waistCm: 84, hipCm: 109, wristCm: 13.5, waistLengthCm: 16, sleeveLengthCm: 44.5,
};
const SIZE_XL = {
  chestCm: 114.5, neckWidthBackCm: 18, bicepCm: 34.5, armholeDepthCm: 21,
  waistCm: 94, hipCm: 119.25, wristCm: 15, waistLengthCm: 17, sleeveLengthCm: 44.5,
};

type SizePreset = typeof SIZE_S;
```

- [ ] **Step 3: Add `applySizePreset` and `matchesSizePreset` helper functions**

Add these right after `setNumberInputValue`'s definition:

```ts
function applySizePreset(size: SizePreset): void {
  setNumberInputValue("chestCm", size.chestCm);
  setNumberInputValue("neckWidthBackCm", size.neckWidthBackCm);
  setNumberInputValue("bicepCm", size.bicepCm);
  setNumberInputValue("armholeDepthCm", size.armholeDepthCm);
  setNumberInputValue("waistCm", size.waistCm);
  setNumberInputValue("hipCm", size.hipCm);
  setNumberInputValue("wristCm", size.wristCm);
  setNumberInputValue("waistLengthCm", size.waistLengthCm);
  setNumberInputValue("sleeveLengthCm", size.sleeveLengthCm);
}

function matchesSizePreset(
  size: SizePreset,
  chestCm: number,
  neckWidthBackCm: number,
  bicepCm: number,
  armholeDepthCm: number,
  waistCm: number,
  hipCm: number,
  wristCm: number,
  waistLengthCm: number,
  sleeveLengthCm: number
): boolean {
  return (
    size.chestCm === chestCm &&
    size.neckWidthBackCm === neckWidthBackCm &&
    size.bicepCm === bicepCm &&
    size.armholeDepthCm === armholeDepthCm &&
    size.waistCm === waistCm &&
    size.hipCm === hipCm &&
    size.wristCm === wristCm &&
    size.waistLengthCm === waistLengthCm &&
    size.sleeveLengthCm === sleeveLengthCm
  );
}
```

- [ ] **Step 4: Wire the Talla select inside the existing `setupPresetSelectors()`**

`setupPresetSelectors()` currently ends like this (the last lines of the function, right before its closing `}`):

```ts
  if (bodyEaseInput) {
    bodyEaseInput.addEventListener("change", resyncFit);
  }
  if (sleeveEaseInput) {
    sleeveEaseInput.addEventListener("change", resyncFit);
  }
  if (hemLengthInput) {
    hemLengthInput.addEventListener("change", resyncLength);
  }
}
```

Insert the following block right before that closing `}` (i.e., after the `if (hemLengthInput) { ... }` block, still inside `setupPresetSelectors()`):

```ts
  const sizeSelect = document.getElementById("size-preset-select");
  const chestInput = document.getElementById("chestCm");
  const neckInput = document.getElementById("neckWidthBackCm");
  const bicepInput = document.getElementById("bicepCm");
  const armholeInput = document.getElementById("armholeDepthCm");
  const waistInput = document.getElementById("waistCm");
  const hipInput = document.getElementById("hipCm");
  const wristInput = document.getElementById("wristCm");
  const waistLengthInput = document.getElementById("waistLengthCm");
  const sleeveLengthInput = document.getElementById("sleeveLengthCm");

  if (sizeSelect instanceof HTMLSelectElement) {
    sizeSelect.addEventListener("change", () => {
      if (sizeSelect.value === "s") {
        applySizePreset(SIZE_S);
      } else if (sizeSelect.value === "m") {
        applySizePreset(SIZE_M);
      } else if (sizeSelect.value === "l") {
        applySizePreset(SIZE_L);
      } else if (sizeSelect.value === "xl") {
        applySizePreset(SIZE_XL);
      }
    });
  }

  const resyncSize = (): void => {
    if (
      !(sizeSelect instanceof HTMLSelectElement) ||
      !(chestInput instanceof HTMLInputElement) ||
      !(neckInput instanceof HTMLInputElement) ||
      !(bicepInput instanceof HTMLInputElement) ||
      !(armholeInput instanceof HTMLInputElement) ||
      !(waistInput instanceof HTMLInputElement) ||
      !(hipInput instanceof HTMLInputElement) ||
      !(wristInput instanceof HTMLInputElement) ||
      !(waistLengthInput instanceof HTMLInputElement) ||
      !(sleeveLengthInput instanceof HTMLInputElement)
    ) {
      return;
    }
    const current: [number, number, number, number, number, number, number, number, number] = [
      chestInput.valueAsNumber,
      neckInput.valueAsNumber,
      bicepInput.valueAsNumber,
      armholeInput.valueAsNumber,
      waistInput.valueAsNumber,
      hipInput.valueAsNumber,
      wristInput.valueAsNumber,
      waistLengthInput.valueAsNumber,
      sleeveLengthInput.valueAsNumber,
    ];
    if (matchesSizePreset(SIZE_S, ...current)) {
      sizeSelect.value = "s";
    } else if (matchesSizePreset(SIZE_M, ...current)) {
      sizeSelect.value = "m";
    } else if (matchesSizePreset(SIZE_L, ...current)) {
      sizeSelect.value = "l";
    } else if (matchesSizePreset(SIZE_XL, ...current)) {
      sizeSelect.value = "xl";
    } else {
      sizeSelect.value = "custom";
    }
  };

  for (const input of [
    chestInput, neckInput, bicepInput, armholeInput,
    waistInput, hipInput, wristInput, waistLengthInput, sleeveLengthInput,
  ]) {
    if (input) {
      input.addEventListener("change", resyncSize);
    }
  }
```

- [ ] **Step 5: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all existing tests still pass unchanged (this task adds no new Vitest coverage — `src/web/app.ts` has none, by established project convention, and no other file is touched).

- [ ] **Step 7: Manual browser verification**

Serve the built app locally (temporary `.claude/launch.json` or a plain `python3 -m http.server` from the repo root, same pattern as every prior web-tool verification) and in the browser:

1. Load the page with its default form values. Confirm the Talla select shows "Personalizado" (since none of S/M/L/XL match the arbitrary current defaults).
2. Change the Talla select to "M". Confirm all 9 fields update to exactly: `chestCm=94`, `neckWidthBackCm=16`, `bicepCm=28`, `armholeDepthCm=18.25`, `waistCm=73.5`, `hipCm=99`, `wristCm=12`, `waistLengthCm=15`, `sleeveLengthCm=43`. Confirm `hemLengthCm` did NOT change.
3. Change the Talla select to "XL". Confirm all 9 fields update to the XL row from the spec's table.
4. Manually edit `chestCm` to some value that breaks the XL match (e.g. `100`). Confirm the Talla select automatically switches to "Personalizado".
5. Manually type all 9 "S" values back into their fields exactly (`chestCm=83.5`, `neckWidthBackCm=15`, `bicepCm=26`, `armholeDepthCm=17`, `waistCm=65.5`, `hipCm=90.25`, `wristCm=11`, `waistLengthCm=14`, `sleeveLengthCm=43`) one at a time. Confirm the Talla select only flips to "S" once the LAST field is corrected (i.e., confirm the match genuinely requires all 9 fields, not a subset).
6. With a size selected (e.g. "M"), click "Calcular" and confirm the schematic renders correctly with no errors.
7. Confirm no console errors appear during any of the above (`read_console_messages`).

Stop the preview server and delete any temporary `.claude/launch.json` afterward, same as every prior verification this session.

- [ ] **Step 8: Commit**

```bash
git add index.html src/web/app.ts
git commit -m "Add Talla (S/M/L/XL) preset selector using the CYC standard size chart"
```
