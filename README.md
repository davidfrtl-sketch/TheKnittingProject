# Knitting Project

Software abierto de diseño de patrones de sweaters tejidos a mano (dos agujas).

## Alcance de esta etapa

- Técnica: tejido a mano (dos agujas).
- Construcción: raglan de arriba hacia abajo (top-down).
- Otras construcciones (bottom-up, canesú circular, sisa clásica) y otras
  técnicas (tejido a máquina, crochet, bordado) quedan documentadas como
  referencia, pero fuera del alcance inicial.

Por ahora este repositorio implementa el cálculo del canesú raglan (escote
redondo, talla única). El entallado del cuerpo y la manga, el grading
multi-talla y los renderizadores de salida todavía están pendientes.

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

## Documentación de dominio

Ver [`docs/tejido-y-patronaje.md`](docs/tejido-y-patronaje.md) para el
desarrollo completo: gauge, ease, esquema de medidas, la regla física del
raglan, la fórmula universal de reparto de forma, grading y los dos
renderizadores de salida.
