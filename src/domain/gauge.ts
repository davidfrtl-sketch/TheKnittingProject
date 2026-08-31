export type Gauge = {
  stitchesPer10cm: number;
  rowsPer10cm: number;
};

export function stitchesForCm(gauge: Gauge, cm: number): number {
  return Math.round((gauge.stitchesPer10cm / 10) * cm);
}

export function rowsForCm(gauge: Gauge, cm: number): number {
  return Math.round((gauge.rowsPer10cm / 10) * cm);
}

// Reverse of stitchesForCm/rowsForCm above: intentionally do NOT round. Going from many stitches/rows
// back to cm must preserve exact proportions for schematic drawing, not reintroduce rounding error.
export function cmForStitches(gauge: Gauge, stitches: number): number {
  return (stitches / gauge.stitchesPer10cm) * 10;
}

export function cmForRows(gauge: Gauge, rows: number): number {
  return (rows / gauge.rowsPer10cm) * 10;
}
