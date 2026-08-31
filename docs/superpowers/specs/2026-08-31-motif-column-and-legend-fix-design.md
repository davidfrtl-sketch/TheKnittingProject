# Diseño: columna de motivo de ancho fijo en toda la espalda + leyenda a tamaño fijo

Fecha: 2026-08-31

## Parte 1 — Motivo como columna centrada, de ancho fijo, en toda la espalda

### Hallazgo que motiva este cambio

El selector de tramo ([2026-08-31-motif-segment-picker-design.md](2026-08-31-motif-segment-picker-design.md),
mergeado) resolvía "¿dónde dibujar el motivo?" buscando filas donde *toda*
la pieza tuviera el mismo ancho — y por la fórmula de cadencia del
entallado, esos tramos casi nunca duran más de 2-6 filas. El resultado era
una franja angosta, muy lejos de la referencia real (foto de un sweater con
una trenza en cruz que recorre **toda la espalda**, de punta a punta).

La foto muestra la técnica real de un sweater a trenzas: el panel de la
trenza tiene ancho fijo y **el entallado pasa por fuera de él**, en los
puntos lisos a los costados — no dentro. Revisando `instructionsRenderer.ts`
se confirma que este proyecto ya construye el raglan así: tanto el aumento
del canesú (`"raglan, aumentar 1 punto a cada lado del marcador"`) como el
entallado del cuerpo (`"aumentar/disminuir 2 puntos (1 a cada lado)"`)
suceden siempre en los **bordes** de la pieza, nunca en el medio. Por lo
tanto, el centro de la espalda **nunca cambia de ancho** en toda su altura
— la única pregunta es cuál es el ancho máximo que ese centro puede tener
sin que el entallado, en su punto más ajustado, llegue a tocarlo.

### Alcance

Incluido:
- Reemplazo completo de `MotifSegment`/`MotifSource`/`findMotifCandidates`
  (`src/engine/motifPlacement.ts`) por
  `computeBackMotifColumn(plan): BackMotifColumn | null`.
- El motivo pasa a ocupar **siempre** una columna centrada en la espalda,
  desde la primera fila del canesú (`row 1`, altura del cuello) hasta la
  última fila del ruedo — nunca una franja corta ni un tramo elegido.
- Se elimina el `<select>` de tramo (`#motif-select-wrapper`) y todo su
  estado asociado en `app.ts`/`index.html` — ya no aporta valor frente a
  este enfoque.
- `renderSchematicSvg` se simplifica: el bloque de embebido del motivo ya
  no necesita "segmento" ni posición de fila — siempre es un único
  rectángulo en la espalda, de `y0` a `yHem`.
- `renderMotifTile` (el mosaico) **no cambia**: su lógica de repetir
  (`row % chart.rows`, `col % chart.cols`) y recortar en el borde ya sirve
  tal cual para este ancho/alto — sigue sin saber nada de paneles ni de
  entallado.

Explícitamente fuera de alcance (por ahora — decisión explícita de esta
pasada):
- Delantero y manga: solo espalda. El delantero tiene el escote partiendo
  el panel en dos mitades durante el canesú, lo cual complica bastante la
  geometría — queda para una pasada futura.
- Que el usuario elija manualmente dónde va la columna, o su ancho — el
  ancho sale siempre del cálculo (ver más abajo), nunca de un input.

### `computeBackMotifColumn`

```ts
// src/engine/motifPlacement.ts (reemplaza todo el contenido actual)
export type BackMotifColumn = {
  widthStitches: number;
  heightRows: number;
};

export type BackMotifColumnInput = Pick<GarmentPlan, "yoke" | "bodyWaistTaper" | "bodyHemTaper">;

export function computeBackMotifColumn(plan: BackMotifColumnInput): BackMotifColumn | null;
```

**Algoritmo**:

1. `yokeMinBack` = el mínimo de `plan.yoke.castOnBreakdown.back` y de
   `stitchCounts.back` en cada ronda de `plan.yoke.schedule` — el canesú
   solo aumenta en la espalda, así que en la práctica esto siempre da el
   propio montado inicial, pero se calcula escaneando en vez de asumirlo,
   para no depender de a partir de qué ronda arranca el primer aumento.
2. `bodyMinBack` = el mínimo, dividido por 2 (tubo combinado → mitad para
   la espalda, mismo criterio "combinado ÷ 2" que ya usa el resto del
   esquema), de todas las filas de `plan.bodyWaistTaper.schedule` **y**
   `plan.bodyHemTaper.schedule` juntas — se escanea explícitamente en vez
   de asumir que "la cintura siempre achica", porque `computeTaper` puede
   recibir medidas donde el entallado vaya al revés.
3. `widthStitches` = `Math.min(yokeMinBack, bodyMinBack)`, redondeado hacia
   abajo al número par más cercano (`Math.floor(x / 2) * 2`) — un ancho de
   columna impar no tiene sentido para un motivo con cruces 2/2 centradas.
4. `heightRows` = `plan.yoke.schedule.length + plan.bodyWaistTaper.schedule.length + plan.bodyHemTaper.schedule.length`.
5. Si `widthStitches < 1`, devolver `null` (caso patológico — sin ancho
   utilizable).

### Cambios en `renderSchematicSvg`

Deja de recibir `motifSource: MotifSource | null` y pasa a recibir
`motifColumn: BackMotifColumn | null`. El bloque de embebido se simplifica
a un único caso (ya no hay `if (segment === "sleeve") ... else ...`):

```ts
const motifParts: string[] = [];
if (motifChart && gauge && motifColumn) {
  const widthCm = cmForStitches(gauge, motifColumn.widthStitches);
  motifParts.push(
    renderMotifTile(
      motifChart,
      gauge,
      centerBack - widthCm / 2,
      y0,
      motifColumn.widthStitches,
      motifColumn.heightRows
    )
  );
}
```

