# Diseño: unión de axila (canesú → entallado)

Fecha: 2026-08-30

## Objetivo

Conectar el motor del canesú (`RaglanYokeResult`) con el motor de entallado
(`computeTaper`): calcular los puntos de partida reales del cuerpo (una sola
pieza tejida en redondo) y de cada manga, a partir del faltante en axila que
ya reporta el canesú. Esta era la conexión que las dos pasadas anteriores
(`docs/superpowers/specs/2026-08-30-raglan-yoke-engine-design.md` y
`docs/superpowers/specs/2026-08-30-taper-engine-design.md`) dejaron
explícitamente pendiente.

## Alcance

Incluido:
- Una función `computeAxilaJoin` que recibe el `RaglanYokeResult` completo y
  devuelve los puntos de partida del cuerpo y de cada manga, más el reparto
  del montado en cada una de las 2 axilas físicas.
- Validación: faltante negativo en cualquier pieza es un error de límite,
  no un caso a corregir en silencio.
- Test de regresión contra el ejemplo ya verificado (canesú crew de la
  sección 9).

Explícitamente fuera de alcance:
- Llamar a `computeTaper` con estos puntos de partida (esa composición
  queda para cuando se aborde el renderizador o un pipeline de nivel más
  alto que encadene canesú → axila → entallado → salida).
- Cuellera, grading multi-talla, renderizadores — igual que en las pasadas
  anteriores.

## Modelo físico

Hay exactamente 2 axilas (izquierda y derecha). Cada una conecta un lado de
espalda+delantero con una manga:

- **Espalda y delantero** tocan las 2 axilas (una a cada lado) — su
  faltante total se reparte a la mitad entre ambas.
- **Cada manga** toca una sola axila — su faltante entero se monta ahí, sin
  repartir.

## Diseño de `computeAxilaJoin`

```ts
type AxilaJoinResult = {
  bodyStartStitches: number;
  sleeveLeftStartStitches: number;
  sleeveRightStartStitches: number;
  castOnPerAxila: {
    left: { back: number; front: number; total: number };
    right: { back: number; front: number; total: number };
  };
};

function computeAxilaJoin(yokeResult: RaglanYokeResult): AxilaJoinResult
```

- `bodyStartStitches = finalStitchCounts.back + finalStitchCounts.front +
  armpitShortfall.back + armpitShortfall.front`. Por construcción, esto
  coincide con el objetivo de pecho ya usado como punto de partida en los
  ejemplos de `computeTaper` (208 en el ejemplo verificado).
- `sleeveLeftStartStitches = finalStitchCounts.sleeveLeft +
  armpitShortfall.sleeveLeft` (completo, sin repartir). Igual para la
  derecha.
- **Reparto espalda/delantero entre las 2 axilas**: mitad a cada una; si el
  faltante es impar, la axila izquierda recibe el punto de más (`ceil` a la
  izquierda, `floor` a la derecha) — convención fija, documentada acá para
  no tener que redescubrirla más adelante.
- `castOnPerAxila.left.total = castOnPerAxila.left.back +
  castOnPerAxila.left.front` (y análogo para la derecha). Esta suma, sobre
  las dos axilas, debe igualar `armpitShortfall.back +
  armpitShortfall.front` — invariante que valida el test.

### Validación

Si `armpitShortfall.back`, `armpitShortfall.front`,
`armpitShortfall.sleeveLeft` o `armpitShortfall.sleeveRight` es negativo,
se lanza un `Error`. Un faltante negativo significaría que el canesú ya
superó el objetivo de talla en esa pieza — un escenario donde haría falta
*disminuir* en la axila en vez de montar puntos, que este modelo (solo
montado) no contempla. Se reporta como error en el límite de la función en
vez de intentar "corregirlo" silenciosamente montando un número negativo de
puntos (lo cual no tiene sentido físico).

## Testing

Test de regresión (golden values) usando el mismo `RaglanYokeResult` ya
verificado en la sección 9 del doc de dominio (canesú crew: espalda final
88/faltante 16, delantero final 90/faltante 14, mangas final 64/faltante 12
cada una):

- `bodyStartStitches` = 88+90+16+14 = **208**.
- `sleeveLeftStartStitches` = `sleeveRightStartStitches` = 64+12 = **76**.
- `castOnPerAxila.left` = `{ back: 8, front: 7, total: 15 }` (16/2=8 exacto;
  14/2=7 exacto — este ejemplo no ejercita el caso impar).
- `castOnPerAxila.right` = `{ back: 8, front: 7, total: 15 }`.
- Test adicional de redondeo impar: `computeAxilaJoin` solo lee
  `finalStitchCounts` y `armpitShortfall` de su entrada — no necesita un
  `RaglanYokeResult` producido por `computeRaglanYoke`, así que este test
  construye el objeto literal a mano con `armpitShortfall = { back: 15,
  front: 9, sleeveLeft: 0, sleeveRight: 0 }` (y `finalStitchCounts` con
  cualquier valor consistente, ej. todos en 0, ya que no afecta el reparto
  por axila) para ejercitar el caso impar sin depender del canesú real. Con
  esos faltantes, la izquierda debe recibir `{ back: 8, front: 5 }` y la
  derecha `{ back: 7, front: 4 }`.
- Test de validación: un `RaglanYokeResult` (literal, mismo criterio que
  arriba) con `armpitShortfall.back` negativo debe lanzar error.

## Fuera de discusión en este spec

La composición completa (canesú → unión de axila → entallado de cuerpo y
manga, encadenado en una sola llamada) no se diseña acá — esta pasada solo
resuelve el cálculo de los puntos de partida y su reparto. Encadenarlo con
`computeTaper` es trabajo mecánico directo una vez que estos números
existen, y se hará junto con el renderizador o un pipeline explícito
cuando corresponda.
