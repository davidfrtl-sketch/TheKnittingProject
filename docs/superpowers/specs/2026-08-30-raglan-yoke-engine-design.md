# Diseño: modelo de datos y motor de canesú raglan (escote crew), una talla

Fecha: 2026-08-30

## Objetivo

Implementar el primer recorte real de lógica de dominio: el modelo de datos
base y el motor de cálculo del canesú raglan con escote crew, para una sola
talla/gauge. Referencia: `docs/tejido-y-patronaje.md`, secciones 7-9 y 12-13.

## Alcance

Incluido:
- Modelo de datos: `Gauge`, `Ease`, `YokeMeasurements`, `NecklineParams`.
- Motor de cálculo del canesú raglan simétrico (sección 8) con escote crew
  (sección 9), para una sola talla.
- Cronograma ronda por ronda + resumen final (puntos finales, faltante en
  axila, reparto del montado inicial).
- Tests de regresión contra los valores numéricos ya verificados en el doc de
  dominio (secciones 8 y 9).

Explícitamente fuera de alcance (queda para pasadas siguientes, sobre esta
misma base):
- Escote scoop y V-neck (sección 9, variantes).
- Vuelta corta en cuña como alternativa de escote (no desarrollada en el doc
  de dominio).
- Entallado de cuerpo y manga (sección 10).
- Grading multi-talla (sección 11).
- Cualquier renderizador de salida (texto o gráfico, sección 12) — el engine
  produce datos estructurados, no texto ni SVG todavía.

## Modelo de datos (`src/domain`)

### `Gauge`
```ts
type Gauge = { stitchesPer10cm: number; rowsPer10cm: number };
```
Helpers: `stitchesForCm(gauge, cm): number`, `rowsForCm(gauge, cm): number`
— conversión centralizada (redondeo a entero más cercano), para no repetir
la lógica de conversión en el engine.

### `Ease`
```ts
type Ease = { bodyEaseCm: number; sleeveEaseCm: number };
```
Valores de cm explícitos (pueden ser negativos), separados para cuerpo y
manga. **Corrección detectada al planificar la implementación:** el ejemplo
numérico de la sección 8 usa 8cm de ease para el pecho y 6cm para el bíceps
dentro de la misma categoría "clásico" — un solo `easeCm` no puede
representar eso. Las categorías del Craft Yarn Council (muy ajustado,
ajustado, clásico, holgado, oversized) quedan como referencia/documentación
en comentarios, no como enum forzado — la decisión final siempre son cm
concretos, uno por zona del cuerpo.

### `YokeMeasurements`
Subconjunto del "esquema" completo (CLAUDE.md), acotado a lo que necesita el
canesú en esta pasada:
```ts
type YokeMeasurements = {
  chestCm: number;
  neckWidthBackCm: number; // ancho de cuello que le corresponde a la espalda
  bicepCm: number;
  armholeDepthCm: number;
};
```
Otras medidas del esquema completo (cintura, cadera, muñeca) no se modelan
todavía — son necesarias para entallado/manga, fuera de alcance acá.

### `NecklineParams` (crew)
```ts
type NecklineParams = {
  frontOpenRounds: number;
  frontStartStitchesPerHalf: number; // default 1
  necklineIncreaseCadence: number;   // default 1 (cada ronda)
};
```
`necklineIncreaseCadence` no es una regla física explícita en el doc de
dominio (solo se infiere del ejemplo numérico de la sección 9, donde resulta
ser 1) — se deja como parámetro configurable en vez de asumir una regla
general no verificada.

### `YokeConstructionParams`
```ts
type YokeConstructionParams = {
  initialSleeveStitchesPerSleeve: number; // ej. 8, ver nota abajo
};
```
**Corrección detectada al planificar la implementación:** el doc de dominio
da el punto de partida de manga (8 pts en el ejemplo) sin una fórmula que lo
derive de las medidas — no sale del bíceps objetivo (ese se alcanza recién
al final del canesú) ni de ninguna otra medida del esquema. Es una decisión
de diseño del patronista (típicamente una fracción chica del bíceps
objetivo), así que se modela como parámetro explícito, igual que
`frontOpenRounds`. El punto de partida de espalda **sí** sale de una medida:
`stitchesForCm(gauge, neckWidthBackCm)`. El de cada mitad del delantero sale
de `frontStartStitchesPerHalf`.

## Motor de cálculo (`src/engine`)

### Dos procesos de aumento en paralelo

