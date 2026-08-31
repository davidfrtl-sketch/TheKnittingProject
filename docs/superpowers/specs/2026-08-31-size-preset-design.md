# Diseño: selector de talla estándar (S/M/L/XL)

Fecha: 2026-08-31

## Objetivo

Agregar un tercer selector, "Talla", a la fieldset "Ajustes rápidos" que ya
tiene Fit y Largo ([2026-08-31-fit-length-presets-design.md](2026-08-31-fit-length-presets-design.md)).
Elegir S/M/L/XL rellena las medidas del cuerpo con la tabla estándar del
Craft Yarn Council (ya citada en `docs/tejido-y-patronaje.md`, sección 11),
completada con una tabla propia para las tres medidas que el estándar no
cubre. Mismo mecanismo que Fit/Largo: sigue siendo editable a mano, y
detecta "Personalizado" cuando el valor actual no coincide con ninguna
talla completa.

Referencia (conversación previa): esto cubre el selector "Size" de
Dreamknit (XS-XXL) — elegimos la opción simple, talla-a-la-vez, no la
tabla de grading multi-talla completa con notación "X (Y, Z, W)" (eso
queda documentado como pendiente en `docs/tejido-y-patronaje.md` sección
"Pendiente / próxima capa de complejidad", sin tocar en esta pasada).

## Alcance

Incluido:
- Selector "Talla" con S/M/L/XL, en la misma fieldset "Ajustes rápidos".
- Rellena: `chestCm`, `neckWidthBackCm`, `bicepCm`, `armholeDepthCm`,
  `waistCm`, `hipCm`, `wristCm`, `waistLengthCm`, `sleeveLengthCm` (9
  campos).
- Sincronización en las dos direcciones, igual que Fit/Largo.

Explícitamente fuera de alcance:
- `hemLengthCm` — lo maneja el preset "Largo" ya existente. Los dos
  selectores nunca compiten por el mismo campo.
- Tallas fuera de S/M/L/XL (XS, 2X-5X) — la tabla CYC completa las tiene,
  pero esta pasada se acota a las 4 ya verificadas en el doc de dominio.
- La tabla de grading multi-talla con notación "X (Y, Z, W)" en las
  instrucciones — sigue siendo una talla calculada a la vez.

## Tabla de valores

**De la tabla CYC** (`docs/tejido-y-patronaje.md` sección 11, fuente
craftyarncouncil.com/standards/woman-size — punto medio de cada rango):

| Campo | S | M | L | XL |
|---|---|---|---|---|
| `chestCm` | 83.5 | 94 | 104 | 114.5 |
| `bicepCm` | 26 | 28 | 30.5 | 34.5 |
| `armholeDepthCm` | 17 | 18.25 | 19.75 | 21 |
| `waistCm` | 65.5 | 73.5 | 84 | 94 |
| `hipCm` | 90.25 | 99 | 109 | 119.25 |
| `sleeveLengthCm` | 43 | 43 | 44.5 | 44.5 |

(`sleeveLengthCm` viene de la fila CYC "Arm Length to Underarm" — el
propio valor S=43 casi calca el default actual del formulario, 42.14,
confirmando que mide lo mismo que nuestro `sleeveLengthCm`: axila→puño.)

**Tabla propia** (crecimiento leve, sin estándar externo — ancladas en M
para que coincidan exacto con los defaults actuales del formulario):

| Campo | S | M | L | XL |
|---|---|---|---|---|
| `neckWidthBackCm` | 15 | 16 | 17 | 18 |
| `wristCm` | 11 | 12 | 13.5 | 15 |
| `waistLengthCm` | 14 | 15 | 16 | 17 |

Ninguna talla completa coincide con los valores actuales del formulario
(a diferencia de "Regular" en Fit/Largo) — el selector arranca en
"Personalizado" al cargar la página.

## Cambios en `index.html`

Agregar un tercer `<label>` dentro del `<div class="field-grid">` de la
fieldset "Ajustes rápidos" ya existente:

