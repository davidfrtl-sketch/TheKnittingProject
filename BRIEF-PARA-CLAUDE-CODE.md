# Brief para Claude Code — setup inicial del proyecto

## Contexto

Software abierto de diseño de patrones de sweaters tejidos a mano (dos agujas).
Antes de tocar código, leer en esta misma carpeta:
- `CLAUDE.md` — alcance acordado y conceptos clave del modelo de datos.
- `tejido-y-patronaje.md` — desarrollo de dominio completo, con la matemática
  del raglan ya verificada contra fuentes reales.

No hace falta re-derivar nada de eso: ya está pensado, solo falta codificarlo
en etapas posteriores.

## Qué se pide en esta primera pasada

Únicamente el esqueleto del repositorio. Sin lógica de negocio todavía — nada
del motor de cálculo del raglan (sección 8 del doc de dominio) ni del modelo
de datos.

Incluye:

1. `git init` (si no existe ya) y un primer commit con el esqueleto.
2. `.gitignore` apropiado al stack que se elija.
3. Estructura de carpetas — algo como `src/`, `docs/`, `tests/`, ajustada al
   stack elegido.
4. Mover `tejido-y-patronaje.md` a `docs/` (o donde tenga más sentido según
   el stack). `CLAUDE.md` queda en la raíz — es la convención de contexto de
   proyecto y varias herramientas lo buscan ahí.
5. Un `README.md` inicial: qué es el proyecto, alcance de esta etapa (tejido
   a mano, construcción raglan top-down), cómo correr tests una vez que
   existan, y un link a `docs/tejido-y-patronaje.md`.
6. El andamiaje de testing para el stack elegido (config del test runner,
   aunque todavía no haya tests que correr) — para que quede listo cuando se
   implemente el motor de cálculo.

## Stack: todavía sin decidir

No asumir Python, TypeScript/Node ni ningún otro lenguaje sin preguntar antes.
Al usuario le interesa decidirlo en conversación, considerando:

- El corazón del proyecto va a ser un motor de cálculo (raglan, grading,
  entallado, manga) — necesita buen soporte de testing numérico.
- Hay una posible interfaz futura (web) para que alguien ingrese medidas y
  gauge y reciba el patrón — no es parte de esta etapa, pero puede influir la
  elección si conviene compartir código entre backend y frontend.
- Los dos renderizadores de salida descritos en la sección 12 del doc de
  dominio (instrucciones escritas multi-talla + gráfico de puntos con
  símbolos CYC) — pensar si el stack facilita generar texto formateado y/o
  gráficos vectoriales (SVG) más adelante.

## Qué NO hacer todavía

- No implementar el algoritmo de raglan ni ningún cálculo (esquema, gauge,
  ease, grading, escote, entallado, manga) — es la etapa siguiente, después
  de este esqueleto.
- No definir el modelo de datos en código — los conceptos están descritos en
  `CLAUDE.md`, pero la implementación es un paso posterior, a decidir junto
  con el stack.

## Referencia rápida del dominio

(Resumen — el detalle y la derivación numérica completa están en
`tejido-y-patronaje.md`, sección 8 en adelante.)

- Técnica: tejido a mano, dos agujas. Construcción: raglan de arriba hacia
  abajo (top-down) primero, otras construcciones después.
- Regla física fija: 2 puntos por línea raglan cada 2 filas → cada pieza
  (espalda, delantero, manga×2) gana 2 pts/ronda siempre. De ahí sale un
  "faltante en axila" en cada pieza al separar cuerpo y mangas — estructural,
  no un error de redondeo.
- Escote: el delantero debe arrancar con muy pocos puntos (1-2), no simétrico
  con la espalda, o el escote termina sistemáticamente más ancho de lo debido.
- Fórmula universal de reparto de forma (entallado, manga):
  `filas disponibles ÷ eventos de cambio = cada cuántas filas actuar`.
- Grading no es escalar todo por el mismo factor: el marco del cuerpo
  (hombros/cuello) crece mucho menos que la circunferencia del pecho al subir
  de talla, así que el faltante en axila crece desproporcionadamente en
  tallas grandes y conviene calcularlo como salida explícita, con alerta si
  supera un umbral.
- Salida: dos renderizadores separados (instrucciones escritas + gráfico de
  puntos) — la forma de la prenda se escribe, los gráficos son para motivos
  de punto.

## Pendientes documentados (no bloquean el esqueleto)

- Vuelta corta en cuña como técnica alternativa de escote (sin desarrollar
  en detalle).
- Aplicar la corrección de escote y el entallado/manga a la tabla de tallas
  real completa S-XL (por ahora el ejemplo numérico usa una sola talla, y el
  grading multi-talla solo corrió el canesú base).
