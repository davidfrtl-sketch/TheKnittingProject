# Diseño: herramienta web interactiva (medidas → preview + instrucciones)

Fecha: 2026-08-30

## Objetivo

Una página HTML standalone, sin dependencias de hosting especiales, donde
alguien ingresa gauge/ease/medidas/escote/construcción y obtiene el
esquema visual y las instrucciones escritas calculadas en el momento, en
el navegador. Es la pieza que cumple la finalidad original planteada por
el usuario: "crear un chaleco con un patrón personalizado... con un
preview de este patrón e instrucciones finales".

## Alcance

Incluido:
- `tsconfig.web.json` — config de compilación separada (no toca el
  `tsconfig.json` de test/typecheck existente) para emitir JS plano
  ejecutable en el navegador.
- `src/render/schematicSvg.ts` — función pura y testeada,
  `renderSchematicSvg(geometry: SchematicGeometry): string`, genera el SVG
  simplificado (3 paneles: espalda, delantero, manga) a partir de la
  geometría real.
- `src/web/app.ts` — el pegamento de la interfaz: lee el formulario, arma
  los objetos de entrada, corre el pipeline completo, muestra resultado o
  error. No se testea con Vitest (ver "Verificación" más abajo).
- `index.html` en la raíz del repo — formulario + resultado.
- Script `npm run build` (corre `tsc -p tsconfig.web.json`).

Explícitamente fuera de alcance:
- Notación multi-talla, grading, motivo de trenzas.
- Bundler/empaquetado (se acordó compilar con `tsc` solo, sin agregar
  herramientas nuevas al proyecto).
- Reproducir el nivel de detalle visual completo de "Silueta del Raglan"
  (líneas de cota con corchetes, callouts circulares) — se acordó una
  versión simplificada primero.
- Recalculo en vivo — el recálculo es manual, con botón "Calcular" (ver
  "Manejo de errores" más abajo, esto también permite mostrar errores de
  validación de forma clara antes de intentar dibujar nada).

## `renderSchematicSvg`: geometría → SVG

Layout: 3 paneles lado a lado (espalda, delantero, manga — la manga
representa una sola, usando `geometry.sleeveLeft`, ya que en este modelo
simétrico ambas mangas dan el mismo resultado). Constantes de layout:
`TOP_MARGIN=8`, `SIDE_MARGIN=4`, `GAP=6`, `BOTTOM_MARGIN=4` (unidades = cm,
1 unidad de SVG = 1cm, igual que en "Silueta del Raglan").

Cada pieza se calcula con ancho máximo (`maxHalf`, la mitad del ancho más
grande de esa pieza) para poder ubicar los paneles uno al lado del otro sin
superposición:

```
backLeftEdge = SIDE_MARGIN
centerBack = backLeftEdge + maxHalfBack
backRightEdge = backLeftEdge + maxHalfBack*2

frontLeftEdge = backRightEdge + GAP
centerFront = frontLeftEdge + maxHalfFront
frontRightEdge = frontLeftEdge + maxHalfFront*2

sleeveLeftEdge = frontRightEdge + GAP
centerSleeve = sleeveLeftEdge + maxHalfSleeve
sleeveRightEdge = sleeveLeftEdge + maxHalfSleeve*2

totalWidth = sleeveRightEdge + SIDE_MARGIN
```

Alturas (compartidas donde corresponde, ya que canesú/objetivo de talla son
comunes a las 4 piezas):

```
y0 = TOP_MARGIN
yUnderarm = y0 + back.yokeHeightCm
yWaist = yUnderarm + back.waistLengthCm
yHem = yWaist + back.hemLengthCm
yJoin = y0 + front.joinHeightCm
yYokeEnd = y0 + sleeveLeft.yokeHeightCm   (== yUnderarm, mismo canesú)
yWrist = yYokeEnd + sleeveLeft.taperLengthCm

totalHeight = max(yHem, yWrist) + BOTTOM_MARGIN
```

Cada polígono se arma mitad a la izquierda / mitad a la derecha del centro
de su panel, con un vértice extra en el delantero (el quiebre de la unión)
y en la manga (el escalón de la axila) — mismo enfoque que ya se usó a
mano en "Silueta del Raglan", ahora parametrizado por la geometría real en
vez de coordenadas escritas a mano.

