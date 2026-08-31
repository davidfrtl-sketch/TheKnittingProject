# Fit/Length Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Fit" (Regular/Oversized) and "Largo" (Cropped/Regular/Long) preset selectors to the web tool that fill existing numeric ease/length inputs with standard values, with two-way sync (editing the numbers by hand updates the selector to match, or to "Personalizado" if nothing matches).

**Architecture:** Pure UI convenience layer in `src/web/app.ts` — no engine or domain changes. Named constants for each preset's values; explicit `if`/`else if` matching (no generic dictionary keyed by a cast string, to avoid any `as`).

**Tech Stack:** TypeScript (strict, NodeNext ESM, `noUncheckedIndexedAccess`), plain `tsc` web build (no bundler). No new Vitest coverage — matches `src/web/app.ts`'s existing convention (manual browser verification only).

## Global Constraints

- Every relative import uses an explicit `.js` extension.
- `noUncheckedIndexedAccess: true` — no `!`/`as` escapes anywhere.
- No comments unless they explain a non-obvious WHY.
- The preset values are fixed, named constants, never a generic `Record` keyed by a value cast from `select.value: string` back into a literal union type — that would require `as`.
- "Regular" for both presets must exactly match the form's current default values (`bodyEaseCm=8`, `sleeveEaseCm=6`, `hemLengthCm=12.14`) — selecting "Regular" on a freshly-loaded page must be a no-op.
- Assigning `.value` on an `<input>` via JavaScript does NOT fire that input's `change` event — this is what prevents the preset-selection flow from re-triggering the resync logic in a loop. Do not add any workaround for this; it is not needed.
- Design spec: `docs/superpowers/specs/2026-08-31-fit-length-presets-design.md` — read it for the full rationale and the exact code this plan transcribes.

---

### Task 1: Add the Fit/Length preset selectors

**Files:**
- Modify: `index.html`
- Modify: `src/web/app.ts`

**Interfaces:**
- Consumes: nothing new — reuses the existing `bodyEaseCm`/`sleeveEaseCm`/`hemLengthCm` `<input>` elements already in the form.
- Produces: nothing for other tasks to consume — this is a self-contained UI feature. Manual browser verification only.

- [ ] **Step 1: Add the new fieldset to `index.html`**

In `index.html`, insert this new `<fieldset>` between the existing "Gauge (por 10cm)" fieldset and the "Ease" fieldset:

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

- [ ] **Step 2: Add the CSS for `.preset-select`**

In `index.html`'s `<style>` block, add this rule right after the existing `label { ... }` rule:

```css
  .preset-select {
    font-family: var(--font-body);
    font-size: 14px;
    padding: 6px 8px;
    border-radius: 0;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
  }
```

- [ ] **Step 3: Add the preset constants and wiring to `app.ts`**

Add these constants right after the existing `import` block at the top of `src/web/app.ts` (before `function getNumberInput`):

```ts
const FIT_REGULAR = { bodyEaseCm: 8, sleeveEaseCm: 6 };
const FIT_OVERSIZED = { bodyEaseCm: 20, sleeveEaseCm: 14 };

const LENGTH_CROPPED = { hemLengthCm: 2 };
const LENGTH_REGULAR = { hemLengthCm: 12.14 };
const LENGTH_LONG = { hemLengthCm: 30 };
```

Add this function right after `getNumberInput`'s definition:

```ts
function setNumberInputValue(id: string, value: number): void {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement) {
    el.value = String(value);
  }
}
```

Add this function right after `setupChartEditor`'s definition (before the final `setupChartEditor();` call at the bottom of the file):

