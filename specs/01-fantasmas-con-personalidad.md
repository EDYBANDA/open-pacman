# SPEC 01 — Fantasmas con personalidad propia (Blinky, Pinky, Inky y Clyde)

> **Estado:** Approved
> **Depende de:** ninguno (parte del MVP existente)
> **Fecha:** 2026-11-04
> **Objetivo:** Sustituir los 2 fantasmas genéricos por los 4 clásicos del arcade, cada uno con su propia IA de objetivo, fases scatter/chase y salida escalonada de la pocilga.

## Scope

**In:**

- 4 fantasmas con kinds `blinky`, `pinky`, `inky`, `clyde` en `GHOST_STARTS` (maze.js).
- Blinky (el agresivo pedido): en chase persigue directo la celda de Pac-Man.
- Pinky: apunta a la celda 4 posiciones delante del frente de Pac-Man.
- Inky: apunta al punto de flanqueo (2 delante de Pac-Man, reflejado respecto a Blinky).
- Clyde: persigue si está a más de 8 celdas de Pac-Man; a 8 o menos se retira a su esquina.
- Fases globales scatter/chase alternadas por temporizador (7 s scatter / 20 s chase, ciclo indefinido), con inversión de dirección al cambiar de modo.
- Salida escalonada de la pocilga: Blinky arranca fuera; un temporizador de intervalo suelta un fantasma cada 1.5 s (Pinky a 1.5 s, Inky a 3 s, Clyde a 4.5 s). Regla de puerta "solo salida" para fantasmas.
- Color fijo por kind en render.js.

**Out of scope (para futuros specs):**

- Power pellets, modo asustado (frightened) y fantasmas comestibles.
- Velocidades distintas por fantasma (Cruise Elroy, frenado en túnel).
- Salida por contador de dots comidos (usamos temporizadores fijos).
- Secuencia exacta de fases del arcade (7,20,7,20,5,20,5,∞).
- Nombres de fantasmas en el HUD.

## Data model

```js
// maze.js — GHOST_STARTS pasa de 2 a 4, y se añade:
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' }, // fuera de la pocilga, sobre la puerta
  { x: 14, y: 14, kind: 'pinky'  }, // dentro de la pocilga
  { x: 12, y: 14, kind: 'inky'   }, // dentro de la pocilga
  { x: 15, y: 14, kind: 'clyde'  }, // dentro de la pocilga
];
// Dianas de distancia (no celdas transitables; pueden caer fuera del grid).
const SCATTER_CORNERS = {
  blinky: { x: 25, y: 0 },
  pinky:  { x: 2,  y: 0 },
  inky:   { x: 27, y: 30 },
  clyde:  { x: 0,  y: 30 },
};

// game.js — cada fantasma gana dos campos:
{
  kind: 'blinky',
  phase: 'pen' | 'leaving' | 'active',
  releaseAt: 90, // frames desde el inicio de la vida; blinky = 0
}

// game.js — estado global de la partida:
{
  mode: 'scatter' | 'chase',
  modeTimer: 420, // frames restantes del modo actual
  lifeFrame: 0,   // frames transcurridos de la vida actual
}
```

Constantes (game.js): `SCATTER_FRAMES = 420` (7 s), `CHASE_FRAMES = 1200` (20 s), `RELEASE_INTERVAL = 90` (1.5 s; `releaseAt` = 90/180/270 según fantasma), radio de Clyde `CLYDE_RADIUS = 8`.
Temporizadores en frames asumiendo ~60 fps, como el resto del juego. No se crean archivos nuevos; `index.html` no cambia.

## Plan de implementación

