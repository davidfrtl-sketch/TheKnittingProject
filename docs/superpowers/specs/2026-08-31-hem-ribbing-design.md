# Diseño: canalé del ruedo (1x1 / 2x2)

Fecha: 2026-08-31

## Objetivo

Agregar la primera terminación real del proyecto: canalé opcional al final
del ruedo del cuerpo (1x1 o 2x2), tejido durante N filas sobre la misma
cantidad de puntos ya calculada por el entallado, y después cerrado. Es
matemática nueva — hasta ahora el proyecto solo calculaba forma (canesú,
escote, entallado), nunca técnicas de acabado de borde.

Retomando `docs/tejido-y-patronaje.md`, sección "Cuellera": esa nota es
sobre otra cosa (cuántos puntos levantar en un borde horizontal vs.
diagonal, para el escote) — este spec es la pieza de terminaciones que
todavía no existía: estructura de canalé, largo, tipo de acabado.

## Alcance

Incluido:
- Solo el **ruedo del cuerpo** (no puño de manga, no cuello — quedan para
  pasadas futuras, el escote en particular es más complejo porque necesita
  levantar puntos sobre una curva).
- Estructuras: **1x1** y **2x2** únicamente (ambas se arman con
  derecho/revés, el mismo alfabeto que ya existe — "torcido" necesita un
  símbolo nuevo, "sin canalé" no es una estructura sino la ausencia de
  parámetro).
- Un solo tipo de acabado: **canalé + cierre normal**. Borde enrollado e
  i-cord son técnicas alternativas con su propia matemática — quedan fuera.
- Validación estricta: si la cantidad de puntos del ruedo no es múltiplo
  del canalé elegido (2 para 1x1, 4 para 2x2), error claro — nunca ajuste
  silencioso (mismo criterio que ya usa `computeTaper` para el reparto
  entallado/par).
- El parámetro es **opcional**: si no se pasa, el `GarmentPlan` no cambia
  en nada respecto a hoy (retrocompatible con todo el código existente).

Explícitamente fuera de alcance:
- Puño de manga y cuello.
- Canalé torcido, sin-canalé como opción explícita, borde enrollado, i-cord.
- Cambios al esquema SVG — la silueta no cambia (el canalé no altera
  ancho, solo agrega filas al final), así que solo cambian las
  instrucciones escritas.

## Modelo de datos

Nuevo archivo `src/domain/ribbing.ts`:

```ts
export type RibStructure = "1x1" | "2x2";

export type HemFinishParams = {
  structure: RibStructure;
  lengthCm: number;
};

export const RIB_STITCH_REPEAT: Record<RibStructure, number> = {
  "1x1": 2,
  "2x2": 4,
};
```

(El `Record<RibStructure, number>` es seguro sin `as`: `RibStructure` es
un union literal ya tipado en tiempo de compilación, no un string crudo
del DOM — distinto del caso que evitamos en `app.ts` con los presets,
donde el valor viene de `select.value: string` y necesitaría un cast para
volver al union.)

## `computeHemFinish` (nuevo, `src/engine/hemFinish.ts`)

```ts
export type HemFinishResult = {
  structure: RibStructure;
  rows: number;
};

export function computeHemFinish(
  gauge: Gauge,
  combinedFinalStitches: number,
  params: HemFinishParams
): HemFinishResult {
  const repeat = RIB_STITCH_REPEAT[params.structure];
  if (combinedFinalStitches % repeat !== 0) {
    throw new Error(
      `El ruedo tiene ${combinedFinalStitches} puntos, pero el canalé ${params.structure} necesita un múltiplo de ${repeat}.`
    );
  }

  return {
    structure: params.structure,
    rows: rowsForCm(gauge, params.lengthCm),
  };
}
```

`combinedFinalStitches` es el conteo COMBINADO del tubo (espalda+delantero
juntos, ya que el cuerpo se teje en redondo como una sola pieza) — el
mismo valor que ya existe en `plan.bodyHemTaper.finalStitches`, no un
valor nuevo a calcular.

**Nota**: por construcción, `computeTaper` ya garantiza que todo cambio de
puntos sea par (regla del raglan), así que `combinedFinalStitches` siempre
será par — el canalé 1x1 (múltiplo de 2) nunca puede fallar en la práctica
a través del pipeline completo. El canalé 2x2 (múltiplo de 4) sí puede
fallar, y es el caso real que la validación existe para atrapar.

## Cambios en `garmentPlan.ts`

`computeGarmentPlan` gana un sexto parámetro **opcional**:

```ts
export type GarmentPlan = {
  yoke: RaglanYokeResult;
  axilaJoin: AxilaJoinResult;
  bodyWaistTaper: TaperResult;
  bodyHemTaper: TaperResult;
  sleeveLeftTaper: TaperResult;
  sleeveRightTaper: TaperResult;
  hemFinish: HemFinishResult | null;
};

export function computeGarmentPlan(
  gauge: Gauge,
  ease: Ease,
  measurements: GarmentMeasurements,
  necklineParams: NecklineParams,
  constructionParams: YokeConstructionParams,
  hemFinishParams?: HemFinishParams
): GarmentPlan {
  // ... todo el cálculo existente sin cambios, hasta bodyHemTaper ...

  const hemFinish = hemFinishParams
    ? computeHemFinish(gauge, bodyHemTaper.finalStitches, hemFinishParams)
    : null;

  return { yoke, axilaJoin, bodyWaistTaper, bodyHemTaper, sleeveLeftTaper, sleeveRightTaper, hemFinish };
}
```

