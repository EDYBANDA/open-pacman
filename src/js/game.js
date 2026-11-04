// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const RELEASE_INTERVAL = 90; // 1.5 s entre salidas de la pocilga (a ~60 fps)
const CLYDE_RADIUS = 8; // celdas; a esta distancia o menos, Clyde se retira
const SCATTER_FRAMES = 420; // 7 s de scatter
const CHASE_FRAMES = 1200; // 20 s de chase

// Estado inicial de un fantasma a partir de su entrada i-esima de GHOST_STARTS.
// Blinky nace activo y fuera; el resto espera en la pocilga su turno de salida.
function initialGhost( start, i ) {
  return {
    x: start.x,
    y: start.y,
    dir: 'up',
    speed: GHOST_SPEED,
    kind: start.kind,
    phase: start.kind === 'blinky' ? 'active' : 'pen',
    releaseAt: RELEASE_INTERVAL * i, // blinky=0, pinky=90, inky=180, clyde=270
  };
}

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    lifeFrame: 0, // frames transcurridos de la vida actual (gobierna las salidas)
    mode: 'scatter', // fase global actual (scatter | chase)
    modeTimer: SCATTER_FRAMES, // frames restantes del modo actual
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( initialGhost ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  if ( isWall( grid, tx, ty, actor ) ) return false;
  // Puerta "solo salida": un fantasma nunca baja a la puerta; nadie reentra a la pocilga.
  if ( actor === 'ghost' && dir === 'down' && grid[ ty ][ tx ] === 3 ) return false;
  return true;
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Prioridad de desempate del arcade al elegir direccion.
const ARCADE_ORDER = [ 'up', 'left', 'down', 'right' ];

// Diana de un fantasma segun su personalidad (spec 01).
// Puede caer fuera del grid: solo se usa para comparar distancias.
function targetFor( game, g ) {
  // En scatter, cada fantasma se retira a su esquina.
  if ( game.mode === 'scatter' ) return SCATTER_CORNERS[ g.kind ];

  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const d = DIRS[ p.dir ];

  if ( g.kind === 'blinky' ) {
    // El agresivo: directo a la celda de Pac-Man.
    return { x: px, y: py };
  }
  if ( g.kind === 'pinky' ) {
    // Embosca 4 celdas delante del frente de Pac-Man.
    return { x: px + d.x * 4, y: py + d.y * 4 };
  }
  if ( g.kind === 'inky' ) {
    // Flanquea: punto 2-delante-de-Pacman reflejado respecto a Blinky (ghosts[0]).
    const b = game.ghosts[ 0 ];
    return {
      x: ( px + d.x * 2 ) * 2 - Math.round( b.x ),
      y: ( py + d.y * 2 ) * 2 - Math.round( b.y ),
    };
  }
  // clyde: persigue lejos; a CLYDE_RADIUS celdas o menos (euclideo), se retira a su esquina.
  const dist = Math.hypot( Math.round( g.x ) - px, Math.round( g.y ) - py );
  return dist > CLYDE_RADIUS ? { x: px, y: py } : SCATTER_CORNERS.clyde;
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const target = targetFor( game, g );

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Greedy: minimizar la distancia Manhattan a la diana,
  // con desempate arcade up > left > down > right.
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of ARCADE_ORDER ) {
    if ( !choices.includes( dir ) ) continue;
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

// Fase 'pen': oscilacion vertical entre las filas 13 y 15 dentro de la pocilga.
// Al cumplirse releaseAt (con y alineado), pasa a 'leaving'.
function movePenGhost( game, g ) {
  const d = DIRS[ g.dir ];
  g.y += d.y * g.speed;
  if ( aligned( g.y ) ) {
    g.y = Math.round( g.y );
    if ( g.y <= 13 ) g.dir = 'down';
    else if ( g.y >= 15 ) g.dir = 'up';
  }
  if ( game.lifeFrame >= g.releaseAt && aligned( g.y ) ) g.phase = 'leaving';
}

// Fase 'leaving': alinear a la columna 13 y subir por la puerta hasta y=11.
function moveLeavingGhost( g ) {
  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    if ( g.y === 11 ) {
      // Ya fuera: comportamiento normal desde el siguiente frame.
      g.phase = 'active';
      g.dir = 'left';
      return;
    }
    if ( g.x < 13 ) g.dir = 'right';
    else if ( g.x > 13 ) g.dir = 'left';
    else g.dir = 'up';
  }
  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
}

function moveGhost( game, g ) {
  if ( g.phase === 'pen' ) {
    movePenGhost( game, g );
    return;
  }
  if ( g.phase === 'leaving' ) {
    moveLeavingGhost( g );
    return;
  }

  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.lifeFrame = 0;
  game.mode = 'scatter';
  game.modeTimer = SCATTER_FRAMES;
  game.ghosts.forEach( ( g, i ) => Object.assign( g, initialGhost( GHOST_STARTS[ i ], i ) ) );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  game.lifeFrame++;

  // Alternancia global scatter/chase (7 s / 20 s, ciclo indefinido).
  // Al cambiar de modo, los fantasmas activos invierten su direccion.
  game.modeTimer--;
  if ( game.modeTimer <= 0 ) {
    game.mode = game.mode === 'chase' ? 'scatter' : 'chase';
    game.modeTimer = game.mode === 'scatter' ? SCATTER_FRAMES : CHASE_FRAMES;
    game.ghosts.forEach( ( g ) => {
      if ( g.phase === 'active' ) g.dir = OPPOSITE[ g.dir ];
    } );
  }

  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
