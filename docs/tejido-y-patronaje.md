# Tejido y patronaje de sweaters — referencia de dominio

Notas completas recopiladas para el diseño del software. Versión visual equivalente: artifact "Atlas del Punto" (secciones 1-14, con tablas y ejemplos). Este documento es la versión en texto plano para uso como contexto de código.

## 1. Familias de técnicas textiles

- **Tejido de punto (knitting):** un solo hilo continuo forma lazadas entrelazadas. A mano (dos agujas) o a máquina. Elástico en todas direcciones — técnica dominante para sweaters.
- **Crochet:** un solo hilo, un gancho, cada punto se cierra sobre sí mismo antes de avanzar. Tela más densa y menos elástica que el tejido de punto.
- **Tejido de telar (weaving):** dos sistemas de hilos perpendiculares (urdimbre fija + trama). Poco elástico salvo hilo elastizado — raro en sweaters completos, técnica de telas planas (camisas, denim, mantas).
- **Bordado:** decora una tela ya existente (tejida, de punto o crochet); no participa de su estructura.
- **Macramé:** estructura solo con nudos sobre hilos tensados, sin agujas ni gancho. Poco relevante para sweaters.

## 2. Tejido a mano — puntos y estructuras

Dos puntos madre: **derecho (knit — k)** y **revés (purl — p)**. Todo lo demás combina estos dos con aumentos, disminuciones y cruces.

Estructuras base:
- Punto jersey/media (stockinette): todo derecho en redondo, o alternado ida/vuelta en plano. Se enrosca en los bordes.
- Punto bobo (garter): todo derecho ida y vuelta. Plano, muy elástico verticalmente.
- Punto musgo/arroz (seed/moss): alternar derecho/revés desfasado cada vuelta. Textura granulada.
- Elástico (ribbing): columnas verticales de derecho/revés. Muy elástico horizontalmente — puños, cuellos, bajos.

Técnicas de patrón:
- **Trenzas/ochos (cables):** cruce de grupos de puntos. Reduce ancho, aumenta grosor.
- **Calado (lace):** disminuciones + hebras al aire (yarn over), número de puntos estable.
- **Jacquard/fair isle:** 2+ colores por vuelta, hebras flotantes por detrás. Tela más gruesa y cálida.
- **Intarsia:** bloques de color grandes, cada uno con su ovillo, sin hebras flotantes. Motivos figurativos.
- **Brioche:** cada punto se levanta junto con la hebra de la vuelta anterior. Muy elástico, reversible, casi siempre a 2 colores.
- **Entrelac:** bloques diagonales enganchados entre sí, aspecto de cestería.

Plano (ida y vuelta, se cose después) vs. en redondo (circular/dpn, sin costuras — "todo derecho" en redondo = jersey automático).

## 3. Crochet

Vocabulario organizado por altura del punto (cuántas veces pasa el hilo por el gancho). Ojo: nombres US vs. UK se cruzan (single crochet US = double crochet UK) — guiarse por la abreviatura.

De más bajo a más alto: cadeneta (ch, base) → punto raso/enano (sl st) → punto bajo (sc) → medio punto alto (hdc) → punto alto (dc) → punto alto doble (tr).

Variantes: crochet tunecino (gancho largo, recoge toda la fila antes de cerrar — híbrido con tejido de punto), granny square (motivo circular desde el centro), filet (red de cuadrados abiertos/cerrados que forman una imagen).

## 4. Tejido a máquina

- **Doméstica** (punch card o electrónica) vs. **industrial** (CNC, whole-garment/3D).
- **Plana** (flatbed, piezas que se cosen después) vs. **circular** (tubo continuo sin costura).
- **Tejido de trama** (weft — como el tejido a mano, un solo hilo por fila, "corre" si se rompe) vs. **tejido de urdimbre** (warp — solo industrial, muchos hilos en zigzag paralelo, no corre — tricot, raschel).
- Calibre de máquina (agujas por pulgada) limita grosor de hilo y densidad de puntos alcanzable — análogo, no idéntico, al gauge a mano.

## 5. Bordado

Decora una tela terminada, no participa de su estructura.

A mano: punto de cruz (contable, sobre Aida), needlepoint/tapiz (cañamazo rígido, cubre toda la superficie), crewel (libre, con relieve, motivos florales), blackwork (geométrico, solo negro sobre blanco), punto satín/relleno (puntadas paralelas juntas), punto cadeneta / nudo francés (contorno / textura puntual).

A máquina: sigue un archivo **digitalizado** (digitizing) que traduce una imagen en una secuencia ordenada de puntadas (relleno, contorno, raso) con ángulo y densidad definidos — el pariente del bordado más parecido a "imagen → instrucciones ejecutables".

