# Diseño: motivo de punto superpuesto en el esquema (tramo plano)

Fecha: 2026-08-31

## Objetivo

Mostrar el motivo de punto diseñado en el editor de gráfico
([2026-08-30-stitch-chart-design.md](2026-08-30-stitch-chart-design.md)) superpuesto en
su posición real dentro del esquema del chaleco, en el único tramo del patrón
calculado donde el ancho es realmente constante fila a fila — sin inventar
ninguna geometría nueva, solo exponiendo información que el motor ya calcula
pero que hoy no se usa (el detalle fila-por-fila de cada `TaperResult.schedule`).

**Hallazgo clave (por qué no es "el cuerpo recto")**: en `computeGarmentPlan`,
el cuerpo pasa directo de `bodyWaistTaper` (achicando hacia la cintura) a
`bodyHemTaper` (agrandando hacia la cadera), sin ninguna fase intermedia sin
entallado; la manga tampoco tiene ningún tramo sin entallado. Los únicos
tramos de ancho constante que existen de verdad son las filas lisas *entre*
eventos de cambio dentro de una misma fase de taper (consecuencia de la
fórmula de cadencia) — típicamente cortos (2-6 filas), no un bloque grande
como "todo el torso".

## Alcance

Incluido:
- `findMotifSource(plan: GarmentPlan): MotifSource | null` — encuentra el
  tramo de filas consecutivas con igual cantidad de puntos más largo, entre
  las fases `bodyWaistTaper`, `bodyHemTaper` y `sleeveLeftTaper` únicamente
  (ver "Hallazgo" más abajo sobre por qué no `sleeveRightTaper`).
- Traducción de ese tramo a un rectángulo real en cm dentro del SVG del
  esquema, reutilizando los centros/offsets ya calculados en
  `renderSchematicSvg` (sin tocar `schematicGeometry.ts`).
- Si el tramo ganador es del cuerpo, el rectángulo se dibuja en espalda Y
  delantero (mismas filas, mismo ancho real); si es de manga, en la única
  manga que ya se dibuja hoy.
- El motivo cargado en el editor de puntos (`StitchChart`) se repite en
  mosaico dentro de ese rectángulo, recortándose en el borde si no entra un
  múltiplo exacto de filas/columnas.
- Nuevo renderizador puro `src/render/motifTile.ts`, separado de
  `stitchChart.ts` — celdas con ancho/alto reales (no cuadradas, derivadas
  del gauge), sin leyenda, pensado para insertarse como fragmento `<g>`
  dentro del SVG del esquema.
- Actualización en vivo: cualquier acción del editor de puntos (clic,
  redimensionar, cargar preset) vuelve a dibujar el esquema si ya había un
  cálculo hecho en pantalla.

Explícitamente fuera de alcance:
- Tramos con entallado (canesú raglan, filas de cambio dentro de un taper):
  siguen dibujándose como silueta lisa, sin motivo.
- Que el usuario elija manualmente en qué panel/tramo va el motivo — la
  ubicación siempre es automática (el tramo más largo encontrado).
- Editar el motivo desde el esquema — se sigue editando en la pantalla del
  editor de puntos existente.
- Refactorizar `renderStitchChart.ts` para compartir lógica de celdas con el
  nuevo renderizador — quedan intencionalmente separados (ver decisión más
  abajo).

**Hallazgo (por qué solo `sleeveLeftTaper`, no las dos mangas)**: el esquema
actual (`renderSchematicSvg`) dibuja una sola manga (`sleeveLeft`,
representando a ambas por simetría — siempre 3 polígonos: espalda,
delantero, una manga). Evaluar `sleeveRightTaper` en `findMotifSource`
sería trabajo sin efecto visible, ya que esa manga nunca se dibuja.

## Modelo de datos

```ts
// src/engine/motifPlacement.ts
export type MotifSegment = "bodyWaist" | "bodyHem" | "sleeve";

export type MotifSource = {
  segment: MotifSegment;
  startRow: number;   // 1-indexado, igual que TaperRow.rowNumber
  rowCount: number;
  stitches: number;   // cantidad de puntos constante durante todo el tramo
};

export function findMotifSource(plan: GarmentPlan): MotifSource | null;
```

