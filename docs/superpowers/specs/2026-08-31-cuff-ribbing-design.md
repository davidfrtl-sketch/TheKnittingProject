# Diseño: canalé del puño (1x1 / 2x2)

Fecha: 2026-08-31

## Objetivo

Extender el canalé opcional ([2026-08-31-hem-ribbing-design.md](2026-08-31-hem-ribbing-design.md),
ya mergeado) al **puño de manga** — mismo mecanismo, misma función
`computeHemFinish`, aplicado a un tubo distinto. Esto es prácticamente
reutilización pura: `computeHemFinish(gauge, stitches, params)` ya no sabe
nada de "ruedo" específicamente, solo valida un conteo de puntos contra
una estructura de canalé y calcula filas — funciona igual para cualquier
tubo tejido en redondo.

## Hallazgo clave: el puño izquierdo y derecho siempre dan la misma cantidad final de puntos

Revisando `garmentPlan.ts` y `computeTaper`: `sleeveLeftTaper` y
`sleeveRightTaper` pueden arrancar con distinta cantidad de puntos (si el
reparto del faltante en axila fue asimétrico — `axilaJoin.ts` usa
`splitLeftHeavy`, que reparte impares a favor del lado izquierdo), pero
**ambos apuntan al mismo `wristTargetStitches`** como destino, y
`computeTaper` siempre termina exactamente en el `endStitches` pedido,
sin importar el punto de partida. Por lo tanto
`sleeveLeftTaper.finalStitches === sleeveRightTaper.finalStitches` siempre
— no hace falta validar ni calcular el canalé dos veces, ni preocuparse
por una divergencia entre mangas.

## Alcance

Incluido:
- Reutiliza `RibStructure`, `HemFinishParams`, `computeHemFinish` — sin
  cambios de tipos ni de lógica. Un solo ajuste necesario: el mensaje de
  error de `computeHemFinish` decía literalmente "El ruedo tiene..."
  hardcodeado, lo cual queda mal cuando el problema en realidad está en
  la manga/muñeca. Se generaliza a un mensaje sin contexto de pieza:
  `` `No se puede aplicar el canalé ${params.structure}: hay ${combinedFinalStitches} puntos, que no es múltiplo de ${repeat}.` ``
  (antes de agregar el segundo consumidor, no después — para que el
  puño nunca llegue a mostrar el texto equivocado).
- `computeGarmentPlan` gana un **séptimo parámetro opcional**
  `cuffFinishParams?: HemFinishParams`, y `GarmentPlan` gana
  `cuffFinish: HemFinishResult | null` — mismo patrón que `hemFinish`,
  calculado sobre `sleeveLeftTaper.finalStitches` (da igual cuál de los
  dos, son siempre iguales, ver hallazgo arriba).
- Instrucciones: una única sección compartida **"Puño (ambas mangas)"**
  (no dos secciones separadas como el entallado de manga hoy, porque el
  resultado es siempre idéntico para las dos — repetir texto idéntico dos
  veces no aporta nada).
- Web tool: mismo patrón de fieldset que "Terminación del ruedo", ahora
  "Terminación del puño".

Explícitamente fuera de alcance (igual que antes): cuello, canalé
torcido, borde enrollado, i-cord, cambios al esquema SVG (mismo hueco
conocido ya documentado: el esquema no crece con el canalé activo).

## Cambios en `garmentPlan.ts`

```ts
export type GarmentPlan = {
  yoke: RaglanYokeResult;
  axilaJoin: AxilaJoinResult;
  bodyWaistTaper: TaperResult;
  bodyHemTaper: TaperResult;
  sleeveLeftTaper: TaperResult;
  sleeveRightTaper: TaperResult;
  hemFinish: HemFinishResult | null;
  cuffFinish: HemFinishResult | null;
};

export function computeGarmentPlan(
  gauge: Gauge,
  ease: Ease,
  measurements: GarmentMeasurements,
  necklineParams: NecklineParams,
  constructionParams: YokeConstructionParams,
  hemFinishParams?: HemFinishParams,
  cuffFinishParams?: HemFinishParams
): GarmentPlan {
  // ... todo el cálculo existente sin cambios, hasta sleeveRightTaper y hemFinish ...

  const cuffFinish = cuffFinishParams
    ? computeHemFinish(gauge, sleeveLeftTaper.finalStitches, cuffFinishParams)
    : null;

  return {
    yoke,
    axilaJoin,
    bodyWaistTaper,
    bodyHemTaper,
    sleeveLeftTaper,
    sleeveRightTaper,
    hemFinish,
    cuffFinish,
  };
}
```

`hemFinishParams` y `cuffFinishParams` son dos parámetros **independientes**
— nada obliga a elegir el mismo canalé (o ninguno) para ruedo y puño, cada
uno se valida y calcula por separado contra su propio conteo de puntos.

## Cambios en `instructionsRenderer.ts`

Nueva función privada, mismo patrón que `renderHemFinishSection` pero leyendo
`plan.cuffFinish` y `plan.sleeveLeftTaper.finalStitches`, con el texto
"Puño (ambas mangas)" en vez de "Canalé":