## 6. Construcción de sweaters

| Método | Idea | Complejidad de cálculo |
|---|---|---|
| **Raglan** | Líneas diagonales manga-cuerpo, 4 líneas de aumento/disminución | Baja — la más fácil de automatizar |
| Bottom-up | Cuerpo y mangas por separado hasta la sisa, luego se unen | Media |
| Top-down | Desde el cuello hacia abajo, se prueba puesto | Media |
| Canesú circular (yoke) | Cuerpo+mangas bajo un canesú circular, sin costura en hombros | Media-alta |
| Sisa clásica (set-in sleeve) | Manga con curva que encaja en hueco tejido en el cuerpo | Alta — la más compleja |
| Hombro caído (drop shoulder) | Sin sisa, cuerpo recto, manga se une directo | Muy baja |
| Hombro montado (saddle shoulder) | Franja de manga se extiende sobre el hombro | Media |

Cualquier construcción puede ser en piezas cosidas o *seamless*. Raglan y canesú circular se prestan mejor a seamless.

## 7. Lenguaje de patronaje

- **Gauge/muestra:** puntos y vueltas por 10×10cm, medido sobre tela **bloqueada**. Unidad de conversión cm↔puntos y cm↔filas — parámetro de entrada, no constante.
- **Ease/holgura** (Craft Yarn Council): muy ajustado −5 a −10cm · ajustado 0cm · clásico +5 a +10cm · holgado +10 a +15cm · oversized +15cm+. Constante en cm entre tallas, no en porcentaje.
- **Esquema:** geometría plana de cada pieza — contorno pecho, cuello, bíceps, muñeca, cintura, cadera; profundidad de sisa; largo de cuerpo y manga.
- **Grading:** recalcular el mismo pipeline por talla, manteniendo gauge y proporciones — pero ver sección 10, el marco del cuerpo no escala igual que la circunferencia.
- **Gráfico vs. instrucciones escritas:** ver sección 11.
- **Múltiplo y repetición:** puntos fantasía exigen que el total de puntos sea múltiplo de N (+ margen de borde) — restricción a respetar al redondear conteos por talla.

Abreviaturas comunes: der/k (derecho), rev/p (revés), aum/inc (aumento), dism/k2tog (disminución), ssk (disminución inclinada izquierda), hd/yo (hebra al aire), desl/sl (deslizar sin tejer), pssk/psso (pasar punto deslizado por encima).

## 8. Algoritmo de referencia: raglan simétrico desde el cuello

Regla física fija: **2 puntos por línea raglan cada 2 filas** (4 líneas → 8 pts/ronda total). Cada pieza (espalda, delantero, manga×2) linda con 2 líneas raglan → cada pieza gana 2 pts/ronda, siempre.

### Ejemplo numérico (gauge 2 pts/cm, 2.8 filas/cm)

- Pecho: 96cm real + 8cm ease clásico = 104cm final → **208 pts** objetivo (espalda+delantero).
- Cuello: 40cm (decisión de diseño) → **80 pts** de cast-on inicial.
- Bíceps: 32cm + 6cm ease = 38cm final → **76 pts** objetivo por manga.
- Profundidad de sisa: 20cm → 56 filas → **28 rondas** de aumento.

Reparto inicial simétrico (cuello sin forma): espalda 32, delantero 32, manga 8 c/u.

Tras 28 rondas (cada pieza +56 pts): espalda 88, delantero 88, manga 64 c/u.

**Faltante** (objetivo − subtotal): espalda 16, delantero 16, manga 12 c/u → se resuelve **montando puntos extra en cada axila** al separar cuerpo y mangas. No es un ajuste cosmético — las 4 piezas crecen al mismo ritmo fijo pero tienen metas distintas, así que el raglan puro nunca cierra las tres medidas a la vez.

## 9. Escote: crew, scoop y V

El canesú de la sección 8 asume cuello sin forma (tipo barco). Con escote real aparece un mecanismo adicional:

- **Delantero abierto:** se teje plano, dividido en 2 mitades, mientras espalda y mangas siguen el ritmo raglan normal. Al llegar a la profundidad deseada se cierra el hueco.
- **Aumentos de escote:** aumentos propios del borde interior de cada mitad, independientes del raglan.
- **Regla de cierre — crew/scoop:** puntos montados al unir + aumentos de escote (2 lados) = ancho de cuello de espalda. **V-neck:** igual pero sin montado — se cierra en punta cuando los aumentos solos llegan a ese número.