- **Aumento raglan** (regla física fija, sección 8): cada 2 rondas, en las 4
  líneas simultáneamente. Cantidad de rondas de aumento =
  `totalYokeRounds / 2`, donde `totalYokeRounds = rowsForCm(gauge,
  armholeDepthCm)`. Acá la cadencia es fija y la cantidad de eventos se
  *deriva* — al revés que la fórmula universal de la sección 10 (ahí la
  cantidad de eventos es fija y se deriva la cadencia).
- **Aumento de escote** (crew, sección 9): cada `necklineIncreaseCadence`
  rondas, solo durante las `frontOpenRounds` en que el delantero está
  dividido en 2 mitades. Cada evento suma 1 punto por lado.
- **Cierre del escote**: `bindOnAtJoin = neckGapWidthSts -
  necklineIncreaseTotalSts`, donde `neckGapWidthSts =
  stitchesForCm(gauge, neckWidthBackCm)` y `necklineIncreaseTotalSts =
  ceil(frontOpenRounds / necklineIncreaseCadence) * 2` (2 = 1 punto por
  lado; el conteo es la cantidad de rondas `r` en `1..frontOpenRounds` donde
  `(r - 1) % necklineIncreaseCadence === 0`, que equivale a la fórmula del
  techo). Si `bindOnAtJoin` da negativo, es un conflicto de diseño (delantero
  abierto muy pocas rondas para la cadencia elegida) — se valida en el
  límite del engine y se reporta como error, no se corrige silenciosamente.

Esta derivación fue verificada a mano contra el ejemplo numérico de la
sección 9 (delantero 1+1, 12 rondas abiertas, cadencia 1 → montado=8,
delantero final 90, espalda final 88) y coincide exactamente.

### Estado trackeado ronda por ronda

Puntos de espalda, delantero (como `{ left, right }` mientras está dividido,
luego `{ combined }` tras el evento de unión en la ronda
`frontOpenRounds + 1`), manga izquierda y derecha.

### Salida

```ts
type FrontState =
  | { open: true; left: number; right: number }
  | { open: false; combined: number };

type RaglanYokeRoundEvent =
  | { type: "raglanIncrease"; deltaPerPiece: { back: number; front: number; sleeveLeft: number; sleeveRight: number } }
  | { type: "necklineIncrease"; deltaPerSide: { left: number; right: number } }
  | { type: "frontJoin"; boundOnStitches: number };

type RaglanYokeRound = {
  roundNumber: number;
  events: RaglanYokeRoundEvent[];
  stitchCounts: { back: number; front: FrontState; sleeveLeft: number; sleeveRight: number };
};

type RaglanYokeResult = {
  schedule: RaglanYokeRound[];
  finalStitchCounts: { back: number; front: number; sleeveLeft: number; sleeveRight: number };
  armpitShortfall: { back: number; front: number; sleeveLeft: number; sleeveRight: number };
  castOnBreakdown: { back: number; frontLeft: number; frontRight: number; sleeveLeft: number; sleeveRight: number };
};
```

`armpitShortfall` = objetivo por pieza − final real. Objetivo de
espalda/delantero = mitad de los puntos de pecho objetivo
(`stitchesForCm(gauge, chestCm + bodyEaseCm) / 2`, redondeado); objetivo de
manga = `stitchesForCm(gauge, bicepCm + sleeveEaseCm)`.

## Testing

Tests de regresión (golden values) contra los números ya verificados en el
doc de dominio:
- Sección 8 (canesú barco, sin escote): montado 80 (32 espalda / 32
  delantero / 8+8 manga), 28 rondas de aumento, final 88 espalda / 88
  delantero / 64+64 manga. El escote crew asume que el delantero arranca
  chico (1-2 pts) y crece por aumentos de escote — no existe una
  configuración de `NecklineParams` que reproduzca el caso "sin escote"
  (delantero simétrico arrancando en 32). Por eso este test corre el
  mecanismo de aumento raglan puro (sin unión de escote) como función
  interna separada, no la función pública de escote crew — valida que la
  regla física de la sección 8 esté bien implementada como building block
  antes de envolverla con la lógica de escote de la sección 9.
- Sección 9 (escote crew): delantero 1+1, 12 rondas abiertas, montado al
  unir = 8, final delantero 90 vs. espalda 88 — este sí corre la función
  pública completa.

Estos tests fijan el comportamiento esperado del engine antes de escribir la
implementación (TDD).

## Fuera de discusión en este spec

- El renderizador de texto/gráfico (sección 12) es un consumidor futuro de
  `RaglanYokeResult` — no se diseña acá.
- La corrección de escote aplicada a la tabla de tallas real completa
  (pendiente documentado en CLAUDE.md) queda para cuando se aborde grading.