1. **Datos y colores.** maze.js: `GHOST_STARTS` con 4 kinds + `SCATTER_CORNERS` (exportado por `window`). game.js: crear fantasmas con `phase`/`releaseAt` (blinky `active`, resto `pen`); decideGhost provisional: `blinky` caza directo (lógica actual de `hunter`), los demás aleatorio (lógica actual de `random`). render.js: `GHOST_COLORS` pasa de array indexado a objeto por kind. Manual: 4 fantasmas con colores correctos, juego jugable.
2. **Pocilga.** game.js: máquina `pen → leaving → active` con `lifeFrame` (oscilación vertical entre filas 13 y 15; al cumplirse `releaseAt`, alinear a la columna 13 y subir por la puerta hasta y=11). Regla de puerta solo-salida: en `canMove`, celda 3 con `dir === 'down'` es muro para fantasmas (nadie reentra). `resetPositions` reinicia fases, `lifeFrame` y modo. Actualizar la nota de la puerta en AGENTS.md. Manual: salidas escalonadas (uno cada 1.5 s) al inicio y tras morir; ningún fantasma reentra a la pocilga.
3. **Personalidades.** game.js: refactor `decideGhost` → `targetFor( game, g )` + selección greedy con desempate arcade (up > left > down > right). Implementar blinky (celda de Pac-Man), pinky (+4 frente), inky (reflejo de +2 frente respecto a `ghosts[0]`) y clyde (radio 8). Manual: Pinky corta el paso por delante; Inky flanquea; Clyde se retira al acercarte.
4. **Fases scatter/chase.** game.js: `game.mode`/`modeTimer` en `update`; en scatter `targetFor` devuelve `SCATTER_CORNERS[ kind ]`; al cambiar de modo, los fantasmas activos invierten su dirección. Manual: ciclos visibles de acoso y retirada; partida completable.

## Criterios de aceptación

- [ ] Hay 4 fantasmas simultáneos con colores fijos distintos (rojo, rosa, cian, naranja).
- [ ] Blinky inicia fuera de la pocilga, en (13,11).
- [ ] En chase, cada fantasma elige la dirección que minimiza la distancia Manhattan a su objetivo, con desempate up > left > down > right.
- [ ] En chase, Pinky se dirige a la celda 4 delante del frente de Pac-Man.
- [ ] En chase, Inky apunta al reflejo del punto 2-delante-de-Pacman respecto a Blinky.
- [ ] En chase, Clyde persigue a más de 8 celdas y va a su esquina a 8 o menos.
- [ ] Los 4 alternan scatter/chase con el ciclo 7 s / 20 s e invierten dirección al cambiar.
- [ ] Pinky, Inky y Clyde salen de la pocilga a los 1.5 s, 3 s y 4.5 s (uno cada 1.5 s), al inicio y tras cada muerte; ningún fantasma entra nunca a la pocilga.
- [ ] Sin errores en consola; el juego sigue siendo ganable y perdible.

Verificación: abrir `src/index.html` en el navegador (`file://`, sin build).

## Decisiones

- **Sí:** personalidades clásicas del arcade. Lo pidió el usuario y `GHOST_COLORS` ya tenía los 4 colores.
- **Sí:** intervalo uniforme de salida de 1.5 s (1.5/3/4.5 s) en vez del contador de dots del arcade. Cadencia regular pedida por el usuario; acelera el arranque de la partida y mantiene la progresión escalonada.
- **No:** retardos irregulares 2/6/10 s. Descartados a petición del usuario.
- **Sí:** ciclo indefinido 7 s/20 s. La secuencia exacta del arcade no aporta valor aquí.
- **Sí:** desempate arcade up > left > down > right. Determinista y fiel.
- **Sí:** invertir dirección al cambiar de modo. Señal clásica, coste casi nulo.
- **Sí:** puerta "solo salida" para fantasmas. Sin ella, un fantasma puede quedar oscilando dentro de la pocilga si Pac-Man campa justo debajo. Requiere actualizar la nota de AGENTS.md.
- **No:** reproducir el bug histórico de Pinky (4 arriba + 4 izquierda). Artefacto, no diseño.
- **No:** velocidades por fantasma ni frenado en túnel. Velocidad uniforme `GHOST_SPEED`.
- **No:** power pellets / frightened. Merece su propio spec.

## Riesgos

| Riesgo                                               | Mitigación                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| 4 cazadores acorralan sin descanso                   | Las fases scatter dan respiros cíclicos obligatorios                        |
| Greedy sin pathfinding se atasca en rincones locales | Es el comportamiento del arcade; el laberinto clásico está diseñado para él |
| Timers en frames varían con pantallas de 120 Hz      | Mismo supuesto ~60 fps que el resto del juego; delta-time iría en otro spec |
| Colisión "injusta" al salir de la pocilga            | La puerta ya bloquea a Pac-Man: no puede entrar a esperarlos                |

## Lo que **no** está en este spec

- Power pellets, modo asustado, fantasmas comestibles.
- Velocidades distintas, Cruise Elroy, frenado en túnel.
- Contador de dots y secuencia exacta de fases del arcade.
- Nombres en el HUD.

Cada uno de esos, si llega, va en su propio spec.
