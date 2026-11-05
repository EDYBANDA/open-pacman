# SPEC 03 — Power pellets: esquinas, modo asustado y fantasmas comestibles

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02 (máquina pen→leaving→active y salidas escalonadas)
> **Fecha:** 2026-11-04
> **Objetivo:** Añadir 4 power pellets en las esquinas clásicas que asustan a los fantasmas (azules, lentos, huida aleatoria) y los vuelven comestibles con cadena 200/400/800/1600, devolviendo al comido como ojos a la pocilga.

## Scope

**In:**

- Carácter `'o'` → código 4 (power pellet) en maze.js: `parseTile` y las celdas (1,3), (26,3), (1,23), (26,23) de `MAZE_STR` (hoy son dots).
- Nota de códigos de celda de AGENTS.md actualizada (`'o'`=4) y matiz de la puerta para ojos.
- Comer pellet: 50 pts, descuenta `dotsRemaining`, dispara el modo asustado.
- Victoria: `dotsRemaining` cuenta dots (2) y pellets (4): 279 items (275 dots + 4 pellets).
- Modo asustado 6 s: todos los fantasmas no-ojos se vuelven azules y comestibles, huyen a 0.05 (0.5×) con dirección aleatoria en los cruces, los activos invierten dirección al dispararse, parpadean azul/blanco los últimos 2 s, y el temporizador scatter/chase queda en pausa.
- Fantasmas comestibles: colisión con asustado lo come (200/400/800/1600 por racha, reset a 200 con cada pellet); el comido pasa a fase `eyes` (solo ojos, 0.2), reentra por la puerta (única excepción a "solo salida"), se regenera en (13,14) y sale de nuevo por la máquina existente, ya no asustado.
- Render: pellets grandes parpadeantes; fantasma azul/blanco parpadeante; ojos sin cuerpo.

**Out of scope (para futuros specs):**

- Fruta bonus, niveles y duración decreciente del fright.
- Popup de puntos y congelación de ~1 s al comer fantasma (suma directo al score).
- Racha persistente entre pellets.
- Cruise Elroy, velocidades por fantasma, frenado en túnel.

## Data model

```js
// maze.js — 4 chars de MAZE_STR cambian de '.' a 'o' (filas 3 y 23, cols 1 y 26):
'#o####.#####.##.#####.####o#'  // fila 3
'#o..##................##..o#'  // fila 23
// parseTile gana: if ( ch === 'o' ) return 4;

// game.js — constantes nuevas:
const FRIGHT_FRAMES = 360;       // 6 s de modo asustado
const FRIGHT_SPEED = 0.05;       // 0.5x GHOST_SPEED (huida)
const EYES_SPEED = 0.2;          // 2x GHOST_SPEED (regreso de ojos)
const FRIGHT_BLINK_FRAMES = 120; // 2 s de parpadeo final
const GHOST_SCORES = [ 200, 400, 800, 1600 ]; // cadena por racha

// game.js — estado global de la partida (createGame) gana:
{
  frightTimer: 0, // frames restantes del modo asustado (0 = inactivo)
  frightChain: 0, // fantasmas comidos en la racha actual (indice en GHOST_SCORES)
}

// game.js — cada fantasma gana un campo y una fase:
{
  frightened: false, // azul, comestible; false para ojos y regenerados
  // phase gana 'eyes': active --comido--> eyes --> pen (regenerado) --> leaving --> active
}
```

Comer en `movePacman` distingue: celda 2 → 10 pts; celda 4 → 50 pts + disparar fright. `createGame`/`resetPositions` cuentan y limpian el nuevo estado. `canMove` mantiene la puerta bloqueada a la bajada salvo para `eyes`. No se crean archivos nuevos; `index.html` no cambia.

## Plan de implementación

1. **Pellets en el tablero (maze.js + game.js + render.js + AGENTS.md).** maze.js: `'o'` en las 4 celdas + `parseTile` + comentario de códigos. game.js: `dotsRemaining` cuenta `v === 2 || v === 4`; comer celda 4 → 50 pts y `dotsRemaining--`. render.js: `drawDots` dibuja celda 4 con radio 6 y parpadeo (~10 frames visible / ~10 oculto). AGENTS.md: `'o'`=4 en la nota de códigos. Manual: 4 pellets grandes parpadeantes en las esquinas; comerlos suma 50 y la partida sigue ganable.
2. **Modo asustado (game.js + render.js).** Constantes + `frightTimer`/`frightChain`. Disparo al comer pellet: 360 frames, cadena a 0, todos los no-ojos `frightened = true` y los activos invierten dirección. Tick en `update`: mientras `frightTimer > 0` el `modeTimer` no baja; al expirar se limpian los flags. `decideGhost`: asustado elige aleatorio entre opciones válidas; velocidad 0.05 solo en fase `active` (pen/leaving siguen a ritmo normal, como el arcade). Colisión: asustado no mata (se atraviesan). render.js: asustado azul `#2121ff`, parpadeo blanco si quedan ≤120 frames (`drawGhost` necesita el `frightTimer`). `resetPositions` limpia el fright. Manual: comer pellet → todos azules huyen lento, ~6 s y vuelven a la normalidad; el ciclo scatter/chase se congela y reanuda donde iba.
3. **Comestibles y ojos (game.js + render.js + AGENTS.md).** `GHOST_SCORES`; colisión con asustado → comer: score con cadena, `phase: 'eyes'`, `frightened = false`. Fase `eyes`: se mueve a 0.2 con diana (13,14) por el greedy existente, único autorizado a bajar por la puerta; al llegar alineado a (13,14) se regenera (`phase: 'pen'`, `releaseAt = lifeFrame` → sale en el próximo alineado). Ojos no colisionan. render.js: ojos = solo los dos ojos, sin cuerpo. AGENTS.md: excepción de puerta para ojos. Manual: comer los 4 → 200/400/800/1600; los ojos cruzan la puerta, regeneran y salen normales aunque quede fright; otro pellet reinicia a 6 s y cadena a 200.