```html
<label>Talla
  <select id="size-preset-select" class="preset-select">
    <option value="s">S</option>
    <option value="m">M</option>
    <option value="l">L</option>
    <option value="xl">XL</option>
    <option value="custom" selected hidden>Personalizado</option>
  </select>
</label>
```

(`selected` en "Personalizado" porque, a diferencia de Fit/Largo, ninguna
talla real coincide con los defaults del formulario — ver tabla arriba.
`hidden` la sigue sacando del menú desplegable, igual que en Fit/Largo.)

Sin CSS nueva — reutiliza `.preset-select`, ya mergeado.

## Cambios en `app.ts`

Mismo patrón que `FIT_REGULAR`/`FIT_OVERSIZED`: constantes nombradas, sin
`Record` genérico ni `as`. Cada talla es un objeto con los 9 campos:

```ts
const SIZE_S = {
  chestCm: 83.5, neckWidthBackCm: 15, bicepCm: 26, armholeDepthCm: 17,
  waistCm: 65.5, hipCm: 90.25, wristCm: 11, waistLengthCm: 14, sleeveLengthCm: 43,
};
const SIZE_M = {
  chestCm: 94, neckWidthBackCm: 16, bicepCm: 28, armholeDepthCm: 18.25,
  waistCm: 73.5, hipCm: 99, wristCm: 12, waistLengthCm: 15, sleeveLengthCm: 43,
};
const SIZE_L = {
  chestCm: 104, neckWidthBackCm: 17, bicepCm: 30.5, armholeDepthCm: 19.75,
  waistCm: 84, hipCm: 109, wristCm: 13.5, waistLengthCm: 16, sleeveLengthCm: 44.5,
};
const SIZE_XL = {
  chestCm: 114.5, neckWidthBackCm: 18, bicepCm: 34.5, armholeDepthCm: 21,
  waistCm: 94, hipCm: 119.25, wristCm: 15, waistLengthCm: 17, sleeveLengthCm: 44.5,
};

type SizePreset = typeof SIZE_S;

function applySizePreset(size: SizePreset): void {
  setNumberInputValue("chestCm", size.chestCm);
  setNumberInputValue("neckWidthBackCm", size.neckWidthBackCm);
  setNumberInputValue("bicepCm", size.bicepCm);
  setNumberInputValue("armholeDepthCm", size.armholeDepthCm);
  setNumberInputValue("waistCm", size.waistCm);
  setNumberInputValue("hipCm", size.hipCm);
  setNumberInputValue("wristCm", size.wristCm);
  setNumberInputValue("waistLengthCm", size.waistLengthCm);
  setNumberInputValue("sleeveLengthCm", size.sleeveLengthCm);
}

function matchesSizePreset(
  size: SizePreset,
  chestCm: number,
  neckWidthBackCm: number,
  bicepCm: number,
  armholeDepthCm: number,
  waistCm: number,
  hipCm: number,
  wristCm: number,
  waistLengthCm: number,
  sleeveLengthCm: number
): boolean {
  return (
    size.chestCm === chestCm &&
    size.neckWidthBackCm === neckWidthBackCm &&
    size.bicepCm === bicepCm &&
    size.armholeDepthCm === armholeDepthCm &&
    size.waistCm === waistCm &&
    size.hipCm === hipCm &&
    size.wristCm === wristCm &&
    size.waistLengthCm === waistLengthCm &&
    size.sleeveLengthCm === sleeveLengthCm
  );
}
```

`applySizePreset` reuses the existing `setNumberInputValue` helper
(already in `app.ts` from the Fit/Largo plan) — folding 9 calls into one
named function per branch instead of repeating them 4 times, without
needing a generic dictionary keyed by a cast string.

Wiring, added inside `setupPresetSelectors()` (extends the function
Fit/Largo already added — not a new setup function, since it's the same
"presets in the same fieldset" concern):

