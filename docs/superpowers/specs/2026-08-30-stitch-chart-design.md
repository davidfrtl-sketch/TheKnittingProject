# Diseño: editor y renderizador de gráfico de punto (trenzas básicas)

Fecha: 2026-08-30

## Objetivo

Poder diseñar y visualizar un motivo de punto (como la cruz de trenzas de
la foto de referencia) usando el alfabeto de símbolos que menciona
CLAUDE.md (sección 13: "modelar cada punto como símbolo... alfabeto de
gráfico") y el gráfico de símbolos CYC de la sección 12 del doc de
dominio. Primera pasada: derecho, revés, y cruce de trenza 2/2 (izquierda
y derecha) — calado y jacquard quedan para después.

## Alcance

Incluido:
- `StitchChart`, el modelo de datos de una grilla de puntos.
- `renderStitchChart(chart: StitchChart): string` — función pura y
  testeada en `src/render/stitchChart.ts`, con leyenda obligatoria y
  lectura de abajo hacia arriba (convención CYC, tejido en redondo).
- Un editor interactivo en `index.html`/`src/web/app.ts`: grilla
  redimensionable, clic para rotar el símbolo de cada celda, un preset de
  ejemplo ("cruz").

Explícitamente fuera de alcance:
- Calado (hebra al aire, k2tog, ssk), jacquard/intarsia multicolor,
  brioche, entrelac.
- Conectar el motivo con el motor de cálculo de forma (el panel de
  espalda real, con su entallado) — esto sigue siendo un diseñador de
  gráfico independiente, como se acordó ("forma primero, motivo después").
- Anchos de cruce configurables — el cruce es siempre 2/2 (4 puntos).

## Modelo de datos

```ts
type StitchSymbol = "k" | "p" | "cl" | "cr";
// k = derecho, p = revés, cl = cruce 2/2 a la izquierda, cr = cruce 2/2 a la derecha

type StitchChart = {
  rows: number;
  cols: number;
  cells: StitchSymbol[][]; // cells[fila][columna], fila 0 = primera fila tejida
};
```

Sin estado auxiliar para "celda consumida por un cruce" — el renderizador
lo infiere escaneando cada fila de izquierda a derecha (ver abajo). Esto
mantiene la grilla siempre uniforme (cada celda tiene un símbolo propio,
aunque a veces ese símbolo quede visualmente tapado por el cruce de la
celda anterior).

## Algoritmo de `renderStitchChart`

Por cada fila (procesada de columna 0 en adelante):
- Si la celda es `'k'` o `'p'`: dibuja un símbolo de 1 celda de ancho,
  avanza 1 columna.
- Si la celda es `'cl'` o `'cr'`: si quedan al menos 3 columnas más en
  esa fila (`columna + 3 < cols`), dibuja un símbolo de cruce de 4 celdas
  de ancho arrancando en esa columna, avanza 4 columnas. Si no alcanzan 3
  columnas más (cerca del borde derecho), lo dibuja como `'k'` (derecho)
  en su lugar — nunca deja un gráfico roto o a medio dibujar — y avanza
  solo 1 columna.

**Orientación**: fila 0 (primera fila tejida) se dibuja en la parte de
ABAJO del gráfico; filas siguientes suben. Todas las filas se leen de
izquierda a derecha (convención "en redondo siempre igual" de la sección
12 del doc de dominio — nuestro panel de espalda se teje en redondo, no
plano, así que no hace falta la alternancia de dirección RS/WS que sí
necesitaría un panel tejido plano).

**Geometría** (constantes): `CELL_SIZE=10`, `MARGIN=4`, `LEGEND_HEIGHT=40`.
- Posición de una celda en fila `i`, columna `j`:
  `x = MARGIN + j*CELL_SIZE`; `y = MARGIN + (rows-1-i)*CELL_SIZE`.
- `viewBox` = `0 0 (cols*CELL_SIZE + 2*MARGIN) (rows*CELL_SIZE + 2*MARGIN + LEGEND_HEIGHT)`.

**Símbolos** (CYC simplificado, con leyenda que aclara el significado
exacto — CLAUDE.md ya advierte que el símbolo "no es 100% universal"):
- `'k'`: celda vacía (solo el borde de la grilla).
- `'p'`: celda con una línea horizontal centrada.
- `'cl'`/`'cr'`: un rectángulo de 4 celdas de ancho con dos líneas
  diagonales formando una cruz (el mismo glifo para ambas direcciones,
  distinguidas por clase CSS `cable-left`/`cable-right` — la leyenda es la
  que aclara cuál pasa por delante y cuál por detrás).

**Interactividad sin lógica en el renderizador**: cada celda (incluido el
rectángulo ancho de un cruce) lleva `data-row`/`data-col` apuntando a la
celda donde arranca en `cells[][]`, para que el código de la página pueda
saber qué posición de la grilla se clickeó, sin que `renderStitchChart`
sepa nada de clics ni de DOM.

**Leyenda**: 4 líneas de texto, una por símbolo, con su significado
completo en palabras (no solo el glifo).

### Verificación a mano (grilla de prueba 6 columnas × 4 filas)

```
fila 3 (arriba):    k  k  k  k  cr p     ← cr en col 4 no alcanza 3 columnas más → cae a k
fila 2:             k  cl k  k  k  k     ← cl en col 1 consume cols 1-4
fila 1:             p  k  k  k  k  p
fila 0 (abajo):     k  k  k  k  k  k
```

- `viewBox="0 0 68 88"` (68 = 6·10+2·4; 88 = 4·10+2·4+40).
- Fila 0 se dibuja en `y=34` (MARGIN+(4-1-0)·10); fila 3 en `y=4`.
- La celda `cl` de la fila 2 (columna 1) dibuja un rectángulo de
  `x=14, y=14, width=40, height=10` (4 celdas: columnas 1 a 4), y la
  columna 5 de esa fila se dibuja como celda `k` normal en `x=54, y=14`.
- La celda `cr` de la fila 3 (columna 4) cae a `k` porque
  `4 + 3 = 7` no es menor que `cols=6` — se dibuja como celda simple en
  `x=44, y=4`; la columna 5 de esa fila (`p`) se dibuja en `x=54, y=4`,
  independiente.

Este es el test de regresión: confirma el caso normal (`k`/`p`), el cruce
exitoso, y el cruce que cae a `k` por falta de espacio, en una sola grilla
chica.

## Editor interactivo

**Controles nuevos** (sección aparte en `index.html`, con su propio
`<script>` de wiring en `src/web/app.ts`, independiente del formulario de
medidas):
- Inputs de filas/columnas + botón "Redimensionar" — crea una grilla
  nueva del tamaño pedido, toda en `'k'`. No preserva el contenido
  anterior (simplificación aceptada para esta primera pasada).
- Grilla por defecto: 7 filas × 13 columnas, toda en `'k'`.
- Clic en cualquier celda (delegación de eventos sobre el contenedor del
  SVG, leyendo `data-row`/`data-col` del elemento clickeado más cercano):
  rota el símbolo en `cells[fila][columna]` — `k → p → cl → cr → k` — y
  vuelve a renderizar.
- Botón "Cargar cruz de ejemplo": reemplaza la grilla actual por un
  motivo fijo de 13×13 con una cruz en revés sobre fondo derecho y cruces
  de trenza en los bordes verticales — solo para tener algo interesante
  para ver sin clickear celda por celda. No es parte de lo que se testea
  (es contenido de demostración en el código de la página, no lógica de
  cálculo).

**Estado**: el grafo de puntos (`StitchChart`) vive como variable en
memoria en `src/web/app.ts`, igual que el resto de la página no tiene
persistencia — se pierde al recargar.

## Testing

`renderStitchChart` es una función pura → test de regresión contra la
grilla de 6×4 verificada arriba, comprobando: `viewBox`, la presencia y
posición del rectángulo de 4 celdas del cruce exitoso, que el cruce
fallido efectivamente se dibuje como celda simple (no como cruce roto), y
que los 4 textos de la leyenda estén presentes.

El editor interactivo (grilla, clics, redimensionar, preset) se verifica
a mano en el navegador — mismo criterio que el resto de `src/web/app.ts`,
sin cobertura de Vitest.

## Fuera de discusión en este spec

Conectar este motivo con el panel real de espalda (que tiene su propio
entallado y cambia de ancho) es un problema genuinamente distinto —
requeriría decidir qué pasa con el motivo cuando el panel se angosta o
ensancha, y queda para una pasada futura si se decide encararlo.
