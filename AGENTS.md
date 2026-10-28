# AGENTS.md

Juego tipo Pac-Man en Vanilla JS/HTML/CSS. Sin build, sin `package.json`, sin npm, sin tests y sin linter. No inventes comandos de verificación: se prueba abriendo `src/index.html` en el navegador (funciona directamente por `file://`, no hay dev server ni dependencias).

## Arquitectura (globals, no módulos)

- Son 4 `<script>` en `src/index.html` y el ORDEN importa: `maze.js` → `game.js` → `render.js` → `main.js`.
- Se comunican por globals de `window`: maze expone `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`; game expone `createGame`, `update`, `DIRS`; render expone `draw`. Un archivo JS nuevo requiere su etiqueta `<script>` en el HTML, en la posición correcta. No convertir a ES modules sin pedirlo.

## Contratos que se rompen fácil

- `MAZE` es pristina e inmutable: cada partida la copia a `game.grid` y los dots se comen ahí. Renderizar siempre desde `game.grid`, nunca desde `MAZE` (ver comentario en render.js).
- Códigos de celda: `#`=1 pared · `.`=2 dot · ` `=0 vacío · `-`=3 puerta. La puerta (3) bloquea a Pac-Man pero NO a los fantasmas (`isWall` en game.js).
- Las posiciones son floats sub-celda (velocidades 1/8 y 1/10 celda/frame); los giros y decisiones solo aplican al estar alineado (`aligned`, tolerancia 1e-3). Tunel: fila 14 (`TUNNEL_ROW`) con wrap horizontal.
- El canvas es 560×620, hardcoded en index.html = 28×31 tiles × `TILE = 20` (render.js). Cambiar el laberinto o `TILE` exige actualizar a mano los atributos `width`/`height` del canvas.

## Convenciones

- Comentarios y textos de UI en español. Responder siempre en el idioma del usuario.
- Estilo del código: comillas simples, espacios dentro de paréntesis `( x )`, indentación de 2 espacios, punto y coma.

## Workflow: Spec Driven Development

- El proyecto existe para aprender este flujo (README). Las features nuevas van por el skill `spec` (escribe `specs/NN-slug.md` en estado Draft) y luego `spec-impl` (solo implement specs en estado Approved; crea la rama `spec-NN-slug`; implementa paso a paso con pausas; nunca commitea por su cuenta).
- `.agents/skills/` y `skills-lock.json` son skills instaladas: no editarlas a mano.
