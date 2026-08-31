import type { PanelGeometry, FrontGeometry, SleeveGeometry, SchematicGeometry } from "./schematicGeometry.js";

const TOP_MARGIN = 8;
const SIDE_MARGIN = 4;
const GAP = 6;
const BOTTOM_MARGIN = 4;

function formatCm(value: number): string {
  return String(Number(value.toFixed(1)));
}

function panelPolygonPoints(
  center: number,
  panel: PanelGeometry,
  y0: number,
  yUnderarm: number,
  yWaist: number,
  yHem: number
): string {
  const points: [number, number][] = [
    [center - panel.topWidthCm / 2, y0],
    [center + panel.topWidthCm / 2, y0],
    [center + panel.underarmWidthCm / 2, yUnderarm],
    [center + panel.waistWidthCm / 2, yWaist],
    [center + panel.hemWidthCm / 2, yHem],
    [center - panel.hemWidthCm / 2, yHem],
    [center - panel.waistWidthCm / 2, yWaist],
    [center - panel.underarmWidthCm / 2, yUnderarm],
  ];
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function frontPolygonPoints(
  center: number,
  front: FrontGeometry,
  y0: number,
  yJoin: number,
  yUnderarm: number,
  yWaist: number,
  yHem: number
): string {
  const points: [number, number][] = [
    [center - front.topWidthCm / 2, y0],
    [center + front.topWidthCm / 2, y0],
    [center + front.joinWidthCm / 2, yJoin],
    [center + front.underarmWidthCm / 2, yUnderarm],
    [center + front.waistWidthCm / 2, yWaist],
    [center + front.hemWidthCm / 2, yHem],
    [center - front.hemWidthCm / 2, yHem],
    [center - front.waistWidthCm / 2, yWaist],
    [center - front.underarmWidthCm / 2, yUnderarm],
    [center - front.joinWidthCm / 2, yJoin],
  ];
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function sleevePolygonPoints(
  center: number,
  sleeve: SleeveGeometry,
  y0: number,
  yYokeEnd: number,
  yWrist: number
): string {
  const points: [number, number][] = [
    [center - sleeve.topWidthCm / 2, y0],
    [center + sleeve.topWidthCm / 2, y0],
    [center + sleeve.yokeEndWidthCm / 2, yYokeEnd],
    [center + sleeve.bicepWidthCm / 2, yYokeEnd],
    [center + sleeve.wristWidthCm / 2, yWrist],
    [center - sleeve.wristWidthCm / 2, yWrist],
    [center - sleeve.bicepWidthCm / 2, yYokeEnd],
    [center - sleeve.yokeEndWidthCm / 2, yYokeEnd],
  ];
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

export function renderSchematicSvg(geometry: SchematicGeometry): string {
  const { back, front, sleeveLeft } = geometry;

  const maxHalfBack =
    Math.max(back.topWidthCm, back.underarmWidthCm, back.waistWidthCm, back.hemWidthCm) / 2;
  const maxHalfFront =
    Math.max(
      front.topWidthCm,
      front.joinWidthCm,
      front.underarmWidthCm,
      front.waistWidthCm,
      front.hemWidthCm
    ) / 2;
  const maxHalfSleeve =
    Math.max(
      sleeveLeft.topWidthCm,
      sleeveLeft.yokeEndWidthCm,
      sleeveLeft.bicepWidthCm,
      sleeveLeft.wristWidthCm
    ) / 2;

  const backLeftEdge = SIDE_MARGIN;
  const centerBack = backLeftEdge + maxHalfBack;
  const backRightEdge = backLeftEdge + maxHalfBack * 2;

  const frontLeftEdge = backRightEdge + GAP;
  const centerFront = frontLeftEdge + maxHalfFront;
  const frontRightEdge = frontLeftEdge + maxHalfFront * 2;

  const sleeveLeftEdge = frontRightEdge + GAP;
  const centerSleeve = sleeveLeftEdge + maxHalfSleeve;
  const sleeveRightEdge = sleeveLeftEdge + maxHalfSleeve * 2;

  const totalWidth = sleeveRightEdge + SIDE_MARGIN;

  const y0 = TOP_MARGIN;
  const yUnderarm = y0 + back.yokeHeightCm;
  const yWaist = yUnderarm + back.waistLengthCm;
  const yHem = yWaist + back.hemLengthCm;
  const yJoin = y0 + front.joinHeightCm;
  const yYokeEnd = y0 + sleeveLeft.yokeHeightCm;
  const yWrist = yYokeEnd + sleeveLeft.taperLengthCm;

  const totalHeight = Math.max(yHem, yWrist) + BOTTOM_MARGIN;

  const backPoints = panelPolygonPoints(centerBack, back, y0, yUnderarm, yWaist, yHem);
  const frontPoints = frontPolygonPoints(centerFront, front, y0, yJoin, yUnderarm, yWaist, yHem);
  const sleevePoints = sleevePolygonPoints(centerSleeve, sleeveLeft, y0, yYokeEnd, yWrist);

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
    `</svg>`,
  ].join("\n");
}
