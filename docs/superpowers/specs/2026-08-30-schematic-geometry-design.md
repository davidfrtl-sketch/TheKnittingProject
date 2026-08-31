# Diseño: geometría del esquema visual (`computeSchematicGeometry`)

Fecha: 2026-08-30

## Objetivo

Convertir un `GarmentPlan` calculado en las medidas geométricas reales (en
cm) de cada pieza — espalda, delantero, manga izquierda, manga derecha —
para poder dibujar el esquema visual del chaleco/sweater. Es la misma
geometría que se armó a mano (y se verificó con estos mismos números) en el
artifact "Silueta del Raglan", ahora derivada del cálculo real en vez de
copiada de un ejemplo fijo.

Aclaración de encuadre: CLAUDE.md distingue dos renderizadores de patrón
tradicionales (instrucciones escritas + gráfico de símbolos para motivos de
punto) y aclara que la silueta de la prenda "se escribe, casi nunca se
grafica". Este módulo es un tercer renderizador, pensado para la UX de una
app moderna (el preview visual), no uno de los dos renderizadores
tradicionales del doc de dominio.

## Alcance

Incluido:
- `cmForStitches` y `cmForRows` en `src/domain/gauge.ts` — inversas de
  `stitchesForCm`/`rowsForCm`, ya existentes.
- `computeSchematicGeometry(plan: GarmentPlan, gauge: Gauge):
  SchematicGeometry` en `src/render/` — deriva todas las medidas en cm de
  los campos ya calculados en `plan`, sin recibir las medidas originales
  del usuario.
- Test de regresión contra el mismo ejemplo numérico ya verificado en todas
  las pasadas anteriores, comparando contra las medidas exactas ya
  dibujadas a mano en "Silueta del Raglan" (52cm bajo axila, 44cm cintura,
  53cm ruedo, 19cm bíceps, 9cm puño, etc.).

Explícitamente fuera de alcance:
- Generar el SVG/dibujo en sí — este módulo solo calcula números, el
  dibujo se arma después en un Artifact (o eventualmente en la interfaz),
  igual que `renderInstructions` solo genera texto sin decidir cómo se
  muestra.
- Motivo de trenzas/cruz, cuellera, grading multi-talla.

## Convención: panel plano vs. tubo

- **Espalda y delantero** son paneles planos independientes — su cantidad
  de puntos en cualquier ronda ya representa el ancho de ESA pieza
  directamente. `anchoCm = cmForStitches(gauge, puntos)`, sin dividir.
- **Cada manga** es un tubo tejido en redondo — su cantidad de puntos en
  cualquier punto representa la circunferencia completa. Para el ancho
  "plano" del esquema (el tubo doblado a la mitad, la convención estándar
  para dibujar una manga), `anchoCm = cmForStitches(gauge, puntos) / 2`.
- El entallado de cuerpo (`bodyWaistTaper`, `bodyHemTaper`) opera sobre el
  tubo COMPLETO del cuerpo (ya unido, espalda+delantero), así que su
  `finalStitches` es el total combinado — para el ancho de UNA pieza
  (espalda o delantero) en cintura/ruedo, hay que dividir entre 2 (ambas
  comparten el mismo ancho, por ser el objetivo de talla simétrico).

## Modelo de datos: `SchematicGeometry`

```ts
type PanelGeometry = {
  topWidthCm: number;
  underarmWidthCm: number;
  waistWidthCm: number;
  hemWidthCm: number;
  yokeHeightCm: number;
  waistLengthCm: number;
  hemLengthCm: number;
};

type FrontGeometry = PanelGeometry & {
  joinHeightCm: number;
  joinWidthCm: number;
  joinBoundOnStitches: number;
};

type SleeveGeometry = {
  topWidthCm: number;
  yokeEndWidthCm: number;
  bicepWidthCm: number;
  wristWidthCm: number;
  yokeHeightCm: number;
  taperLengthCm: number;
  axilaAdditionStitches: number;
  axilaAdditionCircumferenceCm: number;
};

type SchematicGeometry = {
  back: PanelGeometry;
  front: FrontGeometry;
  sleeveLeft: SleeveGeometry;
  sleeveRight: SleeveGeometry;
};
```

## Derivación exacta de cada campo

**Espalda** (`back: PanelGeometry`):
- `topWidthCm = cmForStitches(gauge, plan.yoke.castOnBreakdown.back)`
- `underarmWidthCm = cmForStitches(gauge, plan.yoke.finalStitchCounts.back + plan.yoke.armpitShortfall.back)`
- `waistWidthCm = cmForStitches(gauge, plan.bodyWaistTaper.finalStitches) / 2`
- `hemWidthCm = cmForStitches(gauge, plan.bodyHemTaper.finalStitches) / 2`
- `yokeHeightCm = cmForRows(gauge, plan.yoke.schedule.length)`
- `waistLengthCm = cmForRows(gauge, plan.bodyWaistTaper.schedule.length)`
- `hemLengthCm = cmForRows(gauge, plan.bodyHemTaper.schedule.length)`

