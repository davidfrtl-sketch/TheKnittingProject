# Diseño: composición del pipeline completo (`computeGarmentPlan`)

Fecha: 2026-08-30

## Objetivo

Encadenar los tres motores ya existentes (canesú, unión de axila, entallado)
en una sola función que reciba el esquema completo de medidas en
centímetros — como las va a ingresar una persona — y devuelva el resultado
completo del cálculo de forma para una talla. Es el primer paso hacia el
objetivo declarado por el usuario: una plantilla donde alguien ingresa sus
medidas y ve un preview + instrucciones de un sweater/chaleco a medida
(en esta etapa, con escote redondo y sin motivos de punto — trenzas/cables
quedan para una pasada separada, según lo acordado).

## Alcance

Incluido:
- Extender el modelo de medidas (`YokeMeasurements`) con lo que falta del
  esquema para poder calcular entallado y manga: cintura, cadera, muñeca,
  y los tres largos (axila→cintura, cintura→ruedo, fin del canesú→puño).
- Una función `computeGarmentPlan` que recibe gauge, ease, el esquema
  completo, los parámetros de escote y de construcción, y devuelve los 6
  resultados (canesú, unión de axila, 2 tramos de entallado de cuerpo, 2
  mangas) sin fusionarlos en un cronograma único.
- Test de regresión que reproduce, en una sola llamada, todos los valores
  ya verificados por separado en las pasadas anteriores (canesú sección 9,
  entallado sección 10).

Explícitamente fuera de alcance:
- Fusionar los 6 resultados en una sola línea de tiempo con numeración de
  fila continua — es trabajo del renderizador de instrucciones (próxima
  pasada).
- Motivos de punto (trenzas, cables, el "alfabeto de símbolos" de la
  sección 13 de CLAUDE.md).
- Escote scoop/V, cuellera, grading multi-talla, cualquier renderizador de
  salida o interfaz de usuario.

## Modelo de datos: `GarmentMeasurements`

```ts
type GarmentMeasurements = YokeMeasurements & {
  waistCm: number;
  hipCm: number;
  wristCm: number;
  waistLengthCm: number; // axila → cintura
  hemLengthCm: number;   // cintura → ruedo
  sleeveLengthCm: number; // fin del canesú → puño
};
```

Extiende `YokeMeasurements` (no lo reemplaza) — `chestCm`, `neckWidthBackCm`,
`bicepCm` y `armholeDepthCm` siguen siendo los mismos campos que ya consume
`computeRaglanYoke`. `GarmentMeasurements` es estructuralmente compatible
con `YokeMeasurements`, así que se le puede pasar directo a
`computeRaglanYoke` sin transformación.

**Ease**: cintura y cadera reutilizan `ease.bodyEaseCm` (el mismo que el
pecho); la muñeca reutiliza `ease.sleeveEaseCm` (el mismo que el bíceps) —
sin campos de ease nuevos, asumiendo holgura uniforme en todo el torso y en
toda la manga.

## Diseño de `computeGarmentPlan`

```ts
type GarmentPlan = {
  yoke: RaglanYokeResult;
  axilaJoin: AxilaJoinResult;
  bodyWaistTaper: TaperResult;
  bodyHemTaper: TaperResult;
  sleeveLeftTaper: TaperResult;
  sleeveRightTaper: TaperResult;
};

function computeGarmentPlan(
  gauge: Gauge,
  ease: Ease,
  measurements: GarmentMeasurements,
  necklineParams: NecklineParams,
  constructionParams: YokeConstructionParams
): GarmentPlan
```

Pasos:
1. `yoke = computeRaglanYoke(gauge, ease, measurements, necklineParams, constructionParams)`.
2. `axilaJoin = computeAxilaJoin(yoke)`.
3. `waistTargetStitches = stitchesForCm(gauge, measurements.waistCm + ease.bodyEaseCm)`;
   `bodyWaistTaper = computeTaper(axilaJoin.bodyStartStitches, waistTargetStitches, rowsForCm(gauge, measurements.waistLengthCm))`.
4. `hipTargetStitches = stitchesForCm(gauge, measurements.hipCm + ease.bodyEaseCm)`;
   `bodyHemTaper = computeTaper(bodyWaistTaper.finalStitches, hipTargetStitches, rowsForCm(gauge, measurements.hemLengthCm))`
   — encadena desde el resultado final del tramo anterior, no desde
   `axilaJoin.bodyStartStitches` de nuevo.
5. `wristTargetStitches = stitchesForCm(gauge, measurements.wristCm + ease.sleeveEaseCm)`;
   `sleeveLeftTaper = computeTaper(axilaJoin.sleeveLeftStartStitches, wristTargetStitches, rowsForCm(gauge, measurements.sleeveLengthCm))`;
   `sleeveRightTaper` es la misma llamada con `sleeveRightStartStitches` —
   en este modelo simétrico da el mismo resultado que la izquierda, pero se
   calcula por separado para no perder la simetría del resto del pipeline
   (el canesú y la unión de axila ya reportan espalda/delantero/mangas por
   separado aunque terminen siendo iguales).

No hay lógica nueva más allá de esta composición — cada paso es una
llamada directa a una función ya implementada y verificada.

## Testing

Test de regresión que reconstruye, en una sola llamada a
`computeGarmentPlan`, el ejemplo combinado de las secciones 9 y 10 del doc
de dominio (el mismo que ya usamos en `raglanYoke.test.ts`,
`axilaJoin.test.ts` y `taper.test.ts` por separado):

- Gauge 20 pts / 28 filas · 10cm, ease cuerpo +8cm / manga +6cm.
- Medidas: pecho 96cm, cuello espalda 16cm, bíceps 32cm, sisa 20cm (como
  antes) — más `waistCm=80`, `hipCm=98`, `wristCm=12`, `waistLengthCm=15`,
  `hemLengthCm=12.14`, `sleeveLengthCm=42.14` (elegidas para que
  `waistTargetStitches=176`, `hipTargetStitches=212`,
  `wristTargetStitches=36`, y las filas disponibles den 42/34/118 —
  exactamente los números ya verificados en `taper.test.ts`).
- Neckline: `frontOpenRounds=12`, `frontStartStitchesPerHalf=1`,
  `necklineIncreaseCadence=1`. Construcción: `initialSleeveStitchesPerSleeve=8`.

Resultado esperado (idéntico a lo ya verificado en las pasadas anteriores,
ahora producido por una sola llamada):
- `yoke.finalStitchCounts` = `{ back: 88, front: 90, sleeveLeft: 64, sleeveRight: 64 }`.
- `axilaJoin.bodyStartStitches` = 208; `sleeveLeftStartStitches` =
  `sleeveRightStartStitches` = 76; `castOnPerAxila.left` =
  `castOnPerAxila.right` = `{ back: 8, front: 7, total: 15 }`.
- `bodyWaistTaper`: `events=16`, `primaryCadence=3`, `reducedCadence=2`,
  `finalStitches=176`.
- `bodyHemTaper`: `events=18`, `primaryCadence=2`, `reducedCadence=1`,
  `finalStitches=212`.
- `sleeveLeftTaper` y `sleeveRightTaper`: `events=20`, `primaryCadence=6`,
  `reducedCadence=5`, `finalStitches=36`.

## Fuera de discusión en este spec

El renderizador de instrucciones (que sí necesita fusionar estos 6
resultados en una narrativa única, con numeración de fila continua y
notación "al mismo tiempo") es la siguiente pasada natural, y consume
`GarmentPlan` tal cual lo devuelve esta función.