(`y0` es la constante ya existente en `renderSchematicSvg` — el techo del
esquema, arriba del todo del canesú. `yHem` no hace falta pasarlo
explícitamente: `renderMotifTile` ya calcula su propio alto a partir de
`heightRows`, tal como hace hoy.)

### Cambios en la web tool

- `app.ts` pierde: el import de `findMotifCandidates`, los tipos
  `MotifSource`/`MotifSegment`, las variables `motifCandidates`/
  `selectedMotifSource`, `SEGMENT_LABELS`, `populateMotifSelect`,
  `setupMotifSelect`, y la llamada a `setupMotifSelect()`.
- `app.ts` gana: import de `computeBackMotifColumn`. `calculate()` calcula
  `const motifColumn = computeBackMotifColumn(plan);` y lo pasa a
  `renderSchematicSvg(geometry, currentChart, gauge, motifColumn)`.
  `refreshSchematicIfCalculated()` recalcula `computeBackMotifColumn(lastPlan)`
  cada vez (a diferencia del selector anterior, acá no hay "elección del
  usuario" que preservar — el resultado es siempre el mismo para el mismo
  plan, así que no hace falta guardarlo en una variable de módulo aparte).
- `index.html` pierde el `<div id="motif-select-wrapper">` y su CSS
  (`#motif-select-wrapper`, `#motif-segment-select`).

### Testing

- `computeBackMotifColumn`: tests puros con `TaperResult`/`RaglanYokeResult`
  fabricados a mano (mismo estilo que el módulo anterior) cubriendo: el
  caso normal (canesú angosto, cuerpo mucho más ancho → gana el canesú);
  el caso donde el entallado del cuerpo es más angosto que el canesú
  (gana el cuerpo); un caso donde el "entallado" en realidad aumenta en
  vez de disminuir (para probar que no se asume la dirección); y el
  redondeo a número par.
- `renderSchematicSvg`: se actualiza el test end-to-end existente (que
  hoy usa `findMotifCandidates`) para usar `computeBackMotifColumn`, y se
  simplifican/reemplazan los tests de "embeds the motif" del segmento
  anterior por uno solo que verifica el rectángulo de ancho fijo desde
  `y0` hasta el final calculado.
- `app.ts`: sin cobertura de Vitest, verificación manual en navegador
  (igual que siempre) — confirmar que la columna aparece centrada en la
  espalda, recorre desde arriba del canesú hasta el ruedo, y que cargar el
  preset de cruz la muestra tejida ahí.

## Parte 2 — Leyenda del gráfico de puntos a tamaño fijo

### Problema

`renderStitchChart` (`src/render/stitchChart.ts`) dibuja hoy la leyenda
**dentro** del mismo `<svg>` que la grilla, usando el mismo sistema de
coordenadas (`CELL_SIZE`-based). Como ese SVG se escala para ocupar el
ancho de su contenedor (`#chart-container svg`), el texto de la leyenda
crece o achica según el tamaño de la grilla (una grilla chica estirada se
ve con letra enorme; una grilla grande, con letra diminuta) — nunca queda
al tamaño real de la tipografía del resto de la página.

### Solución

Sacar la leyenda del SVG por completo. La leyenda es siempre el mismo
texto fijo (no depende de los datos del `StitchChart`), así que pasa a ser
HTML estático en `index.html`, con el mismo `font-size` que el resto de la
interfaz (13px, `--font-body`) — totalmente desacoplado del `viewBox` del
gráfico.

`renderStitchChart` pierde:
- La constante `LEGEND_HEIGHT` y su uso en el cálculo de `viewBoxHeight`
  (pasa a ser solo `rows * CELL_SIZE + MARGIN * 2`).
- El array `legendItems` y el bucle que empuja sus `<rect>`/`<text>`.

`index.html` gana, debajo de `#chart-container`:

```html
<ul class="chart-legend">
  <li><span class="chart-legend-swatch k"></span> Derecho</li>
  <li><span class="chart-legend-swatch p"></span> Revés</li>
  <li><span class="chart-legend-swatch cable-left"></span> Cruce 2/2 a la izquierda (2 puntos pasan por delante)</li>
  <li><span class="chart-legend-swatch cable-right"></span> Cruce 2/2 a la derecha (2 puntos pasan por detrás)</li>
</ul>
```

CSS nueva (reemplaza `.chart-legend-label`):

```css
.chart-legend { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.chart-legend li { display: flex; align-items: center; gap: 8px; }
.chart-legend-swatch { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--ink); flex-shrink: 0; }
.chart-legend-swatch.k { background: var(--surface); }
.chart-legend-swatch.p { background: var(--paper); }
.chart-legend-swatch.cable-left, .chart-legend-swatch.cable-right { background: var(--electric); }
```

(mismos colores que ya usa `.chart-cell`/`.chart-cell.p`/
`.chart-cell.cable-left` en la grilla interactiva — la leyenda sigue
mostrando qué significa cada color, ahora como HTML en vez de SVG.)

### Testing

- `tests/render/stitchChart.test.ts`: se actualiza el `viewBox` esperado
  (baja en `LEGEND_HEIGHT`, es decir 40 unidades menos de alto) y se
  eliminan las aserciones sobre los 4 textos de leyenda (ya no los
  renderiza esta función). El resto de los tests (cruce exitoso, cruce que
  cae a derecho, orientación de filas) no cambia.
- `index.html`: verificación manual — confirmar visualmente que la leyenda
  se ve al mismo tamaño de letra sea cual sea el tamaño de la grilla
  (redimensionar a 5×5 y a 20×20, comparar).