```ts
function setupPresetSelectors(): void {
  const fitSelect = document.getElementById("fit-preset-select");
  const lengthSelect = document.getElementById("length-preset-select");
  const bodyEaseInput = document.getElementById("bodyEaseCm");
  const sleeveEaseInput = document.getElementById("sleeveEaseCm");
  const hemLengthInput = document.getElementById("hemLengthCm");

  if (fitSelect instanceof HTMLSelectElement) {
    fitSelect.addEventListener("change", () => {
      if (fitSelect.value === "regular") {
        setNumberInputValue("bodyEaseCm", FIT_REGULAR.bodyEaseCm);
        setNumberInputValue("sleeveEaseCm", FIT_REGULAR.sleeveEaseCm);
      } else if (fitSelect.value === "oversized") {
        setNumberInputValue("bodyEaseCm", FIT_OVERSIZED.bodyEaseCm);
        setNumberInputValue("sleeveEaseCm", FIT_OVERSIZED.sleeveEaseCm);
      }
    });
  }

  if (lengthSelect instanceof HTMLSelectElement) {
    lengthSelect.addEventListener("change", () => {
      if (lengthSelect.value === "cropped") {
        setNumberInputValue("hemLengthCm", LENGTH_CROPPED.hemLengthCm);
      } else if (lengthSelect.value === "regular") {
        setNumberInputValue("hemLengthCm", LENGTH_REGULAR.hemLengthCm);
      } else if (lengthSelect.value === "long") {
        setNumberInputValue("hemLengthCm", LENGTH_LONG.hemLengthCm);
      }
    });
  }

  const resyncFit = (): void => {
    if (
      !(fitSelect instanceof HTMLSelectElement) ||
      !(bodyEaseInput instanceof HTMLInputElement) ||
      !(sleeveEaseInput instanceof HTMLInputElement)
    ) {
      return;
    }
    const bodyEaseCm = bodyEaseInput.valueAsNumber;
    const sleeveEaseCm = sleeveEaseInput.valueAsNumber;
    if (bodyEaseCm === FIT_REGULAR.bodyEaseCm && sleeveEaseCm === FIT_REGULAR.sleeveEaseCm) {
      fitSelect.value = "regular";
    } else if (bodyEaseCm === FIT_OVERSIZED.bodyEaseCm && sleeveEaseCm === FIT_OVERSIZED.sleeveEaseCm) {
      fitSelect.value = "oversized";
    } else {
      fitSelect.value = "custom";
    }
  };

  const resyncLength = (): void => {
    if (!(lengthSelect instanceof HTMLSelectElement) || !(hemLengthInput instanceof HTMLInputElement)) {
      return;
    }
    const hemLengthCm = hemLengthInput.valueAsNumber;
    if (hemLengthCm === LENGTH_CROPPED.hemLengthCm) {
      lengthSelect.value = "cropped";
    } else if (hemLengthCm === LENGTH_REGULAR.hemLengthCm) {
      lengthSelect.value = "regular";
    } else if (hemLengthCm === LENGTH_LONG.hemLengthCm) {
      lengthSelect.value = "long";
    } else {
      lengthSelect.value = "custom";
    }
  };

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

Add the call site right after the existing `setupChartEditor();` line at the very bottom of the file:

```ts
setupChartEditor();
setupPresetSelectors();
```

- [ ] **Step 4: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all existing tests still pass unchanged (this task adds no new Vitest coverage — `src/web/app.ts` has none, by established project convention, and no other file is touched).

- [ ] **Step 6: Manual browser verification**

Serve the built app locally (temporary `.claude/launch.json` or a plain `python3 -m http.server` from the repo root, same pattern as every prior web-tool verification) and in the browser:

1. Load the page with its default form values. Confirm both new selects show "Regular" selected, and confirm `bodyEaseCm`/`sleeveEaseCm`/`hemLengthCm` still read their original defaults (8/6/12.14) — selecting "Regular" that's already active should change nothing.
2. Change the Fit select to "Oversized". Confirm `bodyEaseCm` becomes `20` and `sleeveEaseCm` becomes `14`.
3. Change the Largo select to "Long". Confirm `hemLengthCm` becomes `30`.
4. Manually edit `bodyEaseCm` to some value that matches neither preset (e.g. `15`). Confirm the Fit select automatically switches to show "Personalizado".
5. Manually edit `bodyEaseCm` back to exactly `8` and `sleeveEaseCm` to exactly `6` (matching Regular again). Confirm the Fit select automatically switches back to "Regular".
6. Manually edit `hemLengthCm` to exactly `2`. Confirm the Largo select automatically switches to "Cropped".
7. Click "Calcular" with an Oversized/Long combination active and confirm the schematic still renders correctly (this exercises the exact same `getNumberInput` code path as before — the presets only ever write into the same inputs `calculate()` already reads).
8. Confirm no console errors appear during any of the above (`read_console_messages`).

Stop the preview server and delete any temporary `.claude/launch.json` afterward, same as every prior verification this session.

- [ ] **Step 7: Commit**

```bash
git add index.html src/web/app.ts
git commit -m "Add Fit/Length quick-preset selectors to the web tool"
```
