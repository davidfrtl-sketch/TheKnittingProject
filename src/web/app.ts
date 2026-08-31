import { computeGarmentPlan } from "../engine/garmentPlan.js";
import type { GarmentPlan } from "../engine/garmentPlan.js";
import { findMotifSource } from "../engine/motifPlacement.js";
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
    const motifSource = findMotifSource(plan);
    const svg = renderSchematicSvg(geometry, currentChart, gauge, motifSource);
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
  const motifSource = findMotifSource(lastPlan);
  svgContainer.innerHTML = renderSchematicSvg(geometry, currentChart, lastGauge, motifSource);
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

setupChartEditor();
