# Diseño: presets de Fit y Largo

Fecha: 2026-08-31

## Objetivo

Agregar dos selectores en la herramienta web ("Fit" y "Largo") que rellenan
campos numéricos ya existentes (`bodyEaseCm`/`sleeveEaseCm`, `hemLengthCm`)
con valores estándar, sin ocultarlos ni reemplazarlos — siguen siendo
editables a mano, y el selector detecta cuándo el valor actual ya no
coincide con ningún preset. Es puramente una conveniencia de UI: no toca el
motor de cálculo ni ningún tipo de dominio.

Comparado contra la referencia de Dreamknit (ver conversación previa), esto
cubre su selector de "Fit" (Regular/Oversized fit) y "Length"
(Cropped/Regular/Long), que ahí son la manera amigable de fijar la holgura
y el largo sin que el usuario piense en centímetros — nosotros los tratamos
como un atajo hacia los mismos campos en cm, nunca como el único camino
(el proyecto exige que gauge/ease sigan siendo parámetros reales, no
constantes ocultas — ver CLAUDE.md).

## Alcance

Incluido:
- Preset de **Fit**: "Regular" y "Oversized", rellenando `bodyEaseCm` y
  `sleeveEaseCm`.
- Preset de **Largo**: "Cropped", "Regular" y "Long", rellenando
  `hemLengthCm` únicamente (no toca `waistLengthCm` ni `sleeveLengthCm` —
  el largo de manga es una decisión aparte, ya cubierta por el estilo de
  manga en la referencia de Dreamknit, fuera de este alcance).
- Sincronización en las dos direcciones: elegir un preset rellena los
  inputs; editar los inputs a mano actualiza el `<select>` a la opción que
  coincida exacto, o a "Personalizado" si no coincide con ninguna.

Explícitamente fuera de alcance:
- Cualquier preset de escote, manga, o puntos de raglan (temas separados
  de la comparación con Dreamknit, no pedidos en esta pasada).
- Cambiar `waistLengthCm` o `sleeveLengthCm` por el preset de Largo.

## Valores de los presets

**Fit** (categorías CYC ya documentadas en `docs/tejido-y-patronaje.md`
línea 73 — "clásico" y "oversized"):

| Preset | `bodyEaseCm` | `sleeveEaseCm` |
|---|---|---|
| Regular | 8 | 6 |
| Oversized | 20 | 14 |

(Regular coincide exacto con los valores por defecto actuales del
formulario — no cambia nada para quien no toca el selector.)

**Largo** (sin estándar externo citado — definido para este proyecto):

| Preset | `hemLengthCm` |
|---|---|
| Cropped | 10 |
| Regular | 12.14 |
| Long | 30 |

(Regular coincide exacto con el valor por defecto actual.)

## Markup nuevo en `index.html`

Nuevo fieldset, entre "Gauge" y "Ease":

```html
<fieldset>
  <legend>Ajustes rápidos</legend>
  <div class="field-grid">
    <label>Fit
      <select id="fit-preset-select">
        <option value="regular" selected>Regular</option>
        <option value="oversized">Oversized</option>
        <option value="custom" hidden>Personalizado</option>
      </select>
    </label>
    <label>Largo
      <select id="length-preset-select">
        <option value="cropped">Cropped</option>
        <option value="regular" selected>Regular</option>
        <option value="long">Long</option>
        <option value="custom" hidden>Personalizado</option>
      </select>
    </label>
  </div>
</fieldset>
```

(`hidden` en la opción "Personalizado" la saca del menú desplegable en la
mayoría de los navegadores — el usuario nunca la elige a mano, solo
aparece seleccionada automáticamente cuando el JS la fuerza; sigue siendo
una `<option>` real así `select.value = "custom"` funciona.)

CSS nueva — el `<select>` reutiliza el mismo lenguaje visual que ya existe
para los campos `input[type="number"]` del formulario (borde sólido, sin
bordes redondeados, tipografía de cuerpo):

```css
.preset-select {
  font-family: var(--font-body);
  font-size: 14px;
  padding: 6px 8px;
  border-radius: 0;
  border: 2px solid var(--ink);
  background: var(--paper);
  color: var(--ink);
}
```

(agregar la clase `preset-select` a ambos `<select>` en el HTML de arriba.)

## Cambios en `app.ts`

Deliberately no generic `Record`-keyed-by-union-cast-from-string lookup
here (that would need an `as` to turn `select.value: string` back into
the literal union) — every preset is an explicit named constant, and every
match is an explicit `if`/`else if` chain, so nothing anywhere needs `as`
or `!`:

Nota (actualizado en una rama posterior): estas constantes ya no viven
directamente en `app.ts` — se movieron a `src/domain/presets.ts` (un
módulo puro, sin código de DOM) precisamente para que fueran importables
desde un test de Vitest sin necesidad de un DOM. `app.ts` las importa
desde ahí. `LENGTH_CROPPED.hemLengthCm` también se corrigió de `8` a `10`:
con `8` (~22 filas), el entallado de cadera de las tallas CYC más grandes
podía necesitar hasta 26 eventos de cambio y la combinación fallaba; `10`
(~28 filas) alcanza en las 8 combinaciones antes rotas (4 tallas × Cropped
× 2 opciones de Fit).

```ts
// src/domain/presets.ts
export const FIT_REGULAR = { bodyEaseCm: 8, sleeveEaseCm: 6 };
export const FIT_OVERSIZED = { bodyEaseCm: 20, sleeveEaseCm: 14 };

export const LENGTH_CROPPED = { hemLengthCm: 10 };
export const LENGTH_REGULAR = { hemLengthCm: 12.14 };
export const LENGTH_LONG = { hemLengthCm: 30 };
```

