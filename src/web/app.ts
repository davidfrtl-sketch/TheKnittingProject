import { computeGarmentPlan } from "../engine/garmentPlan.js";
import { computeSchematicGeometry } from "../render/schematicGeometry.js";
import { renderSchematicSvg } from "../render/schematicSvg.js";
import { renderInstructions } from "../render/instructionsRenderer.js";
import type { Gauge } from "../domain/gauge.js";
import type { Ease } from "../domain/ease.js";
import type { GarmentMeasurements } from "../domain/measurements.js";
import type { NecklineParams } from "../domain/neckline.js";
import type { YokeConstructionParams } from "../domain/construction.js";

function getNumberInput(id: string): number {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`No se encontró el campo "${id}" en el formulario.`);
  }
  return el.valueAsNumber;
}

function calculate(): void {
  const errorBox = document.getElementById("error-box");
  const resultBox = document.getElementById("result-box");
  if (!errorBox || !resultBox) {
    return;
  }

  errorBox.hidden = true;
  errorBox.textContent = "";

  try {
    const gauge: Gauge = {
      stitchesPer10cm: getNumberInput("stitchesPer10cm"),
      rowsPer10cm: getNumberInput("rowsPer10cm"),
    };
    const ease: Ease = {
      bodyEaseCm: getNumberInput("bodyEaseCm"),
      sleeveEaseCm: getNumberInput("sleeveEaseCm"),
    };
    const measurements: GarmentMeasurements = {
      chestCm: getNumberInput("chestCm"),
      neckWidthBackCm: getNumberInput("neckWidthBackCm"),
      bicepCm: getNumberInput("bicepCm"),
      armholeDepthCm: getNumberInput("armholeDepthCm"),
      waistCm: getNumberInput("waistCm"),
      hipCm: getNumberInput("hipCm"),
      wristCm: getNumberInput("wristCm"),
      waistLengthCm: getNumberInput("waistLengthCm"),
      hemLengthCm: getNumberInput("hemLengthCm"),
      sleeveLengthCm: getNumberInput("sleeveLengthCm"),
    };
    const necklineParams: NecklineParams = {
      frontOpenRounds: getNumberInput("frontOpenRounds"),
      frontStartStitchesPerHalf: getNumberInput("frontStartStitchesPerHalf"),
      necklineIncreaseCadence: getNumberInput("necklineIncreaseCadence"),
    };
    const constructionParams: YokeConstructionParams = {
      initialSleeveStitchesPerSleeve: getNumberInput("initialSleeveStitchesPerSleeve"),
    };

    const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, constructionParams);
    const geometry = computeSchematicGeometry(plan, gauge);
    const svg = renderSchematicSvg(geometry);
    const instructions = renderInstructions(plan);

    const svgContainer = document.getElementById("svg-container");
    const instructionsContainer = document.getElementById("instructions-container");
    if (svgContainer) {
      svgContainer.innerHTML = svg;
    }
    if (instructionsContainer) {
      instructionsContainer.textContent = instructions;
    }

    resultBox.hidden = false;
  } catch (error) {
    resultBox.hidden = true;
    errorBox.hidden = false;
    errorBox.textContent = error instanceof Error ? error.message : String(error);
  }
}

const button = document.getElementById("calculate-button");
if (button) {
  button.addEventListener("click", calculate);
}
