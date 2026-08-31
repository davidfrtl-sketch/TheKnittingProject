# Diseño: elegir manualmente el tramo del motivo (sin competencia automática)

Fecha: 2026-08-31

## Objetivo

El motivo-sobre-esquema ([2026-08-31-motif-schematic-overlay-design.md](2026-08-31-motif-schematic-overlay-design.md),
ya mergeado) elegía automáticamente el tramo más largo entre cintura,
cadera y manga, sin que el usuario pudiera intervenir. Este cambio
reemplaza esa competencia automática por una selección manual: el usuario
ve todos los tramos utilizables y elige cuál usar, con el más largo
preseleccionado por defecto.

## Alcance

Incluido:
- `findMotifCandidates(plan): MotifSource[]` en
  `src/engine/motifPlacement.ts`, **reemplazando** `findMotifSource`
  (se elimina, no queda como código muerto) — devuelve todos los tramos
  con `rowCount >= 2` (los "utilizables"), ordenados de mayor a menor
  cantidad de filas; en empate, se mantiene la prioridad fija
  `bodyWaist > bodyHem > sleeve` ya usada antes (ahora expresada como
  orden estable de inserción antes del sort, no como un "ganador" único).
- Un `<select>` nuevo en la tarjeta "Esquema" de `index.html`, poblado
  después de cada "Calcular" con una opción por candidato (ej.
  `"Manga — 6 filas, 72 puntos"`), preseleccionado en el primero (el más
  largo). Oculto por completo si no hay ningún candidato.
- Cambiar la selección re-dibuja el esquema al instante con el tramo
  elegido, reutilizando el `renderSchematicSvg` ya existente (su firma
  **no cambia** — ya acepta cualquier `MotifSource | null`, el cambio es
  solo en qué le pasamos desde `app.ts`).
- Cada click en "Calcular" repuebla las opciones desde cero y reinicia la
  selección al más largo del nuevo cálculo — no intenta preservar la
  elección anterior si cambian las medidas.
- Editar el motivo en el editor de puntos (clic, redimensionar, preset)
  sigue refrescando el esquema en vivo, ahora usando el tramo
  **actualmente seleccionado** en el `<select>`, no siempre el más largo.

Explícitamente fuera de alcance (hereda lo ya acordado en el spec
anterior): tramos con entallado, edición del motivo desde el esquema,
refactor de `stitchChart.ts`/`motifTile.ts`, mostrar el motivo en más de
un tramo a la vez.

## `findMotifCandidates`

Reemplaza por completo `findMotifSource` en
`src/engine/motifPlacement.ts` (mismos tipos `MotifSegment`, `MotifSource`,
`MotifPlacementInput`, mismo helper interno `longestRun`):

```ts
export function findMotifCandidates(plan: MotifPlacementInput): MotifSource[] {
  const scheduleBySegment: Record<MotifSegment, TaperRow[]> = {
    bodyWaist: plan.bodyWaistTaper.schedule,
    bodyHem: plan.bodyHemTaper.schedule,
    sleeve: plan.sleeveLeftTaper.schedule,
  };

  const candidates: Array<{ segment: MotifSegment; run: Run }> = [];
  for (const segment of SEGMENT_ORDER) {
    const run = longestRun(scheduleBySegment[segment]);
    if (run && run.rowCount > 1) {
      candidates.push({ segment, run });
    }
  }

  candidates.sort((a, b) => b.run.rowCount - a.run.rowCount);

  return candidates.map(({ segment, run }) => ({
    segment,
    startRow: run.startRow,
    rowCount: run.rowCount,
    stitches: run.stitches,
  }));
}
```