```ts
// src/web/app.ts
function setNumberInputValue(id: string, value: number): void {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement) {
    el.value = String(value);
  }
}

function setupPresetSelectors(): void {
  const fitSelect = document.getElementById("fit-preset-select");
  const lengthSelect = document.getElementById("length-preset-select");
  const bodyEaseInput = document.getElementById("bodyEaseCm");
  const sleeveEaseInput = document.getElementById("sleeveEaseCm");
  const hemLengthInput = document.getElementById("hemLengthCm");

  if (fitSelect instanceof HTMLSelectElement) {
    fitSelect.addEventListener("change", () => {
      if (fitSelect.value === "regular") {
        setNumberInputValue("bodyEaseCm", FIT_REGULAR.bodyEaseCm);
        setNumberInputValue("sleeveEaseCm", FIT_REGULAR.sleeveEaseCm);
      } else if (fitSelect.value === "oversized") {
        setNumberInputValue("bodyEaseCm", FIT_OVERSIZED.bodyEaseCm);
        setNumberInputValue("sleeveEaseCm", FIT_OVERSIZED.sleeveEaseCm);
      }
    });
  }

  if (lengthSelect instanceof HTMLSelectElement) {
    lengthSelect.addEventListener("change", () => {
      if (lengthSelect.value === "cropped") {
        setNumberInputValue("hemLengthCm", LENGTH_CROPPED.hemLengthCm);
      } else if (lengthSelect.value === "regular") {
        setNumberInputValue("hemLengthCm", LENGTH_REGULAR.hemLengthCm);
      } else if (lengthSelect.value === "long") {
        setNumberInputValue("hemLengthCm", LENGTH_LONG.hemLengthCm);
      }
    });
  }

  const resyncFit = (): void => {
    if (
      !(fitSelect instanceof HTMLSelectElement) ||
      !(bodyEaseInput instanceof HTMLInputElement) ||
      !(sleeveEaseInput instanceof HTMLInputElement)
    ) {
      return;
    }
    const bodyEaseCm = bodyEaseInput.valueAsNumber;
    const sleeveEaseCm = sleeveEaseInput.valueAsNumber;
    if (bodyEaseCm === FIT_REGULAR.bodyEaseCm && sleeveEaseCm === FIT_REGULAR.sleeveEaseCm) {
      fitSelect.value = "regular";
    } else if (bodyEaseCm === FIT_OVERSIZED.bodyEaseCm && sleeveEaseCm === FIT_OVERSIZED.sleeveEaseCm) {
      fitSelect.value = "oversized";
    } else {
      fitSelect.value = "custom";
    }
  };

  const resyncLength = (): void => {
    if (!(lengthSelect instanceof HTMLSelectElement) || !(hemLengthInput instanceof HTMLInputElement)) {
      return;
    }
    const hemLengthCm = hemLengthInput.valueAsNumber;
    if (hemLengthCm === LENGTH_CROPPED.hemLengthCm) {
      lengthSelect.value = "cropped";
    } else if (hemLengthCm === LENGTH_REGULAR.hemLengthCm) {
      lengthSelect.value = "regular";
    } else if (hemLengthCm === LENGTH_LONG.hemLengthCm) {
      lengthSelect.value = "long";
    } else {
      lengthSelect.value = "custom";
    }
  };

  if (bodyEaseInput) {
    bodyEaseInput.addEventListener("change", resyncFit);
  }
  if (sleeveEaseInput) {
    sleeveEaseInput.addEventListener("change", resyncFit);
  }
  if (hemLengthInput) {
    hemLengthInput.addEventListener("change", resyncLength);
  }
}
```

(`setupPresetSelectors()` se llama una vez al final del archivo, junto a
`setupChartEditor();`.)

**Nota de diseño sobre el "loop" preset→input→resync**: cuando el usuario
elige un preset, el `change` del `<select>` escribe en los `<input>`
vía `.value =` — esto NO dispara el evento `change` del input (asignar
`.value` por JS nunca dispara eventos), así que no hay resincronización
circular innecesaria. El resync solo corre cuando el USUARIO edita el
input a mano (evento `change` real del navegador, tecleo + blur).

## Casos borde

- Los valores por defecto del formulario (`bodyEaseCm=8`, `sleeveEaseCm=6`,
  `hemLengthCm=12.14`) ya coinciden exacto con "Regular" en ambos
  presets — los `<select>` arrancan en "Regular" sin necesidad de lógica
  adicional al cargar la página.
- Comparación de igualdad exacta (`===`) entre floats: como los valores
  vienen de `valueAsNumber` (parseo directo del string del input) contra
  constantes literales idénticas, no hay riesgo de error de precisión de
  punto flotante — no es una cuenta, es una comparación directa contra el
  mismo valor que se escribió.

## Testing

Sin cobertura de Vitest (igual que el resto de `src/web/app.ts`) —
verificación manual en navegador: elegir "Oversized" rellena
`bodyEaseCm`/`sleeveEaseCm` con 20/14; elegir "Long" rellena `hemLengthCm`
con 30; editar `bodyEaseCm` a mano a un valor que no coincide con ningún
preset pasa el selector de Fit a "Personalizado"; volver a escribir
exactamente 8 en `bodyEaseCm` (con `sleeveEaseCm` en 6) vuelve el selector
a "Regular".