**Delantero** (`front: FrontGeometry`): mismos `underarmWidthCm`,
`waistWidthCm`, `hemWidthCm`, `yokeHeightCm`, `waistLengthCm`,
`hemLengthCm` que la espalda (comparten el mismo objetivo de talla), más:
- `topWidthCm = cmForStitches(gauge, plan.yoke.castOnBreakdown.frontLeft + plan.yoke.castOnBreakdown.frontRight)`
- Ubicar la ronda de unión escaneando `plan.yoke.schedule` por el evento
  `frontJoin` (misma técnica que ya usa `renderInstructions`):
  - `joinHeightCm = cmForRows(gauge, joinRound.roundNumber)`
  - `joinWidthCm = cmForStitches(gauge, joinRound.stitchCounts.front.combined)`
    (el campo `combined` existe porque en la ronda de unión `front.open` ya
    es `false`)
  - `joinBoundOnStitches = joinEvent.boundOnStitches`

**Cada manga** (`sleeveLeft`/`sleeveRight: SleeveGeometry`, análogo para
cada lado):
- `topWidthCm = cmForStitches(gauge, plan.yoke.castOnBreakdown.sleeveLeft) / 2`
- `yokeEndWidthCm = cmForStitches(gauge, plan.yoke.finalStitchCounts.sleeveLeft) / 2`
- `bicepWidthCm = cmForStitches(gauge, plan.axilaJoin.sleeveLeftStartStitches) / 2`
- `wristWidthCm = cmForStitches(gauge, plan.sleeveLeftTaper.finalStitches) / 2`
- `yokeHeightCm = cmForRows(gauge, plan.yoke.schedule.length)` (mismo valor
  que el de espalda/delantero — las 4 piezas comparten el canesú)
- `taperLengthCm = cmForRows(gauge, plan.sleeveLeftTaper.schedule.length)`
- `axilaAdditionStitches = plan.yoke.armpitShortfall.sleeveLeft`
- `axilaAdditionCircumferenceCm = cmForStitches(gauge, plan.yoke.armpitShortfall.sleeveLeft)`
  (sin dividir entre 2 — es el aumento de circunferencia, no de ancho plano)

## Verificación a mano contra el ejemplo ya validado

Con el mismo `GarmentPlan` de todas las pasadas anteriores (gauge 20/28,
resultado ya verificado: canesú 88/90/64/64, axila 208/76/76, cintura 176,
ruedo 212, mangas 36):

- `back.topWidthCm` = cmForStitches(gauge, 32) = **16cm**.
- `back.underarmWidthCm` = cmForStitches(gauge, 88+16=104) = **52cm**.
- `back.waistWidthCm` = cmForStitches(gauge, 176)/2 = 88/2 = **44cm**.
- `back.hemWidthCm` = cmForStitches(gauge, 212)/2 = 106/2 = **53cm**.
- `back.yokeHeightCm` = cmForRows(gauge, 56) = **20cm**.
- `back.waistLengthCm` = cmForRows(gauge, 42) = **15cm**.
- `back.hemLengthCm` = cmForRows(gauge, 34) ≈ **12.142857cm**.
- `front.topWidthCm` = cmForStitches(gauge, 1+1=2) = **1cm**.
- `front.joinHeightCm` = cmForRows(gauge, 13) = **13/2.8 ≈ 4.642857cm**.
- `front.joinWidthCm` = cmForStitches(gauge, 46) = **23cm**.
- `front.joinBoundOnStitches` = **8**.
- `sleeveLeft.topWidthCm` = cmForStitches(gauge, 8)/2 = 4/2 = **2cm**.
- `sleeveLeft.yokeEndWidthCm` = cmForStitches(gauge, 64)/2 = 32/2 = **16cm**.
- `sleeveLeft.bicepWidthCm` = cmForStitches(gauge, 76)/2 = 38/2 = **19cm**.
- `sleeveLeft.wristWidthCm` = cmForStitches(gauge, 36)/2 = 18/2 = **9cm**.
- `sleeveLeft.taperLengthCm` = cmForRows(gauge, 118) ≈ **42.142857cm**.
- `sleeveLeft.axilaAdditionStitches` = **12**; `axilaAdditionCircumferenceCm`
  = cmForStitches(gauge, 12) = **6cm**.

Todos estos valores coinciden exactamente con los que ya se dibujaron a
mano (y se verificaron visualmente en ambos temas) en el artifact "Silueta
del Raglan". `sleeveRight` da los mismos valores que `sleeveLeft` en este
ejemplo simétrico.

**Nota sobre `joinHeightCm`**: da un decimal (≈4.64cm) porque
`cmForRows` no redondea (a diferencia de `rowsForCm`, que sí redondea al
convertir cm→filas) — es la dirección correcta para dibujar proporciones
sin distorsión, pero significa que estos valores no tienen por qué ser
números "lindos". El componente de presentación (Artifact) decide cuántos
decimales mostrar; este módulo devuelve la precisión completa.

## Testing

Test de regresión que corre `computeGarmentPlan` con el ejemplo de
`garmentPlan.test.ts`, pasa el resultado a `computeSchematicGeometry`, y
verifica cada uno de los valores de la tabla de arriba (los que dan enteros
con `toBe`, los que dan decimales con `toBeCloseTo`).

## Fuera de discusión en este spec

El dibujo SVG en sí (colores, layout, callouts visuales) se arma en un
Artifact separado, consumiendo `SchematicGeometry` — no se diseña acá.
