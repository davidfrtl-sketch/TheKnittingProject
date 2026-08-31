# Knitting Project

Software abierto de diseño de patrones de sweaters tejidos a mano (dos agujas).

## Alcance de esta etapa

- Técnica: tejido a mano (dos agujas).
- Construcción: raglan de arriba hacia abajo (top-down).
- Otras construcciones (bottom-up, canesú circular, sisa clásica) y otras
  técnicas (tejido a máquina, crochet, bordado) quedan documentadas como
  referencia, pero fuera del alcance inicial.

Por ahora este repositorio implementa el cálculo del canesú raglan (escote
redondo, talla única) y el entallado del cuerpo y la manga. Los dos
renderizadores de salida ya existen (`src/render/`): instrucciones escritas
y gráfico de puntos (símbolos de punto); el grading multi-talla todavía
está pendiente.

## Estructura

- `src/domain/` — tipos y modelo de dominio (gauge, ease, esquema, tallas).
- `src/engine/` — motor de cálculo del raglan.
- `src/render/` — renderizadores de salida (instrucciones escritas y gráfico
  de puntos).
- `tests/` — tests del motor de cálculo.
- `docs/tejido-y-patronaje.md` — desarrollo completo del dominio, con la
  matemática del raglan verificada contra fuentes reales.

## Cómo correr los tests

```bash
npm install
npm test
```

Para chequeo de tipos:

```bash
npm run typecheck
```

## Herramienta web interactiva

`index.html` es la herramienta interactiva del navegador (formulario de
medidas/gauge/ease que llama al motor y renderiza el esquema SVG y las
instrucciones), y además incluye un editor de gráfico de puntos (stitch
chart) para armar y previsualizar motivos de punto celda por celda. El
motivo diseñado ahí también se superpone en la vista previa del esquema,
como una columna de ancho fijo que abarca todo el panel de espalda, desde
el escote hasta el ruedo, centrada, con su ancho calculado automáticamente
como el punto más angosto que alcanza la espalda en todo su entallado
(para que ningún aumento/disminución la toque) — ya no hay segmento para
elegir, siempre es la espalda completa.
Antes de abrirla hay que compilar `src/` a `dist/`:

```bash
npm run build
```

`dist/` está en `.gitignore`, así que en un clon nuevo el botón "Calcular"
no hace nada hasta correr `npm run build`. Además, `index.html` debe servirse
por HTTP (por ejemplo `npx serve .` o `python3 -m http.server`) y no abrirse
directamente como archivo `file://`, porque los navegadores bloquean la
carga de módulos ES (`<script type="module">`) desde `file://`.

## Documentación de dominio

Ver [`docs/tejido-y-patronaje.md`](docs/tejido-y-patronaje.md) para el
desarrollo completo: gauge, ease, esquema de medidas, la regla física del
raglan, la fórmula universal de reparto de forma, grading y los dos
renderizadores de salida.
