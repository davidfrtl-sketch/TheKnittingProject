import { computeGarmentPlan } from "../engine/garmentPlan.js";
import type { GarmentPlan } from "../engine/garmentPlan.js";
import { computeBackMotifColumn } from "../engine/motifPlacement.js";
import { computeSchematicGeometry } from "../render/schematicGeometry.js";
import { renderSchematicSvg } from "../render/schematicSvg.js";
import { renderInstructions } from "../render/instructionsRenderer.js";
import type { Gauge } from "../domain/gauge.js";
import type { Ease } from "../domain/ease.js";
import type { GarmentMeasurements } from "../domain/measurements.js";
import type { NecklineParams } from "../domain/neckline.js";
import type { YokeConstructionParams } from "../domain/construction.js";
import { renderStitchChart } from "../render/stitchChart.js";
import type { StitchChart, StitchSymbol } from "../render/stitchChart.js";

const FIT_REGULAR = { bodyEaseCm: 8, sleeveEaseCm: 6 };
const FIT_OVERSIZED = { bodyEaseCm: 20, sleeveEaseCm: 14 };

const LENGTH_CROPPED = { hemLengthCm: 8 };
const LENGTH_REGULAR = { hemLengthCm: 12.14 };
const LENGTH_LONG = { hemLengthCm: 30 };

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

function getNumberInput(id: string): number {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`No se encontró el campo "${id}" en el formulario.`);
  }
  const value = el.valueAsNumber;
  if (!Number.isFinite(value)) {
    throw new Error(`El campo "${id}" debe tener un número válido.`);
  }
  return value;
}

function setNumberInputValue(id: string, value: number): void {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement) {
    el.value = String(value);
  }
}

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
    const motifColumn = computeBackMotifColumn(plan);
    const svg = renderSchematicSvg(geometry, currentChart, gauge, motifColumn);
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
    lastPlan = plan;
    lastGauge = gauge;
  } catch (error) {
    resultBox.hidden = true;
    lastPlan = null;
    lastGauge = null;
    errorBox.hidden = false;
    errorBox.textContent = error instanceof Error ? error.message : String(error);
  }
}

const button = document.getElementById("calculate-button");
if (button) {
  button.addEventListener("click", calculate);
}

const SYMBOL_CYCLE: StitchSymbol[] = ["k", "p", "cl", "cr"];

function nextSymbol(symbol: StitchSymbol): StitchSymbol {
  const index = SYMBOL_CYCLE.indexOf(symbol);
  const next = SYMBOL_CYCLE[(index + 1) % SYMBOL_CYCLE.length];
  return next ?? "k";
}

function createBlankChart(rows: number, cols: number): StitchChart {
  const cells: StitchSymbol[][] = [];
  for (let row = 0; row < rows; row++) {
    cells.push(Array.from({ length: cols }, (): StitchSymbol => "k"));
  }
  return { rows, cols, cells };
}

function createCrossPreset(): StitchChart {
  const size = 13;
  const chart = createBlankChart(size, size);
  const mid = Math.floor(size / 2);
  for (let row = 0; row < size; row++) {
    const rowCells = chart.cells[row];
    if (!rowCells) {
      continue;
    }
    for (let col = 0; col < size; col++) {
      if (row === mid || col === mid) {
        rowCells[col] = "p";
      }
    }
    if (row % 4 === 0) {
      rowCells[0] = "cl";
      rowCells[size - 4] = "cr";
    }
  }
  return chart;
}

let currentChart: StitchChart = createBlankChart(7, 13);
let lastPlan: GarmentPlan | null = null;
let lastGauge: Gauge | null = null;

function renderChart(): void {
  const container = document.getElementById("chart-container");
  if (container) {
    container.innerHTML = renderStitchChart(currentChart);
  }
}

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

function showChartError(error: unknown): void {
  const errorBox = document.getElementById("error-box");
  if (errorBox) {
    errorBox.hidden = false;
    errorBox.textContent = error instanceof Error ? error.message : String(error);
  }
}

function setupChartEditor(): void {
  const container = document.getElementById("chart-container");
  const resizeButton = document.getElementById("chart-resize-button");
  const presetButton = document.getElementById("chart-preset-button");

  if (container) {
    container.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const cell = target.closest("[data-row][data-col]");
      if (!(cell instanceof Element)) {
        return;
      }
      const row = Number(cell.getAttribute("data-row"));
      const col = Number(cell.getAttribute("data-col"));
      const rowCells = currentChart.cells[row];
      if (!rowCells) {
        return;
      }
      const symbol = rowCells[col];
      if (symbol === undefined) {
        return;
      }
      rowCells[col] = nextSymbol(symbol);
      renderChart();
      refreshSchematicIfCalculated();
    });
  }

  if (resizeButton) {
    resizeButton.addEventListener("click", () => {
      const errorBox = document.getElementById("error-box");
      if (errorBox) {
        errorBox.hidden = true;
        errorBox.textContent = "";
      }
      try {
        const rows = getNumberInput("chart-rows");
        const cols = getNumberInput("chart-cols");
        if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
          throw new Error("Filas y columnas deben ser números enteros positivos.");
        }
        currentChart = createBlankChart(rows, cols);
        renderChart();
        refreshSchematicIfCalculated();
      } catch (error) {
        showChartError(error);
      }
    });
  }

  if (presetButton) {
    presetButton.addEventListener("click", () => {
      currentChart = createCrossPreset();
      renderChart();
      refreshSchematicIfCalculated();
    });
  }

  renderChart();
}

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
}

setupChartEditor();
setupPresetSelectors();