## Criterios de aceptación

- [ ] Hay exactamente 4 pellets grandes parpadeantes en (1,3), (26,3), (1,23), (26,23) al iniciar la partida.
- [ ] Comer un pellet suma 50 pts y descuenta 1 de `dotsRemaining`; la victoria exige comer los 279 items (275 dots + 4 pellets).
- [ ] Tras comerlo, los fantasmas no-ojos se vuelven azules, huyen a 0.05 con dirección aleatoria en los cruces, y los activos invierten su dirección.
- [ ] El fright dura 6 s; el ciclo scatter/chase queda pausado y reanuda su cuenta donde iba; los últimos ~2 s parpadean azul/blanco.
- [ ] El contacto con un fantasma asustado lo come (no mata a Pac-Man) y puntúa 200/400/800/1600 según la racha.
- [ ] El comido se convierte en ojos a 0.2 que entran por la puerta (única excepción a "solo salida"), se regeneran en (13,14) y salen de nuevo; mientras son ojos no colisionan.
- [ ] Comer otro pellet reinicia el fright a 6 s y la cadena a 200.
- [ ] Un fantasma regenerado sale normal (no asustado) aunque quede tiempo de fright.
- [ ] Tras morir Pac-Man no queda estado residual: sin flags de fright, fantasmas normales y ciclo scatter/chase reiniciado como hasta ahora.
- [ ] Sin errores en consola; el juego sigue siendo ganable y perdible.

Verificación: abrir `src/index.html` en el navegador (`file://`, sin build).

## Decisiones

- **Sí:** `'o'` → 4 en `MAZE_STR`. Mantiene el patrón pristino/copia y el comer-vía-grid; exige actualizar la nota de AGENTS.md.
- **Sí:** posiciones clásicas (1,3), (26,3), (1,23), (26,23). Ya eran celdas con dot; son las esquinas del arcade.
- **Sí:** los pellets cuentan para ganar. Como el arcade; el total queda en 279 items.
- **Sí:** 6 s de fright, huida aleatoria a 0.5× y pausa del `modeTimer`. Comportamiento del arcade nivel 1.
- **Sí:** cadena 200/400/800/1600 con reset por pellet. Clásico y simple (`GHOST_SCORES[ frightChain++ ]`).
- **Sí:** ojos a 2× que reentran por la puerta y salen reutilizando pen→leaving. Único cambio a la regla "solo salida"; documentado en AGENTS.md.
- **Sí:** regenerado sale normal aunque quede fright. Comportamiento del arcade.
- **Sí:** fantasmas en pen/leaving también se asustan (azules). Inofensivos: Pac-Man no puede entrar; al activarse ya huyen lento.
- **No:** popup de puntos y congelación al comer fantasma. El arcade lo hace; aquí suma directo (otro spec si se pide).
- **No:** duración decreciente del fright. No hay niveles en el juego.
- **No:** racha persistente entre pellets. Se resetea a 200 con cada pellet, como el arcade.

## Riesgos

| Riesgo                                                  | Mitigación                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Azul de fright (`#2121ff`) idéntico al color de paredes | Es el azul del arcade; ojos blancos y parpadeo final los distinguen                                                            |
| Ojos atascados con greedy hacia (13,14)                 | La puerta es el único acceso y los ojos el único actor que puede bajar por ella; probar regreso desde el túnel y ambas mitades |
| Pellets en cadena (fright sobre fright)                 | `frightTimer` se reasigna a 360 y la cadena se resetea; el estado queda acotado                                                |
| Colisiones sub-celda a velocidades nuevas (0.05/0.2)    | Umbral 0.5 existente en `collides`; ojos excluidos del bucle de colisión                                                       |

## Lo que **no** está en este spec

- Fruta bonus, niveles, fright decreciente.
- Popup de puntos ni congelación al comer fantasma.
- Racha persistente entre pellets.
- Cruise Elroy y velocidades por fantasma.

Cada uno de esos, si llega, va en su propio spec.