**Etiquetas** (versión simplificada — solo las medidas más relevantes, sin
líneas de cota): espalda muestra ancho arriba/axila/cintura/ruedo;
delantero muestra ancho de unión/axila/cintura/ruedo (se omite el ancho
inicial, ~1cm, poco legible a esta escala); manga muestra ancho de
bíceps/puño (se omiten el montado inicial y el fin de canesú, para no
saturar). Los números se formatean con `formatCm` — redondeo a 1 decimal,
sin ceros de más (52 → "52", 12.142857 → "12.1").

**Sin colores inline**: usa `class` (`panel-fill back/front/sleeve`,
`panel-title`, `measure-label`, `axila-line`) — los colores los define el
CSS de `index.html`, para que funcione en claro/oscuro.

### Verificación a mano (mismo ejemplo de todas las pasadas anteriores)

Con la geometría ya verificada (back: 16/52/44/53, canesú 20cm, cintura
15cm, ruedo≈12.142857cm; front: join 23cm a ≈4.642857cm de altura; sleeve:
bíceps 19cm, puño 9cm, canesú 20cm, afinado≈42.142857cm):

- `maxHalfBack` = 53/2 = 26.5; `maxHalfFront` = 53/2 = 26.5 (el ancho de
  ruedo es el mayor de sus 5 anchos); `maxHalfSleeve` = 19/2 = 9.5.
- `centerBack` = 4+26.5 = **30.5**; `backRightEdge` = 4+53 = 57.
- `centerFront` = (57+6)+26.5 = **89.5**; `frontRightEdge` = 63+53 = 116.
- `centerSleeve` = (116+6)+9.5 = **131.5**; `sleeveRightEdge` = 122+19 = 141.
- `totalWidth` = 141+4 = **145**.
- `yUnderarm` = 8+20 = **28**; `yWaist` = 28+15 = **43**; `yHem` =
  43+12.142857 ≈ **55.142857**.
- `yJoin` = 8+4.642857 ≈ **12.642857**.
- `yWrist` = 28+42.142857 ≈ **70.142857**.
- `totalHeight` = max(55.142857, 70.142857)+4 ≈ **74.142857** →
  `formatCm` → "74.1".

Estos valores (centros y `viewBox`) son los que verifica el test — no hace
falta comparar el string completo del SVG, alcanza con confirmar que el
`viewBox`, los 3 `<polygon>` (uno por clase), y las etiquetas de medida
tengan los números y posiciones correctos.

## `index.html` + `src/web/app.ts`: la interfaz

**18 campos**, agrupados en 5 secciones (Gauge, Ease, Medidas del cuerpo,
Escote, Construcción), todos precargados con el mismo ejemplo verificado en
todas las pasadas anteriores (gauge 20/28, ease 8/6, pecho 96, cuello 16,
bíceps 32, sisa 20, cintura 80, cadera 98, muñeca 12, largos 15/12.14/42.14,
escote 12/1/1, manga inicial 8) — editable campo por campo.

**Botón "Calcular"**: al apretarlo, `app.ts`:
1. Lee los 18 valores del formulario (`Number(...)` por campo).
2. Arma `Gauge`, `Ease`, `GarmentMeasurements`, `NecklineParams`,
   `YokeConstructionParams`.
3. Llama `computeGarmentPlan` → `computeSchematicGeometry` →
   `renderSchematicSvg` + `renderInstructions`, todo dentro de un
   `try/catch`.
4. Si tiene éxito: inyecta el SVG y el texto de instrucciones en el DOM.
5. Si lanza un error (el motor ya valida y tira errores en español —
   cambio de puntos impar, faltante negativo, delantero abierto de más,
   etc.): muestra el mensaje del error en un banner, sin romper la página
   ni dejar resultados de un cálculo anterior a medias.

## Verificación

`renderSchematicSvg` es una función pura → TDD igual que el resto del
motor, con test de regresión contra los valores de arriba.

`src/web/app.ts` e `index.html` son wiring de interfaz — se verifican
manualmente en el navegador (cargando la página, probando el botón
Calcular con el ejemplo precargado, y con al menos un caso que dispare un
error de validación conocido), no con Vitest. No hay precedente de testear
DOM en este proyecto, y agregar uno (jsdom) sería una herramienta nueva
para una sola pieza de wiring.

## Fuera de discusión en este spec

El pulido visual completo (líneas de cota, callouts, leyenda) y el
recalculo en vivo quedan para una pasada posterior si hacen falta.