```ts
const sizeSelect = document.getElementById("size-preset-select");
const chestInput = document.getElementById("chestCm");
const neckInput = document.getElementById("neckWidthBackCm");
const bicepInput = document.getElementById("bicepCm");
const armholeInput = document.getElementById("armholeDepthCm");
const waistInput = document.getElementById("waistCm");
const hipInput = document.getElementById("hipCm");
const wristInput = document.getElementById("wristCm");
const waistLengthInput = document.getElementById("waistLengthCm");
const sleeveLengthInput = document.getElementById("sleeveLengthCm");

if (sizeSelect instanceof HTMLSelectElement) {
  sizeSelect.addEventListener("change", () => {
    if (sizeSelect.value === "s") {
      applySizePreset(SIZE_S);
    } else if (sizeSelect.value === "m") {
      applySizePreset(SIZE_M);
    } else if (sizeSelect.value === "l") {
      applySizePreset(SIZE_L);
    } else if (sizeSelect.value === "xl") {
      applySizePreset(SIZE_XL);
    }
  });
}

const resyncSize = (): void => {
  if (
    !(sizeSelect instanceof HTMLSelectElement) ||
    !(chestInput instanceof HTMLInputElement) ||
    !(neckInput instanceof HTMLInputElement) ||
    !(bicepInput instanceof HTMLInputElement) ||
    !(armholeInput instanceof HTMLInputElement) ||
    !(waistInput instanceof HTMLInputElement) ||
    !(hipInput instanceof HTMLInputElement) ||
    !(wristInput instanceof HTMLInputElement) ||
    !(waistLengthInput instanceof HTMLInputElement) ||
    !(sleeveLengthInput instanceof HTMLInputElement)
  ) {
    return;
  }
  const current: [number, number, number, number, number, number, number, number, number] = [
    chestInput.valueAsNumber,
    neckInput.valueAsNumber,
    bicepInput.valueAsNumber,
    armholeInput.valueAsNumber,
    waistInput.valueAsNumber,
    hipInput.valueAsNumber,
    wristInput.valueAsNumber,
    waistLengthInput.valueAsNumber,
    sleeveLengthInput.valueAsNumber,
  ];
  if (matchesSizePreset(SIZE_S, ...current)) {
    sizeSelect.value = "s";
  } else if (matchesSizePreset(SIZE_M, ...current)) {
    sizeSelect.value = "m";
  } else if (matchesSizePreset(SIZE_L, ...current)) {
    sizeSelect.value = "l";
  } else if (matchesSizePreset(SIZE_XL, ...current)) {
    sizeSelect.value = "xl";
  } else {
    sizeSelect.value = "custom";
  }
};

for (const input of [
  chestInput, neckInput, bicepInput, armholeInput,
  waistInput, hipInput, wristInput, waistLengthInput, sleeveLengthInput,
]) {
  if (input) {
    input.addEventListener("change", resyncSize);
  }
}
```

(el `for...of` sobre un array literal de elementos ya obtenidos —no una
indexación insegura— es seguro bajo `noUncheckedIndexedAccess`: itera
valores, no accede por índice numérico.)

## Casos borde

- Ninguna talla completa coincide con los defaults actuales del
  formulario — el selector arranca en "Personalizado" (con `selected
  hidden` en esa `<option>`), a diferencia de Fit/Largo donde "Regular"
  sí coincidía.
- `hemLengthCm` nunca se toca por este selector — sigue siendo dominio
  exclusivo de "Largo", evitando que dos presets escriban el mismo campo.

## Testing

Sin cobertura de Vitest (mismo criterio que Fit/Largo) — verificación
manual en navegador: elegir cada talla S/M/L/XL rellena los 9 campos
exactos de la tabla; editar cualquiera de los 9 campos a mano pasa el
selector a "Personalizado"; volver a escribir los 9 valores exactos de
una talla completa (ej. "M") vuelve el selector a esa talla; calcular con
una talla activa sigue funcionando (mismo camino que `getNumberInput` ya
usa hoy).
