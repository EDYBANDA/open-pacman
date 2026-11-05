# SPEC 02 — Los 4 fantasmas inician en la pocilga y Blinky sale primero

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (revierte su decisión "Blinky arranca fuera")
> **Fecha:** 2026-11-04
> **Objetivo:** Blinky pasa de nacer fuera (13,11) a nacer dentro de la pocilga en (13,14) y salir por la puerta como los demás, completando la salida escalonada 0/1.5/3/4.5 s de los 4 fantasmas.

## Scope

**In:**

- `GHOST_STARTS[0]` (blinky) pasa de (13,11) a (13,14), el hueco central bajo la puerta (maze.js).
- `initialGhost` elimina el caso especial: los 4 fantasmas nacen en fase `pen` con `releaseAt` 0/90/180/270 (game.js).
- Comentarios afectados actualizados (dejan de decir "Blinky nace activo y fuera").
- Verificar (no cambiar) que la secuencia tras morir ya se repite completa vía `resetPositions`.

**Out of scope (para futuros specs):**

- Cambiar `RELEASE_INTERVAL`, el rebote vertical de espera o el ciclo 7/20 s — se mantienen como están.
- Reabrir el bug "fantasmas atrapados": ya quedó arreglado en el commit `fcbc55f`; aquí solo se protege con criterios de aceptación.
- Power pellets, modo asustado, fantasmas comestibles (pendientes del SPEC 01).
- Salida por contador de dots comidos.

## Data model

```js
// maze.js — blinky se muda al hueco central de la pocilga:
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'blinky' }, // dentro de la pocilga, bajo la puerta
  { x: 14, y: 14, kind: 'pinky'  }, // dentro de la pocilga
  { x: 12, y: 14, kind: 'inky'   }, // dentro de la pocilga
  { x: 15, y: 14, kind: 'clyde'  }, // dentro de la pocilga
];

// game.js — initialGhost sin caso especial:
{
  kind: 'blinky',
  phase: 'pen',    // los 4, incluido blinky
  releaseAt: 0,    // blinky=0, pinky=90, inky=180, clyde=270
}
```

El resto del modelo no cambia: `lifeFrame`, `mode`, `modeTimer` y la máquina `pen → leaving → active` ya existen del SPEC 01.

## Plan de implementación

1. **Blinky a la pocilga (maze.js).** Mover el start de blinky a (13,14) y actualizar su comentario. Manual: al abrir `src/index.html`, Blinky aparece dentro de la pocilga (estado intermedio: aún nace `active` y deambula dentro hasta que scatter lo saca por la puerta; se corrige en el paso 2).
2. **Todos nacen en pen (game.js).** En `initialGhost`, `phase: 'pen'` para todos (eliminar `start.kind === 'blinky' ? 'active' : 'pen'`) y actualizar el comentario de la función. `resetPositions` ya reinicia vía `initialGhost` + `lifeFrame = 0`, así que la secuencia tras morir no requiere cambios. Manual: Blinky sube por la puerta y queda activo en el primer segundo; luego Pinky (~1.5 s), Inky (~3 s) y Clyde (~4.5 s); tras morir, la secuencia se repite completa.

## Criterios de aceptación

- [ ] Al iniciar la partida, los 4 fantasmas están dentro de la pocilga (columnas 11-16, filas 13-15) rebotando verticalmente; ninguno está fuera.
- [ ] Blinky sale primero: atraviesa la puerta (fila 12) y queda activo en (13,11) dentro del primer segundo de vida.
- [ ] Pinky, Inky y Clyde salen a los ~1.5 s, ~3 s y ~4.5 s respectivamente, en ese orden.
- [ ] Ningún fantasma reentra nunca a la pocilga (regla de puerta "solo salida" intacta).
- [ ] Tras cada muerte de Pac-Man, los 4 regresan a la pocilga y repiten la secuencia completa 0/1.5/3/4.5 s.
- [ ] La IA de Inky (flanqueo respecto a `ghosts[0]`) sigue funcionando con Blinky activo.
- [ ] Sin errores en consola; el juego sigue siendo ganable y perdible.

Verificación: abrir `src/index.html` en el navegador (`file://`, sin build).

## Decisiones

- **Sí:** Blinky inicia en (13,14), el hueco central bajo la puerta. Era el único slot libre y sale recto hacia arriba sin cruce lateral.
- **Sí:** retardos 0/1.5/3/4.5 s. Blinky "sale en cuanto arranca la vida" y se mantiene `RELEASE_INTERVAL = 90` del SPEC 01 (en la práctica sale a los ~0.7 s: espera su primer `y` alineado y sube 3 celdas a velocidad 1/10).
- **Sí:** mantener el rebote vertical de espera y el ciclo tras morir. Ya implementados; solo se verifican.
- **No:** 1.5/3/4.5/6 s. Blinky esperando 1.5 s retrasa el arranque sin beneficio.
- **No:** todos a la vez. Pierde la progresión escalonada.
- **No:** diagnosticar el bug "atrapados" de raíz. El usuario confirmó que en el main actual salen correctamente (el fix llegó en `fcbc55f`); los criterios de aceptación protegen contra regresiones.
- **Nota:** este spec revierte la decisión del SPEC 01 "Blinky arranca fuera"; su criterio "(13,11) al iniciar" queda sustituido por los de aquí.

## Lo que **no** está en este spec

- Power pellets, modo asustado, fantasmas comestibles.
- Cambios de cadencia, animación de espera o ciclo scatter/chase.
- Salida por contador de dots comidos.

Cada uno de esos, si llega, va en su propio spec.
