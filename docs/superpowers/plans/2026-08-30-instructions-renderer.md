# Instructions Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `renderInstructions`, the function that converts a `GarmentPlan` into the final written knitting instructions (descriptive Spanish prose), per `docs/superpowers/specs/2026-08-30-instructions-renderer-design.md`.

**Architecture:** A single new file, `src/engine/instructionsRenderer.ts`, with one exported function (`renderInstructions`) built from small private per-section helpers (cast-on, yoke, axila join, and a generic taper-stage helper reused for all 4 shaping tramos). Everything is derived from the `GarmentPlan` object alone — no new inputs, no new calculation logic. Direction (increase/decrease) for each taper stage is inferred by comparing `TaperResult.finalStitches` against the start-stitch value already available elsewhere in `GarmentPlan` (never by modifying `taper.ts`).

**Tech Stack:** TypeScript (strict, ESM, NodeNext module resolution), Vitest.

## Global Constraints

- Module resolution is `NodeNext` — every relative import must include an explicit `.js` extension, for both type-only and value imports.
- No abbreviated notation (aum, pm, k1) and no repeat asterisks in this pass — plain descriptive Spanish prose only.
- No multi-size notation — this is single-size only (no grading exists yet).
- Round/row numbering restarts at 1 per section, matching how each engine already numbers its own `schedule` — do not renumber or offset anything.
- Derive everything from `plan` fields and from scanning `plan.yoke.schedule` — do not add new parameters to `renderInstructions`, and do not modify `raglanYoke.ts`, `axilaJoin.ts`, `taper.ts`, or `garmentPlan.ts`.
- After creating the new file, add its export to `src/engine/index.ts` (the existing barrel) in the same commit — every other engine module is listed there.
- Run `npm run typecheck` and `npm test` after the task, not just at the end.

---

### Task 1: `renderInstructions` with a golden-value regression test

**Files:**
- Create: `src/engine/instructionsRenderer.ts`
- Modify: `src/engine/index.ts` (add `export * from "./instructionsRenderer.js";`)
- Test: `tests/engine/instructionsRenderer.test.ts`

**Interfaces:**
- Consumes: `GarmentPlan` from `./garmentPlan.js`; `RaglanYokeRoundEvent` from `./raglanYoke.js`; `TaperResult` from `./taper.js`. All already exist — this task only reads them, never modifies them.
- Produces: `renderInstructions(plan: GarmentPlan): string`. This is the function a future preview/UI layer will call to get the final pattern text.

- [ ] **Step 1: Write the failing test**

Create `tests/engine/instructionsRenderer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderInstructions } from "../../src/engine/instructionsRenderer.js";
import { computeGarmentPlan } from "../../src/engine/garmentPlan.js";
import type { Gauge } from "../../src/domain/gauge.js";
import type { Ease } from "../../src/domain/ease.js";
import type { GarmentMeasurements } from "../../src/domain/measurements.js";
import type { NecklineParams } from "../../src/domain/neckline.js";
import type { YokeConstructionParams } from "../../src/domain/construction.js";

const gauge: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };
const ease: Ease = { bodyEaseCm: 8, sleeveEaseCm: 6 };
const measurements: GarmentMeasurements = {
  chestCm: 96,
  neckWidthBackCm: 16,
  bicepCm: 32,
  armholeDepthCm: 20,
  waistCm: 80,
  hipCm: 98,
  wristCm: 12,
  waistLengthCm: 15,
  hemLengthCm: 12.14,
  sleeveLengthCm: 42.14,
};
const necklineParams: NecklineParams = {
  frontOpenRounds: 12,
  frontStartStitchesPerHalf: 1,
  necklineIncreaseCadence: 1,
};
const construction: YokeConstructionParams = { initialSleeveStitchesPerSleeve: 8 };

describe("renderInstructions", () => {
  const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, construction);
  const text = renderInstructions(plan);

  it("describes the cast-on with the correct stitch counts", () => {
    expect(text).toContain("Montar 50 puntos en total");
    expect(text).toContain("32 para la espalda");
    expect(text).toContain("8 para la manga izquierda");
    expect(text).toContain("1 + 1 para el delantero");
    expect(text).toContain("8 para la manga derecha");
  });

  it("describes the raglan increase cadence and count", () => {
    expect(text).toContain("cada 2 rondas, 28 veces");
  });

  it("describes the neckline increase range and cadence", () => {
    expect(text).toContain("desde la ronda 1 hasta la ronda 12");
    expect(text).toContain("en cada ronda");
  });

  it("describes the front join with the exact round and stitch count", () => {
    expect(text).toContain("En la ronda 13: montar 8 puntos");
  });

  it("reports the yoke's final stitch counts", () => {
    expect(text).toContain(
      "espalda 88 puntos, delantero 90 puntos, manga izquierda 64 puntos, manga derecha 64 puntos"
    );
  });

  it("describes the axila join breakdown", () => {
    expect(text).toContain("montar 15 puntos en la axila izquierda (8 para la espalda + 7 para el delantero)");
    expect(text).toContain("15 puntos en la axila derecha (8 para la espalda + 7 para el delantero)");
    expect(text).toContain("Cuerpo: 208 puntos en total");
    expect(text).toContain("Manga izquierda: 76 puntos. Manga derecha: 76 puntos");
  });

  it("describes the waist taper with mixed cadence and direction", () => {
    expect(text).toContain("Cintura (fila de disminución, cada 2 filas, 6 veces, luego cada 3 filas, 10 veces)");
    expect(text).toContain("Resultado: 176 puntos");
  });

  it("describes the hip/hem taper with mixed cadence and direction", () => {
    expect(text).toContain(
      "Cadera / ruedo (fila de aumento, cada 1 fila, 2 veces, luego cada 2 filas, 16 veces)"
    );
    expect(text).toContain("Resultado: 212 puntos");
  });

  it("describes both sleeve tapers", () => {
    expect(text).toContain(
      "Manga izquierda (fila de disminución, cada 5 filas, 2 veces, luego cada 6 filas, 18 veces)"
    );
    expect(text).toContain(
      "Manga derecha (fila de disminución, cada 5 filas, 2 veces, luego cada 6 filas, 18 veces)"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/engine/instructionsRenderer.test.ts`