```ts
function renderCuffFinishSection(plan: GarmentPlan): string | null {
  if (!plan.cuffFinish) {
    return null;
  }
  const { structure, rows } = plan.cuffFinish;
  const stitches = plan.sleeveLeftTaper.finalStitches;
  const patternText = RIB_PATTERN_TEXT[structure];
  const rowsWord = rows === 1 ? "vuelta" : "vueltas";
  return (
    `Puño (ambas mangas) — canalé ${structure} (${stitches} puntos, ${rows} ${rowsWord}): ` +
    `${patternText}, repetir hasta el final. Cerrar puntos.`
  );
}
```

En `renderInstructions`, se agrega DESPUÉS de `renderHemFinishSection`
(mismo patrón condicional):

```ts
export function renderInstructions(plan: GarmentPlan): string {
  const sections = [
    renderCastOnSection(plan),
    renderYokeSection(plan),
    renderAxilaSection(plan),
    renderTaperStage("Cintura", plan.axilaJoin.bodyStartStitches, plan.bodyWaistTaper),
    renderTaperStage("Cadera / ruedo", plan.bodyWaistTaper.finalStitches, plan.bodyHemTaper),
    renderTaperStage("Manga izquierda", plan.axilaJoin.sleeveLeftStartStitches, plan.sleeveLeftTaper),
    renderTaperStage("Manga derecha", plan.axilaJoin.sleeveRightStartStitches, plan.sleeveRightTaper),
  ];
  const hemFinishSection = renderHemFinishSection(plan);
  if (hemFinishSection) {
    sections.push(hemFinishSection);
  }
  const cuffFinishSection = renderCuffFinishSection(plan);
  if (cuffFinishSection) {
    sections.push(cuffFinishSection);
  }
  return sections.join("\n\n");
}
```

## Cambios en la web tool

Nuevo fieldset en `index.html`, después de "Terminación del ruedo",
mismo patrón exacto (otro par de `<select>`/`<input>` con ids distintos:
`cuff-rib-structure`, `cuffRibLengthCm`):

```html
<fieldset>
  <legend>Terminación del puño</legend>
  <div class="field-grid">
    <label>Canalé
      <select id="cuff-rib-structure">
        <option value="none" selected>Sin canalé</option>
        <option value="1x1">1x1</option>
        <option value="2x2">2x2</option>
      </select>
    </label>
    <label>Largo del canalé (cm) <input type="number" id="cuffRibLengthCm" value="5" step="any" min="0"></label>
  </div>
</fieldset>
```

(`min="0"` desde el arranque — la revisión final del canalé del ruedo ya
encontró que hacía falta, así que esta vez se incluye directo.)

En `app.ts`, mismo patrón que `hemFinishParams`, calculado en paralelo:

```ts
const cuffRibStructureEl = document.getElementById("cuff-rib-structure");
const cuffRibStructureValue =
  cuffRibStructureEl instanceof HTMLSelectElement ? cuffRibStructureEl.value : "none";

let cuffFinishParams: HemFinishParams | undefined;
if (cuffRibStructureValue === "1x1" || cuffRibStructureValue === "2x2") {
  cuffFinishParams = {
    structure: cuffRibStructureValue,
    lengthCm: getNumberInput("cuffRibLengthCm"),
  };
}

const plan = computeGarmentPlan(
  gauge,
  ease,
  measurements,
  necklineParams,
  constructionParams,
  hemFinishParams,
  cuffFinishParams
);
```

## Testing

- `tests/engine/garmentPlan.test.ts`: agregar los mismos 3 tipos de test
  que ya existen para `hemFinish` (null por defecto, resultado correcto
  con parámetros, error propagado), ahora para `cuffFinish`. Verificado
  contra el motor real: con las medidas estándar del fixture
  (`wristCm: 12`, `sleeveEaseCm: 6`), `sleeveLeftTaper.finalStitches = 36`
  (igual a `sleeveRightTaper.finalStitches`, confirmando el hallazgo de
  arriba) — divisible por 2 y por 4, sirve para el caso válido de ambas
  estructuras. Para el caso de error, `wristCm: 13` (todo lo demás igual)
  da `sleeveLeftTaper.finalStitches = 38` — par, pero `38 % 4 = 2`, el
  caso exacto que necesita la validación de 2x2.
- `tests/render/instructionsRenderer.test.ts`: un test con canalé de puño
  activo confirmando el texto exacto de "Puño (ambas mangas)"; un test
  sin canalé de puño confirmando que esa sección no aparece (no
  regresión, sin afectar la sección de canalé del ruedo que puede estar
  activa o no independientemente).
- `app.ts`: sin cobertura de Vitest, verificación manual — mismo checklist
  que el canalé del ruedo, aplicado al fieldset de puño, más un caso
  cruzado confirmando que activar canalé de ruedo Y canalé de puño a la
  vez (con estructuras distintas, ej. 1x1 en el ruedo y 2x2 en el puño)
  produce ambas secciones correctamente en las instrucciones.