**Hallazgo clave:** si el delantero arranca del mismo tamaño que la espalda (32=32), los puntos de escote se suman ENCIMA del crecimiento raglan normal y el delantero termina sistemáticamente tan ancho como el ancho de cuello de más (32 pts de más) que la espalda. **Corrección: el delantero debe arrancar chico (1-2 pts), no simétrico.**

Con delantero = 1+1, 12 rondas abiertas, montado=8 al unir (8 + 24 aumentos de escote = 32 ✓): delantero termina en 90 vs. espalda en 88 — diferencia de 2 pts, coherente. Faltante en axila: espalda 16, delantero 14.

V-neck: puede seguir abierto más allá de las 28 rondas del canesú, incluso entrando en el cuerpo bajo la sisa.

Técnica alternativa, no desarrollada en detalle: **vuelta corta en cuña** (short-row wedge) — empezar con pocos puntos hacia el centro delantero e ir alargando cada vuelta, dejando espalda y mangas más largas que el centro del delantero. Logra un efecto similar sin dividir el delantero.

## 10. Entallado, manga y cuellera

Herramienta común: `cadencia_primaria = techo(filas disponibles ÷ eventos de cambio)` (eventos = pts a cambiar / 2 si el cambio es simétrico en 2 puntos). El resto no se absorbe en filas lisas sueltas: se resuelve con **cadencia mixta**, ejecutando una minoría de eventos a `cadencia_primaria - 1` (más frecuente) hasta que la suma cierre exacto contra las filas disponibles. Es lo que reproduce los tres ejemplos numéricos siguientes.

**Entallado** (opcional, cuerpo bajo la sisa, desde 208 pts): axila→cintura (176 pts, −32): 16 eventos / 42 filas → cada 3 filas. Cintura→ruedo (212 pts, +36): 18 eventos / 34 filas → cada 2 filas. No aplica a siluetas rectas (drop shoulder).

**Manga** (bíceps 76 → puño 36 pts, −40 pts): 20 eventos / 118 filas → cada 6 filas.

**Cuellera:** sin fórmula universal. Borde horizontal (puntos en espera): 1:1 exacto. Borde vertical/diagonal: 3-de-4 a 4-de-5 filas según la fuente — recomiendan probar en una muestra antes de comprometerse. Candidato a parámetro configurable con default, no constante fija.

## 11. Grading — tabla de tallas real (Craft Yarn Council, mujer)

| | S | M | L | XL |
|---|---|---|---|---|
| Pecho real | 81–86cm | 91.5–96.5cm | 101.5–106.5cm | 111.5–117cm |
| Brazo real | 26cm | 28cm | 30.5cm | 34.5cm |
| Profundidad de sisa | 16.5–17.5cm | 17.5–19cm | 19–20.5cm | 20.5–21.5cm |

**Hallazgo central:** de S a 5X el pecho casi se duplica (81→158cm) pero la sisa apenas crece ~60% (17→26.5cm) — el marco del cuerpo (hombros/cuello — ver también "cross back" CYC: 36cm en S a 47cm en 5X) crece mucho menos que la circunferencia. **Grading no es multiplicar todo por el mismo factor.**

Pipeline corrido en las 4 tallas (gauge y ease constantes; cuello y semilla de manga con crecimiento leve, no proporcional al pecho):

| | S | M | L | XL |
|---|---|---|---|---|
| Pecho final → pts | 184 | 204 | 224 | 244 |
| Brazo objetivo → pts | 64 | 68 | 74 | 82 |
| Rondas de sisa | 24 | 26 | 28 | 30 |
| Espalda/delantero al final del canesú | 78 | 83 | 88 | 93 |
| **Falta en axila del cuerpo** | **14** | **19** | **24** | **29** |
| Manga al final del canesú | 56 | 60 | 64 | 68 |
| **Falta en axila de manga** | **8** | **8** | **10** | **14** |

**Implicación de diseño:** el faltante en axila crece con la talla y más rápido que el resto del canesú (15% del objetivo en S, 24% en XL). En tallas grandes, cada vez más del ancho final no viene del raglan sino del salto montado de golpe en la axila. Patrones serios no escalan linealmente por esto — usan sisas proporcionalmente más profundas o ajustan el reparto inicial en tallas grandes. **Para el software:** calcular el faltante en axila explícitamente como salida, y si supera un umbral proporcional, ofrecer ajustar la profundidad de sisa en vez de aceptar el salto tal cual.

## 12. Formato de salida

Dos renderizadores distintos, alimentados por datos distintos: **la forma del sweater (raglan/escote/entallado/manga) se escribe, casi nunca se grafica**. Los gráficos son para motivos de punto (calados, cables, jacquard — sección 2), no para la silueta.

