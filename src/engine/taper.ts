export type TaperRow = {
  rowNumber: number;
  isShapingRow: boolean;
  stitches: number;
};

export type TaperResult = {
  schedule: TaperRow[];
  finalStitches: number;
  events: number;
  primaryCadence: number;
  reducedCadence: number;
  primaryCadenceEventCount: number;
  reducedCadenceEventCount: number;
};

export function computeTaper(
  startStitches: number,
  endStitches: number,
  availableRows: number
): TaperResult {
  const totalStitchChange = endStitches - startStitches;

  if (totalStitchChange % 2 !== 0) {
    throw new Error(
      `El cambio de puntos debe ser par para un reparto simétrico (2 puntos por evento): ` +
        `se pidió pasar de ${startStitches} a ${endStitches} (diferencia de ${totalStitchChange}).`
    );
  }

  const events = Math.abs(totalStitchChange) / 2;

  if (events === 0) {
    const schedule: TaperRow[] = [];
    for (let rowNumber = 1; rowNumber <= availableRows; rowNumber++) {
      schedule.push({ rowNumber, isShapingRow: false, stitches: startStitches });
    }
    return {
      schedule,
      finalStitches: startStitches,
      events: 0,
      primaryCadence: 0,
      reducedCadence: 0,
      primaryCadenceEventCount: 0,
      reducedCadenceEventCount: 0,
    };
  }

  if (events > availableRows) {
    throw new Error(
      `No alcanzan las filas disponibles para completar el entallado: se necesitan ${events} ` +
        `eventos de cambio pero solo hay ${availableRows} filas disponibles (ni siquiera "cada fila" alcanza).`
    );
  }

  const direction = totalStitchChange > 0 ? 1 : -1;
  const primaryCadence = Math.ceil(availableRows / events);
  // reducedCadence can be 0 (when events === availableRows, every row is a shaping row),
  // but that's harmless: reducedCadenceEventCount is always 0 in that same case, so
  // cadenceForEvent below never actually returns 0 as a cadence to step by.
  const reducedCadence = primaryCadence - 1;
  const reducedCadenceEventCount = events * primaryCadence - availableRows;
  const primaryCadenceEventCount = events - reducedCadenceEventCount;

  const cadenceForEvent = (eventIndex: number): number =>
    eventIndex < reducedCadenceEventCount ? reducedCadence : primaryCadence;

  const schedule: TaperRow[] = [];
  let stitches = startStitches;
  let eventIndex = 0;
  let nextShapingRow = cadenceForEvent(0);

  for (let rowNumber = 1; rowNumber <= availableRows; rowNumber++) {
    const isShapingRow = eventIndex < events && rowNumber === nextShapingRow;
    if (isShapingRow) {
      stitches += direction * 2;
      eventIndex += 1;
      if (eventIndex < events) {
        nextShapingRow += cadenceForEvent(eventIndex);
      }
    }
    schedule.push({ rowNumber, isShapingRow, stitches });
  }

  return {
    schedule,
    finalStitches: stitches,
    events,
    primaryCadence,
    reducedCadence,
    primaryCadenceEventCount,
    reducedCadenceEventCount,
  };
}
