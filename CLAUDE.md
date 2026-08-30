# Knitting Project — contexto de dominio

Software abierto de diseño de patrones de sweaters. Este archivo resume las decisiones de alcance y el algoritmo de referencia acordados antes de escribir código. El detalle completo, con las fuentes y el desarrollo numérico paso a paso, está en `docs/tejido-y-patronaje.md`.

## Alcance de la primera etapa

- Técnica: **tejido a mano (dos agujas)**. Tejido a máquina, crochet y bordado quedan documentados como referencia pero fuera del alcance inicial.
- Construcción: **raglan de arriba hacia abajo**, complejizando después hacia otras construcciones (bottom-up, canesú circular, sisa clásica, etc. — ver tabla comparativa en `docs/tejido-y-patronaje.md`).
- La matemática del raglan (canesú, escote, entallado, manga, cuellera, grading, formato de salida) ya fue revisada y verificada contra fuentes reales antes de empezar a codificar — no partir de cero, retomar `docs/tejido-y-patronaje.md`.

## Conceptos clave que el modelo de datos debería representar

- **Gauge** (puntos y filas por 10×10cm, medido sobre tela bloqueada): parámetro de entrada, nunca una constante.
- **Ease/holgura**: categorías estándar en cm fijos (no porcentaje) — se suman a la medida real del cuerpo antes de convertir a puntos.
- **Esquema**: el conjunto de medidas planas (pecho, cuello, bíceps, muñeca, cintura, cadera, profundidad de sisa) independiente de talla/hilo.
- **La regla física del raglan**: 2 puntos por línea raglan cada 2 filas → cada una de las 4 piezas (espalda, delantero, manga×2) gana 2 puntos por ronda, siempre. De ahí sale un "faltante" en cada axila que se resuelve montando puntos extra al separar cuerpo y mangas — esto NO es un error de redondeo, es estructural.
- **Escote**: el delantero debe arrancar con muy pocos puntos (1-2), no simétrico con la espalda — regla: montado al unir + aumentos de escote = ancho de cuello de espalda. Ver la derivación completa en el doc de detalle; es la parte que más fácil se hace mal si se copia el reparto simétrico del canesú base.
- **Fórmula universal de reparto de forma** (entallado, manga): `filas disponibles ÷ eventos de cambio = cada cuántas filas actuar`. El resto no entero se absorbe en las filas lisas de alrededor.
- **Grading**: no es "multiplicar todo por el mismo factor". El marco del cuerpo (hombros/cuello) crece mucho menos que la circunferencia del pecho al subir de talla — por eso el "faltante en axila" crece desproporcionadamente en tallas grandes y conviene calcularlo como salida explícita, con una alerta si supera un umbral proporcional.
- **Salida**: dos renderizadores separados — instrucciones escritas (con notación multi-talla `X (Y, Z, W)`, repeticiones con `*...*`, procesos paralelos con "al mismo tiempo") y gráfico de puntos (símbolos estándar CYC, con leyenda obligatoria). La forma de la prenda se escribe; los gráficos son para motivos de punto, no para la silueta.

## Pendiente antes de codificar

- Vuelta corta en cuña como técnica alternativa de escote (no desarrollada en detalle).
- Aplicar la corrección de escote y el entallado/manga a una tabla de tallas real completa (por ahora el ejemplo numérico usa una sola talla, y el grading multi-talla solo corrió el canesú base).
