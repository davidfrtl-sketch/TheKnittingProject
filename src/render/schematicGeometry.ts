import { cmForRows, cmForStitches } from "../domain/gauge.js";
import type { Gauge } from "../domain/gauge.js";
import type { GarmentPlan } from "../engine/garmentPlan.js";
import type { RaglanYokeRoundEvent } from "../engine/raglanYoke.js";

function isFrontJoinEvent(
  event: RaglanYokeRoundEvent
): event is Extract<RaglanYokeRoundEvent, { type: "frontJoin" }> {
  return event.type === "frontJoin";
}

export type PanelGeometry = {
  topWidthCm: number;
  underarmWidthCm: number;
  waistWidthCm: number;
  hemWidthCm: number;
  yokeHeightCm: number;
  waistLengthCm: number;
  hemLengthCm: number;
};

export type FrontGeometry = PanelGeometry & {
  joinHeightCm: number;
  joinWidthCm: number;
  joinBoundOnStitches: number;
};

export type SleeveGeometry = {
  topWidthCm: number;
  yokeEndWidthCm: number;
  bicepWidthCm: number;
  wristWidthCm: number;
  yokeHeightCm: number;
  taperLengthCm: number;
  axilaAdditionStitches: number;
  axilaAdditionCircumferenceCm: number;
};

export type SchematicGeometry = {
  back: PanelGeometry;
  front: FrontGeometry;
  sleeveLeft: SleeveGeometry;
  sleeveRight: SleeveGeometry;
};

function computeBackGeometry(plan: GarmentPlan, gauge: Gauge): PanelGeometry {
  return {
    topWidthCm: cmForStitches(gauge, plan.yoke.castOnBreakdown.back),
    underarmWidthCm: cmForStitches(
      gauge,
      plan.yoke.finalStitchCounts.back + plan.yoke.armpitShortfall.back
    ),
    // Tapers describe the combined body tube (back + front joined); one panel's flat width is half.
    // Unlike underarmWidthCm above, which reads a piece's own stitch count directly—back/front are separate flat panels, not a tube.
    waistWidthCm: cmForStitches(gauge, plan.bodyWaistTaper.finalStitches) / 2,
    hemWidthCm: cmForStitches(gauge, plan.bodyHemTaper.finalStitches) / 2,
    yokeHeightCm: cmForRows(gauge, plan.yoke.schedule.length),
    waistLengthCm: cmForRows(gauge, plan.bodyWaistTaper.schedule.length),
    hemLengthCm: cmForRows(gauge, plan.bodyHemTaper.schedule.length),
  };
}

function computeFrontGeometry(plan: GarmentPlan, gauge: Gauge, back: PanelGeometry): FrontGeometry {
  const joinRound = plan.yoke.schedule.find((round) => round.events.some(isFrontJoinEvent));
  const joinEvent = joinRound?.events.find(isFrontJoinEvent);

  if (!joinRound || !joinEvent) {
    throw new Error("No se encontró la ronda de unión del delantero en el cronograma del canesú.");
  }

  const frontState = joinRound.stitchCounts.front;
  if (frontState.open) {
    throw new Error("La ronda de unión del delantero no dejó al delantero unido.");
  }

  return {
    topWidthCm: cmForStitches(
      gauge,
      plan.yoke.castOnBreakdown.frontLeft + plan.yoke.castOnBreakdown.frontRight
    ),
    underarmWidthCm: back.underarmWidthCm,
    waistWidthCm: back.waistWidthCm,
    hemWidthCm: back.hemWidthCm,
    yokeHeightCm: back.yokeHeightCm,
    waistLengthCm: back.waistLengthCm,
    hemLengthCm: back.hemLengthCm,
    joinHeightCm: cmForRows(gauge, joinRound.roundNumber),
    joinWidthCm: cmForStitches(gauge, frontState.combined),
    joinBoundOnStitches: joinEvent.boundOnStitches,
  };
}

function computeSleeveGeometry(
  plan: GarmentPlan,
  gauge: Gauge,
  side: "sleeveLeft" | "sleeveRight"
): SleeveGeometry {
  const castOn = plan.yoke.castOnBreakdown[side];
  const yokeEnd = plan.yoke.finalStitchCounts[side];
  const axilaShortfall = plan.yoke.armpitShortfall[side];
  const bicepStart =
    side === "sleeveLeft"
      ? plan.axilaJoin.sleeveLeftStartStitches
      : plan.axilaJoin.sleeveRightStartStitches;
  const taper = side === "sleeveLeft" ? plan.sleeveLeftTaper : plan.sleeveRightTaper;

  // Sleeve stitch counts are full tube circumferences; flat width for drawing is circumference ÷ 2.
  // axilaAdditionCircumferenceCm is the raw circumference increase itself (not a flat width), so it stays undivided.
  return {
    topWidthCm: cmForStitches(gauge, castOn) / 2,
    yokeEndWidthCm: cmForStitches(gauge, yokeEnd) / 2,
    bicepWidthCm: cmForStitches(gauge, bicepStart) / 2,
    wristWidthCm: cmForStitches(gauge, taper.finalStitches) / 2,
    yokeHeightCm: cmForRows(gauge, plan.yoke.schedule.length),
    taperLengthCm: cmForRows(gauge, taper.schedule.length),
    axilaAdditionStitches: axilaShortfall,
    axilaAdditionCircumferenceCm: cmForStitches(gauge, axilaShortfall),
  };
}

export function computeSchematicGeometry(plan: GarmentPlan, gauge: Gauge): SchematicGeometry {
  const back = computeBackGeometry(plan, gauge);
  const front = computeFrontGeometry(plan, gauge, back);
  const sleeveLeft = computeSleeveGeometry(plan, gauge, "sleeveLeft");
  const sleeveRight = computeSleeveGeometry(plan, gauge, "sleeveRight");

  return { back, front, sleeveLeft, sleeveRight };
}