Como el parámetro es opcional y `hemFinish` es `null` cuando se omite,
ningún llamador existente (tests, `app.ts`, `Pick<GarmentPlan, ...>` de
`motifPlacement.ts`) se rompe.

## Cambios en `instructionsRenderer.ts`

Nueva función privada, agregada como sección final SOLO si
`plan.hemFinish` no es `null`:

```ts
function renderHemFinishSection(plan: GarmentPlan): string | null {
  if (!plan.hemFinish) {
    return null;
  }
  const { structure, rows } = plan.hemFinish;
  const stitches = plan.bodyHemTaper.finalStitches;
  const patternText = structure === "1x1" ? "*1 derecho, 1 revés*" : "*2 derecho, 2 revés*";
  const rowsWord = rows === 1 ? "vuelta" : "vueltas";
  return (
    `Canalé ${structure} (${stitches} puntos, ${rows} ${rowsWord}): ${patternText}, repetir hasta el final. ` +
    `Cerrar puntos.`
  );
}
```

En `renderInstructions`, se agrega al final del array de secciones,
condicionalmente:

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
  return sections.join("\n\n");
}
```

Sin canalé (`hemFinish: null`), la salida es byte-a-byte idéntica a hoy.

## Cambios en la web tool

Nuevo fieldset en `index.html`, después de "Construcción":

```html
<fieldset>
  <legend>Terminación del ruedo</legend>
  <div class="field-grid">
    <label>Canalé
      <select id="hem-rib-structure">
        <option value="none" selected>Sin canalé</option>
        <option value="1x1">1x1</option>
        <option value="2x2">2x2</option>
      </select>
    </label>
    <label>Largo del canalé (cm) <input type="number" id="hemRibLengthCm" value="5" step="any"></label>
  </div>
</fieldset>
```

(`<select>` normal, sin `class="preset-select"` — esto no es un preset que
rellena otros campos, es un parámetro propio.)

En `app.ts`, dentro de `calculate()`, antes de llamar
`computeGarmentPlan`:

```ts
const hemRibStructureEl = document.getElementById("hem-rib-structure");
const hemRibStructureValue =
  hemRibStructureEl instanceof HTMLSelectElement ? hemRibStructureEl.value : "none";

let hemFinishParams: HemFinishParams | undefined;
if (hemRibStructureValue === "1x1" || hemRibStructureValue === "2x2") {
  hemFinishParams = {
    structure: hemRibStructureValue,
    lengthCm: getNumberInput("hemRibLengthCm"),
  };
}

const plan = computeGarmentPlan(gauge, ease, measurements, necklineParams, constructionParams, hemFinishParams);
```

(La comparación `=== "1x1" || === "2x2"` angosta el tipo de
`hemRibStructureValue` de `string` a `RibStructure` sin necesitar `as` —
TypeScript ya lo infiere de las dos comparaciones literales. Cuando el
`<select>` está en "Sin canalé", `getNumberInput("hemRibLengthCm")` ni
siquiera se llama, así que un campo de largo vacío/inválido no genera un
error molesto para quien no usa canalé.)

Default: "Sin canalé" — nadie que no toque este fieldset ve ningún cambio
de comportamiento.

## Barrels

- `src/engine/index.ts`: agregar `export * from "./hemFinish.js";`
  (alfabético, entre `garmentPlan.js` y `motifPlacement.js`).
- `src/domain/index.ts`: el archivo actual (`gauge.js`, `ease.js`,
  `measurements.js`, `neckline.js`, `construction.js`) no sigue orden
  alfabético — es orden de inserción cronológico. Agregar
  `export * from "./ribbing.js";` al final, después de `construction.js`,
  siguiendo esa misma convención.

## Testing

- `tests/engine/hemFinish.test.ts` (nuevo, puro, sin pasar por
  `computeGarmentPlan`): 1x1 válido, 2x2 válido, 1x1 con cantidad impar
  (error), 2x2 con cantidad par pero no múltiplo de 4 (error).
- `tests/engine/garmentPlan.test.ts`: agregar un test confirmando
  `hemFinish: null` cuando no se pasa el parámetro (retrocompatibilidad);
  un test con `hemFinishParams` pasado confirmando el resultado; un test
  con una medida de cadera que produce un conteo par-pero-no-múltiplo-de-4
  confirmando que el error de `computeHemFinish` se propaga a través de
  `computeGarmentPlan`.
- `tests/render/instructionsRenderer.test.ts`: un test con canalé activo
  confirmando el texto exacto de la sección nueva; un test sin canalé
  confirmando que la palabra "Canalé" no aparece en absoluto (no
  regresión).
- `app.ts`: sin cobertura de Vitest (igual que el resto del archivo) —
  verificación manual: elegir "2x2" con medidas que no sean múltiplo de 4
  muestra el error esperado en `#error-box`; elegir "1x1" o "2x2" con
  medidas compatibles agrega el párrafo de canalé a las instrucciones;
  dejar "Sin canalé" no cambia nada respecto al comportamiento actual.
