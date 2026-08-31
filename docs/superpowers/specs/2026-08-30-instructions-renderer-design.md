# Diseño: renderizador de instrucciones escritas

Fecha: 2026-08-30

## Objetivo

Convertir un `GarmentPlan` (canesú + unión de axila + entallado de cuerpo +
manga) en el texto final tejible, en prosa descriptiva en español — sección
12 del doc de dominio, primera pasada.

## Alcance

Incluido:
- `renderInstructions(plan: GarmentPlan): string` — documento completo:
  montaje inicial, canesú, unión de axila, entallado de cintura, entallado
  de cadera/ruedo, y las dos mangas.
- Numeración de ronda/fila reiniciada por etapa (cada sección empieza en 1),
  igual que ya lo devuelve cada motor.
- Prosa descriptiva, sin abreviaturas (aum, pm, k1) ni asteriscos de
  repetición todavía — eso queda para un pulido posterior.
- Test de regresión contra el mismo ejemplo numérico ya verificado en todas
  las pasadas anteriores, comprobando que el texto contenga las cifras y
  frases clave correctas (no comparación de string completo, para no ser
  frágil ante retoques de redacción).

Explícitamente fuera de alcance:
- Notación abreviada estándar y asteriscos de repetición.
- Notación multi-talla (no hay grading todavía).
- Renderizador gráfico (símbolos de punto).
- Motivo de trenzas/cruz.

## Fuentes de datos: todo se deriva de `GarmentPlan`, sin parámetros extra

`GarmentPlan` no guarda los parámetros de entrada originales (medidas,
`necklineParams`), solo los resultados de cada motor. En vez de pedirle al
renderizador que reciba esos parámetros de nuevo (duplicando datos que ya
están implícitos), todo lo que hace falta se deriva escaneando
`plan.yoke.schedule`:

- **Rondas de aumento raglan**: cantidad de rondas cuyo `events` incluye un
  evento `raglanIncrease`.
- **Rango y cadencia del aumento de escote**: rondas cuyo `events` incluye
  `necklineIncrease` — la primera y la última dan el rango; la diferencia
  entre las dos primeras da la cadencia (constante en todo el ejemplo).
- **Ronda y monto de la unión del delantero**: la ronda cuyo `events`
  incluye `frontJoin`, y su campo `boundOnStitches`.

Esto mantiene al renderizador desacoplado de los parámetros de entrada —
solo necesita el `GarmentPlan`, igual que un renderizador de gráfico
consumiría el resultado, no la configuración que lo generó.

## Dirección de aumento/disminución en el entallado

`TaperResult` no guarda su propio punto de partida ni un flag de dirección
(fue una observación de la revisión final del motor de entallado, resuelta
acá sin tocar `taper.ts`): el renderizador la infiere comparando el
`finalStitches` de cada tramo contra el punto de partida que el propio
`GarmentPlan` ya expone en el campo correspondiente:

| Tramo | Punto de partida | Resultado |
|---|---|---|
| Cintura | `axilaJoin.bodyStartStitches` | `bodyWaistTaper.finalStitches` |
| Cadera/ruedo | `bodyWaistTaper.finalStitches` | `bodyHemTaper.finalStitches` |
| Manga izquierda | `axilaJoin.sleeveLeftStartStitches` | `sleeveLeftTaper.finalStitches` |
| Manga derecha | `axilaJoin.sleeveRightStartStitches` | `sleeveRightTaper.finalStitches` |

## Plantilla de cada tramo de entallado

Cadencia mixta → una o dos líneas de cadencia (la reducida solo si
`reducedCadenceEventCount > 0`), seguidas del resultado:

> `{Etiqueta} (fila de {aumento|disminución}, [cada R fila(s), C vez/veces, luego] cada P fila(s), C vez/veces): {aumentar|disminuir} 2 puntos (1 a cada lado). Resultado: {finalStitches} puntos.`

Caso sin cambio (`events === 0`, no ejercitado por el ejemplo pero cubierto
por robustez): `{Etiqueta}: sin cambios, se sigue tejiendo derecho durante
{N} filas. Resultado: {finalStitches} puntos.`

## Ejemplo completo (verificado a mano contra el `GarmentPlan` ya validado)

Con el mismo ejemplo de todas las pasadas anteriores (gauge 20/28, ease
8/6, pecho 96/cuello 16/bíceps 32/sisa 20, escote 12/1/1, manga inicial 8,
cintura 80/cadera 98/muñeca 12, largos 15/12.14/42.14):

```
Montar 50 puntos en total: 32 para la espalda, 8 para la manga izquierda,
1 + 1 para el delantero (dos mitades separadas), 8 para la manga derecha.
Unir la espalda y las mangas en redondo; el delantero se teje plano y
dividido en dos mitades hasta la unión (ver más abajo).

Ronda de aumento raglan (cada 2 rondas, 28 veces): en cada una de las 4
líneas raglan, aumentar 1 punto a cada lado del marcador.
Al mismo tiempo, en el delantero: desde la ronda 1 hasta la ronda 12, en
cada ronda, aumentar 1 punto en cada borde interior del escote.
En la ronda 13: montar 8 puntos para unir las dos mitades del delantero en
una sola pieza.
Resultado del canesú: espalda 88 puntos, delantero 90 puntos, manga
izquierda 64 puntos, manga derecha 64 puntos.

Al separar el cuerpo de las mangas: montar 15 puntos en la axila izquierda
(8 para la espalda + 7 para el delantero) y 15 puntos en la axila derecha
(8 para la espalda + 7 para el delantero).
Cuerpo: 208 puntos en total, tejido en redondo como una sola pieza.
Manga izquierda: 76 puntos. Manga derecha: 76 puntos.

Cintura (fila de disminución, cada 2 filas, 6 veces, luego cada 3 filas, 10
veces): disminuir 2 puntos (1 a cada lado). Resultado: 176 puntos.

Cadera / ruedo (fila de aumento, cada 1 fila, 2 veces, luego cada 2 filas,
16 veces): aumentar 2 puntos (1 a cada lado). Resultado: 212 puntos.

Manga izquierda (fila de disminución, cada 5 filas, 2 veces, luego cada 6
filas, 18 veces): disminuir 2 puntos (1 a cada lado). Resultado: 36 puntos.

Manga derecha (fila de disminución, cada 5 filas, 2 veces, luego cada 6
filas, 18 veces): disminuir 2 puntos (1 a cada lado). Resultado: 36 puntos.
```

## Testing

El test corre `computeGarmentPlan` con el ejemplo de arriba, pasa el
resultado a `renderInstructions`, y verifica (con `toContain`, no
comparación de string completo) que aparezcan las frases y cifras clave de
cada sección: montaje, cadencia y cantidad del raglan, rango y cadencia del
escote, ronda y monto de la unión, resultado del canesú, montado por
axila, puntos de partida de cuerpo/manga, y la línea de cadencia + resultado
de cada uno de los 4 tramos de entallado.

## Fuera de discusión en este spec

Abreviaturas estándar, asteriscos de repetición y notación multi-talla
quedan para una pasada de pulido posterior, una vez que el contenido esté
verificado. El renderizador gráfico (símbolos de punto) es un consumidor
completamente distinto de `GarmentPlan` y no se diseña acá.
