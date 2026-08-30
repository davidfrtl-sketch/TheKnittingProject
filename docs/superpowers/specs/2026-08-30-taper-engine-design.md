# Diseño: motor genérico de entallado (cintura y manga)

Fecha: 2026-08-30

## Objetivo

Implementar la fórmula universal de reparto de forma (sección 10 de
`docs/tejido-y-patronaje.md`) como una función genérica y reutilizable, que
sirva tanto para el entallado de cintura del cuerpo (dos tramos: axila→
cintura, cintura→ruedo) como para el afinado de manga (un tramo: bíceps→
puño).

## Alcance

Incluido:
- Una función genérica `computeTaper` que recibe puntos de partida, puntos
  de llegada y filas disponibles, y devuelve el cronograma fila por fila del
  cambio (aumento o disminución, según el signo de la diferencia).
- Tests de regresión contra los 3 ejemplos numéricos ya verificados en la
  sección 10 del doc de dominio (axila→cintura, cintura→ruedo, manga).

Explícitamente fuera de alcance (queda para una pasada siguiente):
- Cómo se deriva el punto de partida real del cuerpo a partir del resultado
  del canesú (`RaglanYokeResult`) — es decir, el paso de "unión de axila"
  que reparte el montado de axila entre espalda y delantero para formar el
  tubo del cuerpo. Esta pasada recibe `startStitches` como parámetro directo.
- Cuellera (sin fórmula universal en el doc — pendiente documentado).
- Cualquier renderizador de salida.

## Hallazgo clave del proceso de diseño

El doc de dominio da tres ejemplos numéricos (axila→cintura: 16 eventos/42
filas→"cada 3 filas"; cintura→ruedo: 18 eventos/34 filas→"cada 2 filas";
manga: 20 eventos/118 filas→"cada 6 filas") sin especificar la fórmula
exacta detrás de "cada X filas" ni cómo se resuelve el resto no entero.

Se probaron dos hipótesis:
1. Cadencia fija (piso de filas/eventos) + filas lisas sueltas absorbiendo
   el resto. **No reproduce los números del doc** (daría "cada 2", "cada
   1", "cada 5" respectivamente).
2. **Cadencia mixta**: `cadencia_primaria = techo(filas / eventos)`, con una
   minoría de eventos ejecutados a `cadencia_primaria - 1` (más frecuente)
   para que la suma cierre exacto contra las filas disponibles, sin filas
   lisas sueltas. **Reproduce los 3 ejemplos exactamente** (verificado a
   mano, ver sección siguiente) y coincide con la convención de patrones
   publicados reales (p. ej. "cada 4 filas 3 veces, luego cada 6 filas 5
   veces").

Se adoptó la hipótesis 2.

## Diseño de `computeTaper`

```ts
function computeTaper(
  startStitches: number,
  endStitches: number,
  availableRows: number
): TaperResult
```

Pasos:
1. `totalStitchChange = endStitches - startStitches` (negativo = disminuir,
   positivo = aumentar, cero = sin cambio).
2. `events = Math.abs(totalStitchChange) / 2` (cambio simétrico de 2 puntos
   por evento — un punto a cada lado). Si `totalStitchChange` es impar, es
   un conflicto de diseño: error de validación en el límite de la función.
3. Si `events === 0`: resultado trivial, todas las filas son lisas, sin
   eventos de cambio.
4. Si `events > availableRows`: error de validación — ni siquiera "cada
   fila" alcanza para completar los eventos en las filas disponibles.
5. `primaryCadence = Math.ceil(availableRows / events)`.
6. `reducedCadence = primaryCadence - 1`.
7. `reducedCadenceEventCount = events * primaryCadence - availableRows`.
8. `primaryCadenceEventCount = events - reducedCadenceEventCount`.
9. Orden de los eventos dentro del tramo: primero los
   `reducedCadenceEventCount` eventos a `reducedCadence` (más frecuentes),
   después los `primaryCadenceEventCount` eventos a `primaryCadence`.
10. El signo de `totalStitchChange` determina si cada evento suma o resta 2
    puntos.
11. **Posición exacta de cada fila de cambio** (ambigüedad a resolver
    explícitamente): las filas de cambio ocurren en posiciones acumulativas,
    nunca en la fila 1 — igual que el aumento raglan del canesú, que
    tampoco actúa en la primera ronda. La primera fila de cambio ocurre en
    `rowNumber = cadencia_del_evento_1`; cada fila de cambio siguiente
    ocurre `cadencia_del_evento_i` filas después de la anterior, usando
    `reducedCadence` para los primeros `reducedCadenceEventCount` eventos y
    `primaryCadence` para el resto. Ejemplo (axila→cintura: 6 eventos a
    cadencia 2, luego 10 a cadencia 3): filas de cambio en 2, 4, 6, 8, 10,
    12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42 — la última cae exactamente
    en la fila 42 (última fila disponible), lo cual es intencional: el
    tramo termina justo en el evento final, sin filas lisas de cola.

### Verificación a mano contra los 3 ejemplos del doc

- **Axila→cintura** (208→176, −32 pts, 42 filas): `events=16`,
  `primaryCadence=techo(42/16)=3`, `reducedCadence=2`,
  `reducedCadenceEventCount=16*3-42=6`, `primaryCadenceEventCount=10`.
  Total filas: `6*2 + 10*3 = 12+30 = 42` ✓.
- **Cintura→ruedo** (176→212, +36 pts, 34 filas): `events=18`,
  `primaryCadence=techo(34/18)=2`, `reducedCadence=1`,
  `reducedCadenceEventCount=18*2-34=2`, `primaryCadenceEventCount=16`.
  Total filas: `2*1 + 16*2 = 2+32 = 34` ✓.
- **Manga** (76→36, −40 pts, 118 filas): `events=20`,
  `primaryCadence=techo(118/20)=6`, `reducedCadence=5`,
  `reducedCadenceEventCount=20*6-118=2`, `primaryCadenceEventCount=18`.
  Total filas: `2*5 + 18*6 = 10+108 = 118` ✓.

Los tres cierran exacto. Estos son los tests dorados de esta pasada.

## Salida

Mismo estilo que el motor del canesú (`RaglanYokeResult`): un cronograma
fila por fila más un resumen.

```ts
type TaperRow = {
  rowNumber: number;
  isShapingRow: boolean;
  stitches: number;
};

type TaperResult = {
  schedule: TaperRow[];
  finalStitches: number;
  events: number;
  primaryCadence: number;
  reducedCadence: number;
  primaryCadenceEventCount: number;
  reducedCadenceEventCount: number;
};
```

`finalStitches` debe ser igual a `endStitches` (verificación de coherencia
interna, no un dato nuevo — sirve como chequeo en los tests).

## Testing

Tests de regresión (golden values) contra los 3 ejemplos de la sección 10,
verificando: `events`, `primaryCadence`, `reducedCadence`,
`primaryCadenceEventCount`, `reducedCadenceEventCount`, `finalStitches`, y
que el cronograma tenga exactamente `availableRows` filas con el número de
`isShapingRow: true` igual a `events`.

También un test de validación: diferencia impar de puntos lanza error, y
`events > availableRows` lanza error.

## Composición (fuera de alcance de esta pasada, pero para contexto futuro)

El entallado completo de cintura se arma llamando `computeTaper` dos veces
(axila→cintura, luego cintura→ruedo) y encadenando los cronogramas; la
manga lo llama una sola vez. Esa composición, y de dónde sale el
`startStitches` inicial del cuerpo (el paso de "unión de axila" post-canesú),
quedan para una pasada siguiente.
