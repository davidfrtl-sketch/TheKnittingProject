import type { GarmentPlan } from "../engine/garmentPlan.js";
import type { RaglanYokeRoundEvent } from "../engine/raglanYoke.js";
import type { TaperResult } from "../engine/taper.js";

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
  const joinEvent = joinRound ? joinRound.events.find(isFrontJoinEvent) : undefined;

  const lines: string[] = [];
  lines.push(
    `Ronda de aumento raglan (cada 2 rondas, ${raglanRounds} veces): en cada una de las 4 líneas ` +
      `raglan, aumentar 1 punto a cada lado del marcador.`
  );

  if (necklineRoundNumbers.length > 0) {
    const first = necklineRoundNumbers[0]!;
    const last = necklineRoundNumbers[necklineRoundNumbers.length - 1]!;
    const cadence =
      necklineRoundNumbers.length > 1 ? necklineRoundNumbers[1]! - necklineRoundNumbers[0]! : 1;
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
    const rowCount = taper.schedule.length;
    const rowsWord = rowCount === 1 ? "fila" : "filas";
    return (
      `${label}: sin cambios, se sigue tejiendo derecho durante ${rowCount} ${rowsWord}. ` +
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

function renderHemFinishSection(plan: GarmentPlan): string | null {
  if (!plan.hemFinish) {
    return null;
  }
  const { structure, rows } = plan.hemFinish;
  const stitches = plan.bodyHemTaper.finalStitches;
  const patternText = structure === "1x1" ? "*1 derecho, 1 revés*" : "*2 derecho, 2 revés*";
  const rowsWord = rows === 1 ? "vuelta" : "vueltas";
  return (
    `Canalé ${structure} (${stitches} puntos, ${rows} ${rowsWord}): ${patternText}, repetir hasta el final. ` +
    `Cerrar puntos.`
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
  const hemFinishSection = renderHemFinishSection(plan);
  if (hemFinishSection) {
    sections.push(hemFinishSection);
  }
  return sections.join("\n\n");
}