## Algoritmo de `findMotifSource`

1. Para cada una de las 3 fases candidatas (`bodyWaistTaper`, `bodyHemTaper`,
   `sleeveLeftTaper`), recorrer su `schedule: TaperRow[]` agrupando filas
   consecutivas con el mismo valor de `stitches` (run-length encoding sobre
   la lista ya ordenada por `rowNumber`).
2. Quedarse con el run más largo de cada fase (si hay empate entre runs
   dentro de la misma fase, el primero en aparecer, es decir el de menor
   `startRow`).
3. Entre los 3 runs candidatos (uno por fase), quedarse con el de mayor
   `rowCount`. Empate entre fases: prioridad fija
   `bodyWaist > bodyHem > sleeve` (determinístico, no depende de orden de
   iteración del lenguaje).
4. Si el máximo global tiene `rowCount === 1` (ninguna fase tiene siquiera
   dos filas seguidas con el mismo ancho — posible con gauges/medidas muy
   ajustados), devolver `null`.
5. Devolver `{ segment, startRow, rowCount, stitches }` del run ganador.

### Caso de verificación a mano

```
bodyWaistTaper.schedule (extracto, stitches por fila):
fila 1: 100   fila 2: 100   fila 3: 98 (evento)   fila 4: 98   fila 5: 98   fila 6: 96 (evento)

Runs: [100,100] (filas 1-2, largo 2), [98,98,98] (filas 3-5, largo 3), [96] (fila 6, largo 1)
Run más largo de esta fase: startRow=3, rowCount=3, stitches=98
```

Si ninguna otra fase supera `rowCount=3`, `findMotifSource` devuelve
`{ segment: "bodyWaist", startRow: 3, rowCount: 3, stitches: 98 }`.

## Geometría del rectángulo (en `schematicSvg.ts`)

No se toca `schematicGeometry.ts`: el cálculo vive en `renderSchematicSvg`,
que ya tiene los centros (`centerBack`, `centerFront`, `centerSleeve`) y los
offsets verticales (`yUnderarm`, `yWaist`, `yHem`, `yYokeEnd`) del layout.

- **Vertical**: `yTop = yFaseInicio + cmForRows(gauge, startRow - 1)`,
  `alturaCm = cmForRows(gauge, rowCount)`, donde `yFaseInicio` es
  `yUnderarm` (si `segment === "bodyWaist"`), `yWaist` (si `"bodyHem"`) o
  `yYokeEnd` (si `"sleeve"`).
- **Horizontal**: `anchoCm = cmForStitches(gauge, stitches) / 2` (mismo
  criterio "tubo combinado ÷ 2" que ya usa el resto del esquema), centrado
  en `centerBack`/`centerFront` (cuerpo, dibujado en los dos) o
  `centerSleeve` (manga).
- Como el tramo es plano, los bordes del panel ahí son verticales — el
  rectángulo coincide exacto con el borde del panel, no hace falta
  `clipPath`.

## `renderMotifTile` (nuevo, `src/render/motifTile.ts`)

```ts
import type { StitchChart } from "./stitchChart.js";
import type { Gauge } from "../domain/gauge.js";

export function renderMotifTile(
  chart: StitchChart,
  gauge: Gauge,
  xCm: number,
  yCm: number,
  widthStitches: number,
  heightRows: number
): string;
```

- `cellWidthCm = 10 / gauge.stitchesPer10cm`, `cellHeightCm = 10 / gauge.rowsPer10cm`
  (celdas NO cuadradas — a diferencia de `renderStitchChart`, que usa
  `CELL_SIZE=10` fijo porque es un gráfico de punto abstracto, no una pieza
  a escala real).
- Fila tejida 0 del motivo va abajo del rectángulo (misma convención
  bottom-to-top que `renderStitchChart` — CYC, tejido en redondo, sección 12
  del doc de dominio), igual que el resto del esquema visualmente crece
  hacia arriba en `y` decreciente dentro del rectángulo.