`Array.prototype.sort` is stable (guaranteed by the ES2019+ spec, and this
project's `tsconfig.json` targets a modern enough runtime), so candidates
with equal `rowCount` keep the `SEGMENT_ORDER` push order
(`bodyWaist, bodyHem, sleeve`) — this is exactly how the old tie-break
priority is preserved without a separate "winner" concept. The former
`findMotifSource(plan)` is now simply `findMotifCandidates(plan)[0] ?? null`
— callers that want "the best one" take the first array element.

### Caso de verificación a mano

Con el mismo `TaperRow[]` de ejemplo del spec anterior:

```
bodyWaistTaper: longest run = { startRow:3, rowCount:3, stitches:98 }
bodyHemTaper:   longest run = { startRow:2, rowCount:2, stitches:82 }
sleeveLeftTaper: longest run = { startRow:1, rowCount:2, stitches:40 }
```

`findMotifCandidates` devuelve, en este orden:

```ts
[
  { segment: "bodyWaist", startRow: 3, rowCount: 3, stitches: 98 },
  { segment: "bodyHem",   startRow: 2, rowCount: 2, stitches: 82 },
  { segment: "sleeve",    startRow: 1, rowCount: 2, stitches: 40 },
]
```

(bodyHem antes que sleeve pese a igual `rowCount`, por el orden estable de
inserción — no por comparar `stitches` ni ningún otro campo).

## UI: `<select>` de tramo

En `index.html`, dentro de la tarjeta "Esquema" (antes de `#svg-container`):

```html
<div id="motif-select-wrapper" hidden>
  <label for="motif-segment-select">Motivo en:</label>
  <select id="motif-segment-select"></select>
</div>
```

CSS nueva (mismo lenguaje visual que el resto del formulario — borde
sólido de 2px, sin bordes redondeados, tipografía de cuerpo):

```css
#motif-select-wrapper { margin-bottom: 10px; font-size: 13px; }
#motif-segment-select {
  font-family: var(--font-body);
  font-size: 13px;
  padding: 4px 6px;
  border: 2px solid var(--ink);
  border-radius: 0;
  background: var(--paper);
  color: var(--ink);
}
```

**Etiquetas de las opciones** (segmento → texto visible):

```ts
const SEGMENT_LABELS: Record<MotifSegment, string> = {
  bodyWaist: "Cintura",
  bodyHem: "Cadera",
  sleeve: "Manga",
};
```

Texto de cada `<option>`: `"${SEGMENT_LABELS[segment]} — ${rowCount} filas, ${stitches} puntos"`.
`value` de cada `<option>` es el propio `segment` (string), único entre los
candidatos devueltos (nunca hay dos candidatos con el mismo `segment`).

## Cambios en `app.ts`

Estado de módulo nuevo (junto a `currentChart`/`lastPlan`/`lastGauge`
existentes):

```ts
let motifCandidates: MotifSource[] = [];
let selectedMotifSource: MotifSource | null = null;
```

Nueva función que puebla el `<select>` y sincroniza su visibilidad:

```ts
const SEGMENT_LABELS: Record<MotifSegment, string> = {
  bodyWaist: "Cintura",
  bodyHem: "Cadera",
  sleeve: "Manga",
};

function populateMotifSelect(candidates: MotifSource[]): void {
  const wrapper = document.getElementById("motif-select-wrapper");
  const select = document.getElementById("motif-segment-select");
  if (!wrapper || !(select instanceof HTMLSelectElement)) {
    return;
  }
  select.innerHTML = "";
  for (const candidate of candidates) {
    const option = document.createElement("option");
    option.value = candidate.segment;
    option.textContent = `${SEGMENT_LABELS[candidate.segment]} — ${candidate.rowCount} filas, ${candidate.stitches} puntos`;
    select.appendChild(option);
  }
  wrapper.hidden = candidates.length === 0;
  const first = candidates[0];
  if (first) {
    select.value = first.segment;
  }
}
```

(la indexación `candidates[0]` queda en una variable propia y se comprueba
explícitamente contra `undefined` antes de usarla — sin el operador `!`,
por la regla de `noUncheckedIndexedAccess` del proyecto).

`calculate()` cambia su bloque de motivo (donde hoy llama a
`findMotifSource`):

```ts
const candidates = findMotifCandidates(plan);
motifCandidates = candidates;
const first = candidates[0];
selectedMotifSource = first ?? null;
populateMotifSelect(candidates);
const svg = renderSchematicSvg(geometry, currentChart, gauge, selectedMotifSource);
```

El `catch` de `calculate()` gana, junto a los `lastPlan = null; lastGauge = null;`
que ya tiene:

```ts
motifCandidates = [];
selectedMotifSource = null;
```

(y `populateMotifSelect([])` para ocultar el `<select>` si quedó visible
de un cálculo anterior).

`refreshSchematicIfCalculated()` deja de llamar a `findMotifSource` —
reutiliza `selectedMotifSource` tal cual está (no lo recalcula, porque
`lastPlan` no cambió, solo cambió el motivo dibujado dentro):

```ts
function refreshSchematicIfCalculated(): void {
  const resultBox = document.getElementById("result-box");
  const svgContainer = document.getElementById("svg-container");
  if (!resultBox || resultBox.hidden || !svgContainer || !lastPlan || !lastGauge) {
    return;
  }
  const geometry = computeSchematicGeometry(lastPlan, lastGauge);
  svgContainer.innerHTML = renderSchematicSvg(geometry, currentChart, lastGauge, selectedMotifSource);
}
```

Nuevo listener en `setupChartEditor()` (o donde se registren los listeners
de la página) para el `<select>`:

```ts
const motifSelect = document.getElementById("motif-segment-select");
if (motifSelect) {
  motifSelect.addEventListener("change", () => {
    if (!(motifSelect instanceof HTMLSelectElement)) {
      return;
    }
    const match = motifCandidates.find((candidate) => candidate.segment === motifSelect.value);
    selectedMotifSource = match ?? null;
    refreshSchematicIfCalculated();
  });
}
```

## Casos borde

- `findMotifCandidates` devuelve `[]`: `populateMotifSelect([])` oculta el
  wrapper, `selectedMotifSource` queda `null`, el esquema se dibuja sin
  motivo — igual que el comportamiento actual sin cambios.
- El usuario cambia medidas y vuelve a calcular: `calculate()` siempre
  repuebla y reselecciona el primero, sin importar qué había elegido antes
  (decisión explícita — ver historial de la conversación).

## Testing

- `tests/engine/motifPlacement.test.ts` se reescribe para
  `findMotifCandidates` (ya no existe `findMotifSource`): un caso con los
  3 candidatos usables (verifica el orden descendente por `rowCount`), un
  caso de empate total entre los 3 (verifica que el orden estable de
  inserción desempata igual que antes), un caso donde solo 1 fase es
  usable (verifica el filtro `rowCount > 1`), y el caso sin ningún tramo
  usable (`[]`).
- `tests/render/schematicSvg.test.ts`: el único cambio es en el test
  end-to-end existente ("keeps the motif tile within the sleeve panel's
  real edges") — donde hoy llama `findMotifSource(realPlan)`, pasa a
  llamar `findMotifCandidates(realPlan)[0]` (con el mismo guard explícito
  de `undefined`/`null` que ya tiene, sin el operador `!`). El resto del
  archivo (todo lo que prueba `renderSchematicSvg` en sí) no cambia, porque
  su firma no cambia.
- `app.ts`/`index.html`: sin cobertura de Vitest, igual que el resto de la
  capa web — verificación manual en navegador: aparecen las opciones
  correctas después de Calcular, el más largo queda preseleccionado,
  cambiar la selección redibuja el esquema con el tramo elegido, editar el
  motivo después de cambiar de tramo sigue usando el tramo elegido (no
  vuelve al más largo), y volver a Calcular reinicia la selección.
