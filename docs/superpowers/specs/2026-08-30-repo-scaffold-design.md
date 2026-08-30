# Diseño: esqueleto inicial del repositorio

Fecha: 2026-08-30

## Objetivo

Dejar listo el andamiaje del repositorio de Knitting Project (diseño de
patrones de sweaters tejidos a mano) sin implementar todavía ningún cálculo
de dominio. Esta es la primera pasada, acordada en
`BRIEF-PARA-CLAUDE-CODE.md`.

## Alcance

Incluido:
- `git init` y primer commit.
- `.gitignore` para stack Node/TypeScript.
- Estructura de carpetas `src/` (por capa técnica), `docs/`, `tests/`.
- Mover `tejido-y-patronaje.md` a `docs/`. `CLAUDE.md` queda en la raíz.
- `README.md` inicial.
- Andamiaje de testing (Vitest) sin tests reales todavía.

Explícitamente fuera de alcance:
- Algoritmo de raglan, grading, entallado, manga (sección 8 del doc de
  dominio).
- Modelo de datos en código.

## Stack

- **Lenguaje**: TypeScript sobre Node, módulos ESM.
- **Gestor de paquetes**: npm (viene con Node, sin dependencias extra).
- **Test runner**: Vitest (rápido, buena ergonomía para tests numéricos de
  comparación esperado/calculado).
- **Verificación de tipos**: `tsc --noEmit` como script separado de test.
- Sin bundler ni framework de UI todavía — no hace falta hasta que exista una
  interfaz web real.

## Estructura de carpetas

```
Knitting Project/
├── .gitignore
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── docs/
│   ├── tejido-y-patronaje.md
│   └── superpowers/specs/   (specs de diseño, este archivo incluido)
├── src/
│   ├── domain/    (placeholder — tipos y modelo de dominio, futuro)
│   ├── engine/    (placeholder — motor de cálculo del raglan, futuro)
│   └── render/    (placeholder — renderizador de texto + gráfico SVG, futuro)
└── tests/         (placeholder — tests numéricos del engine, futuro)
```

Las carpetas `src/*` y `tests/` se crean vacías (con un `.gitkeep` si hace
falta para que git las trackee) — no llevan lógica ni tipos todavía.

## package.json — scripts

- `test`: `vitest run`
- `test:watch`: `vitest`
- `typecheck`: `tsc --noEmit`

Dependencias de desarrollo: `typescript`, `vitest`. Sin dependencias de
producción por ahora.

## README.md — contenido

- Qué es el proyecto (una frase).
- Alcance de esta etapa: tejido a mano, construcción raglan top-down.
- Cómo correr tests (`npm test`) una vez que existan.
- Link a `docs/tejido-y-patronaje.md`.

## Fuera de discusión en este spec

BRIEF-PARA-CLAUDE-CODE.md queda en la raíz tal cual está (no es parte de la
convención `docs/`, es un artefacto de la conversación inicial); se puede
archivar o borrar más adelante si el usuario lo pide, pero no se toca en esta
pasada.