Expected: FAIL — `src/engine/instructionsRenderer.ts` does not exist yet (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/instructionsRenderer.ts`:

```ts
import type { GarmentPlan } from "./garmentPlan.js";
import type { RaglanYokeRoundEvent } from "./raglanYoke.js";
import type { TaperResult } from "./taper.js";

function isFrontJoinEvent(
  event: RaglanYokeRoundEvent
): event is Extract<RaglanYokeRoundEvent, { type: "frontJoin" }> {
  return event.type === "frontJoin";
}

function renderCastOnSection(plan: GarmentPlan): string {
  const { back, frontLeft, frontRight, sleeveLeft, sleeveRight } = plan.yoke.castOnBreakdown;
  const total = back + frontLeft + frontRight + sleeveLeft + sleeveRight;
  return (
    `Montar ${total} puntos en total: ${back} para la espalda, ${sleeveLeft} para la manga izquierda, ` +
    `${frontRight} + ${frontLeft} para el delantero (dos mitades separadas), ${sleeveRight} para la manga derecha. ` +
    `Unir la espalda y las mangas en redondo; el delantero se teje plano y dividido en dos mitades hasta la unión (ver más abajo).`
  );
}

function renderYokeSection(plan: GarmentPlan): string {
  const { schedule, finalStitchCounts } = plan.yoke;

  const raglanRounds = schedule.filter((round) =>
    round.events.some((event) => event.type === "raglanIncrease")
  ).length;

  const necklineRoundNumbers = schedule
    .filter((round) => round.events.some((event) => event.type === "necklineIncrease"))
    .map((round) => round.roundNumber);

  const joinRound = schedule.find((round) => round.events.some(isFrontJoinEvent));
  const joinEvent = joinRound?.events.find(isFrontJoinEvent);

  const lines: string[] = [];
  lines.push(
    `Ronda de aumento raglan (cada 2 rondas, ${raglanRounds} veces): en cada una de las 4 líneas ` +
      `raglan, aumentar 1 punto a cada lado del marcador.`
  );

  if (necklineRoundNumbers.length > 0) {
    const first = necklineRoundNumbers[0];
    const last = necklineRoundNumbers[necklineRoundNumbers.length - 1];
    const cadence =
      necklineRoundNumbers.length > 1 ? necklineRoundNumbers[1] - necklineRoundNumbers[0] : 1;
    const cadenceText = cadence === 1 ? "en cada ronda" : `cada ${cadence} rondas`;
    lines.push(
      `Al mismo tiempo, en el delantero: desde la ronda ${first} hasta la ronda ${last}, ${cadenceText}, ` +
        `aumentar 1 punto en cada borde interior del escote.`
    );
  }

  if (joinRound && joinEvent) {
    lines.push(
      `En la ronda ${joinRound.roundNumber}: montar ${joinEvent.boundOnStitches} puntos para unir las ` +
        `dos mitades del delantero en una sola pieza.`
    );
  }

  lines.push(
    `Resultado del canesú: espalda ${finalStitchCounts.back} puntos, delantero ${finalStitchCounts.front} ` +
      `puntos, manga izquierda ${finalStitchCounts.sleeveLeft} puntos, manga derecha ` +
      `${finalStitchCounts.sleeveRight} puntos.`
  );

  return lines.join("\n");
}

function renderAxilaSection(plan: GarmentPlan): string {
  const { left, right } = plan.axilaJoin.castOnPerAxila;
  return (
    `Al separar el cuerpo de las mangas: montar ${left.total} puntos en la axila izquierda ` +
      `(${left.back} para la espalda + ${left.front} para el delantero) y ${right.total} puntos en la ` +
      `axila derecha (${right.back} para la espalda + ${right.front} para el delantero).\n` +
      `Cuerpo: ${plan.axilaJoin.bodyStartStitches} puntos en total, tejido en redondo como una sola pieza.\n` +
      `Manga izquierda: ${plan.axilaJoin.sleeveLeftStartStitches} puntos. Manga derecha: ` +
      `${plan.axilaJoin.sleeveRightStartStitches} puntos.`
  );
}

function formatCadencePart(cadenceRows: number, eventCount: number): string {
  const rowsWord = cadenceRows === 1 ? "fila" : "filas";
  const timesWord = eventCount === 1 ? "vez" : "veces";
  return `cada ${cadenceRows} ${rowsWord}, ${eventCount} ${timesWord}`;
}

function renderTaperStage(label: string, startStitches: number, taper: TaperResult): string {
  if (taper.events === 0) {
    return (
      `${label}: sin cambios, se sigue tejiendo derecho durante ${taper.schedule.length} filas. ` +
      `Resultado: ${taper.finalStitches} puntos.`
    );
  }

  const isIncrease = taper.finalStitches > startStitches;
  const direction = isIncrease ? "aumento" : "disminución";
  const verb = isIncrease ? "aumentar" : "disminuir";

  const cadenceParts: string[] = [];
  if (taper.reducedCadenceEventCount > 0) {
    cadenceParts.push(formatCadencePart(taper.reducedCadence, taper.reducedCadenceEventCount));
  }
  cadenceParts.push(formatCadencePart(taper.primaryCadence, taper.primaryCadenceEventCount));

  return (
    `${label} (fila de ${direction}, ${cadenceParts.join(", luego ")}): ${verb} 2 puntos (1 a cada lado). ` +
    `Resultado: ${taper.finalStitches} puntos.`
  );
}

export function renderInstructions(plan: GarmentPlan): string {
  const sections = [
    renderCastOnSection(plan),
    renderYokeSection(plan),
    renderAxilaSection(plan),
    renderTaperStage("Cintura", plan.axilaJoin.bodyStartStitches, plan.bodyWaistTaper),
    renderTaperStage("Cadera / ruedo", plan.bodyWaistTaper.finalStitches, plan.bodyHemTaper),
    renderTaperStage("Manga izquierda", plan.axilaJoin.sleeveLeftStartStitches, plan.sleeveLeftTaper),
    renderTaperStage("Manga derecha", plan.axilaJoin.sleeveRightStartStitches, plan.sleeveRightTaper),
  ];
  return sections.join("\n\n");
}
```

Then add the barrel export. Open `src/engine/index.ts` and add:

```ts
export * from "./instructionsRenderer.js";
```

alongside its existing lines (`axilaJoin.js`, `garmentPlan.js`, `raglanIncrease.js`, `raglanYoke.js`, `taper.js`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/engine/instructionsRenderer.test.ts`
Expected: PASS (9 tests).

Then run: `npm run typecheck`
Expected: no errors.

Then run the full suite to make sure nothing regressed: `npm test`
Expected: all tests pass (this task's 9 tests plus every existing test).

- [ ] **Step 5: Commit**

```bash
git add src/engine/instructionsRenderer.ts src/engine/index.ts tests/engine/instructionsRenderer.test.ts
git commit -m "Add written instructions renderer for GarmentPlan"
```

---

## Self-Review Notes

- **Spec coverage:** Cast-on section, yoke section (raglan cadence derived from the schedule, neckline range/cadence derived from the schedule, join line, final counts), axila section, and the shared taper-stage template (mixed-cadence formatting, direction inferred from `GarmentPlan` fields, the `events === 0` edge case) are all implemented and covered by the test. The spec's explicitly-out-of-scope items (abbreviated notation, repeat asterisks, multi-size, graphic renderer, cable motif) have no corresponding code, correctly.
- **Placeholder scan:** No TBD/TODO. Every string template is written out in full with the exact wording verified against the spec's worked example — no "format appropriately" hand-waving.
- **Type consistency:** `renderInstructions(plan: GarmentPlan): string` matches the spec's signature exactly. The `isFrontJoinEvent` type predicate uses `Extract<RaglanYokeRoundEvent, { type: "frontJoin" }>`, matching the exact union member shape already defined in `raglanYoke.ts` (a `frontJoin` event has `type` and `boundOnStitches`). All field names read from `plan` (`castOnBreakdown`, `finalStitchCounts`, `castOnPerAxila`, `bodyStartStitches`, `sleeveLeftStartStitches`/`sleeveRightStartStitches`, `bodyWaistTaper`/`bodyHemTaper`/`sleeveLeftTaper`/`sleeveRightTaper`, and `TaperResult`'s `events`/`primaryCadence`/`reducedCadence`/`primaryCadenceEventCount`/`reducedCadenceEventCount`/`finalStitches`/`schedule`) match the already-implemented types exactly — this task reads them, it does not redefine them.