- Para cada celda destino `(fila, columna)` del rectángulo (`fila` de 0 a
  `heightRows-1`, `columna` de 0 a `widthStitches-1`), el símbolo viene de
  `chart.cells[fila % chart.rows][columna % chart.cols]` (mosaico por
  módulo — repite el motivo, cortándose en el borde del rectángulo si
  `widthStitches`/`heightRows` no son múltiplos exactos de `chart.cols`/
  `chart.rows`).
- Mismo algoritmo de consumo de cruces 2/2 que `renderStitchChart`
  (`col + 3 < widthStitches` para dibujar el cruce, si no cae a derecho),
  pero reimplementado localmente en este archivo — no se comparte código
  con `stitchChart.ts` (decisión explícita: mantener `stitchChart.ts`
  intacto y estable, en vez de refactorizarlo para compartir helpers).
- Devuelve un fragmento `<g transform="translate(${xCm},${yCm})">...</g>`
  (sin `<svg>` propio, sin `viewBox`, sin leyenda) — pensado para
  concatenarse dentro del string que devuelve `renderSchematicSvg`.

## Integración

`renderSchematicSvg` gana tres parámetros opcionales:

```ts
export function renderSchematicSvg(
  geometry: SchematicGeometry,
  motifChart?: StitchChart,
  gauge?: Gauge,
  motifSource?: MotifSource | null
): string;
```

(El caller siempre calcula `motifSource` con `findMotifSource(plan)` antes de
llamar a `renderSchematicSvg` — la función de render no importa `GarmentPlan`,
solo recibe el resultado ya calculado, manteniendo la separación
engine/render del resto del proyecto.)

Si `motifChart`, `gauge` o `motifSource` faltan, o `motifSource` es `null`,
el comportamiento es idéntico al actual (sin mosaico) — ningún llamador
existente se rompe.

En `src/web/app.ts`:
- `calculate()` ahora calcula `findMotifSource(plan)` junto con el resto del
  plan, y pasa `currentChart`/`gauge`/ese resultado a `renderSchematicSvg`.
- Toda acción del editor de puntos que hoy solo llama `renderChart()`
  (cycle de símbolo, redimensionar, cargar preset) también llama a una nueva
  función chica `refreshSchematicIfCalculated()`: si `#result-box` está
  oculto (todavía no se calculó nada), no hace nada; si ya está visible,
  vuelve a armar el esquema con el `currentChart` actualizado (reutilizando
  el último `GarmentPlan`/`gauge` calculado, guardado en una variable de
  módulo igual que `currentChart`).

## Casos borde

- `findMotifSource` devuelve `null`: el esquema se dibuja igual que hoy, sin
  mosaico — no es un error, es "este patrón no tiene tramo aprovechable con
  estas medidas".
- Motivo en blanco (todo `'k'`, estado inicial del editor): se dibuja igual,
  se ve como una zona lisa — comportamiento correcto, no hace falta
  ocultarlo ni mostrar ningún aviso especial.

## Testing

- `findMotifSource` (test puro, `TaperResult` fabricados a mano, sin correr
  `computeTaper`): un run claramente más largo que el resto; empate entre
  fases verificando la prioridad `bodyWaist > bodyHem > sleeve`; el caso
  "las 3 fases cambian todas las filas" → `null`.
- `renderMotifTile`: golden test chico (ej. motivo 2×3 tileado sobre un
  hueco de 5 filas × 7 puntos) verificando el recorte en el borde cuando no
  entra un múltiplo exacto — mismo nivel de rigor que el test ya existente
  de `renderStitchChart`.
- `renderSchematicSvg`: un test nuevo con un `GarmentPlan` + `MotifSource`
  conocidos a mano, confirmando que aparece el `<g>` del mosaico en la
  posición esperada; y un test de no-regresión confirmando que, sin pasar
  los parámetros de motivo, el SVG queda byte-a-byte igual al de antes de
  este cambio.
- El refresco en vivo del editor (`refreshSchematicIfCalculated`) se
  verifica a mano en el navegador — mismo criterio que el resto de
  `src/web/app.ts`, sin cobertura de Vitest.

## Fuera de discusión en este spec

Aplicar este mismo mecanismo a tramos con entallado (dibujar el motivo
distorsionado/recortado contra un borde que se mueve fila a fila) sigue
siendo un problema genuinamente distinto, y queda fuera de esta pasada.
