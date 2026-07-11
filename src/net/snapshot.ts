import type {
  Bullet,
  Enemy,
  GameData,
  GameState,
  Player,
  PowerUp,
} from '../game/types';

export interface GameSnapshot {
  player: Player;
  player2: Player | null;
  bullets: Bullet[];
  enemies: Enemy[];
  powerUps: PowerUp[];
  score: number;
  wave: number;
  waveTimer: number;
  waveDelay: number;
  enemiesSpawned: number;
  enemiesPerWave: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  state: GameState;
  slowMotion: number;
  slowMotionTimer: number;
}

/** Serializes host gameplay state for guest render sync. */
export function buildSnapshot(g: GameData): GameSnapshot {
  return {
    player: { ...g.player },
    player2: g.player2 ? { ...g.player2 } : null,
    bullets: g.bullets.map((b) => ({ ...b })),
    enemies: g.enemies.map((e) => ({ ...e })),
    powerUps: g.powerUps.map((p) => ({ ...p })),
    score: g.score,
    wave: g.wave,
    waveTimer: g.waveTimer,
    waveDelay: g.waveDelay,
    enemiesSpawned: g.enemiesSpawned,
    enemiesPerWave: g.enemiesPerWave,
    combo: g.combo,
    comboTimer: g.comboTimer,
    maxCombo: g.maxCombo,
    state: g.state,
    slowMotion: g.slowMotion,
    slowMotionTimer: g.slowMotionTimer,
  };
}

/**
 * Applies a host snapshot onto guest GameData for render-only sync.
 *
 * `buildSnapshot` always runs on the host, so `snap.player`/`snap.player2` are in the
 * host's frame: `player` is the host's own ship, `player2` is the guest's ship. On the
 * guest, `g.player` is "me" (drives the HUD), so we remap: `g.player` gets the guest's
 * ship (`snap.player2`) and `g.player2` gets the host's ship (`snap.player`).
 */
export function applySnapshot(g: GameData, snap: GameSnapshot): void {
  const isGuest = g.coopRole === 'guest';
  const selfSnap: Player = isGuest && snap.player2 ? snap.player2 : snap.player;
  const otherSnap: Player | null = isGuest && snap.player2 ? snap.player : snap.player2;

  Object.assign(g.player, selfSnap);
  if (otherSnap) {
    if (g.player2) {
      Object.assign(g.player2, otherSnap);
    } else {
      g.player2 = { ...otherSnap };
    }
  } else {
    g.player2 = null;
  }
  g.bullets = snap.bullets.map((b) => ({ ...b }));
  g.enemies = snap.enemies.map((e) => ({ ...e }));
  g.powerUps = snap.powerUps.map((p) => ({ ...p }));
  g.score = snap.score;
  g.wave = snap.wave;
  g.waveTimer = snap.waveTimer;
  g.waveDelay = snap.waveDelay;
  g.enemiesSpawned = snap.enemiesSpawned;
  g.enemiesPerWave = snap.enemiesPerWave;
  g.combo = snap.combo;
  g.comboTimer = snap.comboTimer;
  g.maxCombo = snap.maxCombo;
  g.state = snap.state;
  g.slowMotion = snap.slowMotion;
  g.slowMotionTimer = snap.slowMotionTimer;
}
