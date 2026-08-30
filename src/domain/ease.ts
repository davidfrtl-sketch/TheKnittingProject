// Categorías de ease/holgura del Craft Yarn Council (CYC), como referencia de
// etiquetas — no se aplican como enum, el valor real siempre es un cm fijo:
//   - muy ajustado (very close fitting): 0 cm o menos (holgura negativa)
//   - ajustado (close fitting): 0-5 cm
//   - clásico (classic fit): 5-10 cm
//   - holgado (loose fitting): 10-15 cm
//   - oversized (oversized): 15+ cm
export type Ease = {
  bodyEaseCm: number;
  sleeveEaseCm: number;
};
