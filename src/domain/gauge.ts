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