**Instrucciones escritas — convenciones (Craft Yarn Council / estándar de la industria):**
- Multi-talla: talla más chica sola, resto entre paréntesis separadas por coma — `30 (31, 32, 33) pts`.
- Repetición: asterisco marca el tramo repetido + "repetir desde *".
- Procesos paralelos: **"AT THE SAME TIME"** cuando dos cosas ocurren en las mismas filas (ej. escote y raglan simultáneos) — el renderizador de texto tiene que poder fusionar procesos que comparten filas, no asumir una lista lineal.

Ejemplo aplicando la tabla de grading (sección 11):
> Montar 76 (78, 80, 82) pts: 30 (31, 32, 33) espalda, pm, 8 manga der., pm, 30 (31, 32, 33) delantero, pm, 8 manga izq., pm. Unir en redondo.
> Ronda de aumento raglan (cada 2 rondas, 24 (26, 28, 30) veces): \*tejer hasta 1 pt antes del marcador, aum, k1, deslizar marcador, k1, aum\*, repetir desde \* 3 veces más, tejer hasta el final.
> Resultado: 78 (83, 88, 93) pts espalda/delantero, 56 (60, 64, 68) pts por manga.

**Gráfico — convenciones (CYC):** celda = 1 punto, fila = 1 vuelta. Símbolos estándar: celda vacía/línea vertical = derecho, línea horizontal = revés, círculo abierto = hebra al aire, diagonal derecha = k2tog, diagonal izquierda = ssk — pero el símbolo **no es 100% universal**, siempre hace falta leyenda. Lectura de abajo hacia arriba; en plano alterna dirección por vuelta (RS derecha→izquierda, WS izquierda→derecha), en redondo siempre igual.

## 13. Ideas de arquitectura sugeridas por este vocabulario

1. Modelar cada punto como símbolo con reglas de consumo/producción de puntos (alfabeto de gráfico) — para el renderizador de gráfico y para validar múltiplos de patrón.
2. Gauge y ease como parámetros de entrada separados del patrón base, nunca constantes.
3. Construcción como grafo/secuencia de piezas con puntos de unión (espalda, delantero, mangas, axilas), no una lista lineal única de instrucciones.
4. Grading como función paramétrica `talla → (gauge, medidas, holgura) → puntos y rondas` — pero con el marco del cuerpo (cuello/hombros) y la circunferencia (pecho/bíceps) tratados con tasas de crecimiento distintas, no un único factor de escala.
5. El "faltante en axila" como salida explícita del cálculo de canesú, con validación de umbral proporcional por talla.
6. Renderizador de texto que soporte notación multi-talla y procesos paralelos ("al mismo tiempo"), separado del renderizador de gráfico (que consume el alfabeto de símbolos, no la forma).

## Pendiente / próxima capa de complejidad

- Vuelta corta en cuña para escote (alternativa a delantero abierto), sin desarrollar en detalle.
- Aplicar la corrección de escote (delantero chico) y el entallado/manga a las 4 tallas de la tabla real (por ahora el grading multi-talla solo corrió el canesú base).
- Tejido a máquina, crochet y bordado quedan documentados (secciones 3-5) pero fuera del alcance de la primera etapa del software.

## Fuentes citadas durante la investigación

- [Standard Body Measurements/Sizing — Craft Yarn Council](https://www.craftyarncouncil.com/standards/body-sizing)
- [Woman Size Chart — Craft Yarn Council](https://www.craftyarncouncil.com/standards/woman-size)
- [Knit Chart Symbols — Craft Yarn Council](https://www.craftyarncouncil.com/standards/knit-chart-symbols)
- [Sweater Construction: The Many Ways to Knit a Sweater — tin can knits](https://blog.tincanknits.com/2021/07/29/sweater-construction-the-many-ways-to-knit-a-sweater/)
- [How to improvise a top-down sweater — KT's Slow Closet (serie completa)](https://ktslowcloset.com/2013/03/08/how-to-improvise-a-top-down-sweater-part-1-casting-on-and-marking-raglans/)
- [How to Shape Top-Down Necklines — Sister Mountain](https://www.sistermountain.com/blog/top-down-necklines)
- [Sweater Shaping Simplified — StitchMath](https://stitchmath.com/articles/knitting-sweater-shaping-guide/)
- [Reading Multi-Size Knitting-Pattern Instructions — tin can knits](https://blog.tincanknits.com/2020/10/08/reading-multi-size-knitting-pattern-instructions/)
- [Trust the process or trust your gut? Armhole sizing for plus size bodies — One Wild Designs](https://onewilddesigns.com/blogs/articles/trust-the-process-or-trust-your-gut-armhole-sizing-for-plus-size-bodies)
