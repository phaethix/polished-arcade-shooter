import type { Rng } from './core/rng';
import type { InputState } from '../app/input';

export type AircraftId = 'falcon' | 'phantom' | 'fortress';

export type AircraftSkill = 'missile_salvo' | 'dash' | 'energy_shield';

export type WeaponId = 'standard' | 'armor_piercing' | 'shotgun' | 'laser' | 'homing';

export type ChapterId = 'space' | 'asteroid' | 'carrier' | 'wormhole';

export type BossPatternId = 'fan' | 'rain' | 'broadside' | 'ring';

export type GameMode = 'story' | 'endless' | 'boss_rush' | 'daily' | 'practice' | 'coop_endless';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type DailyModifier = 'double_speed' | 'no_powerups' | 'single_hp' | 'kamikaze_only';

export type AchievementId =
  | 'first_blood'
  | 'combo_master'
  | 'graze_king'
  | 'boss_slayer'
  | 'survivor'
  | 'untouchable';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'explosion' | 'trail' | 'spark' | 'star' | 'ring' | 'ember' | 'score';
  text?: string; // for score popups
  startSize?: number; // for rings (expands from 0 to startSize)
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  isPlayer: boolean;
  color: string;
  grazed?: boolean; // player already got graze bonus for this bullet
  homingStrength?: number; // 0..1 turn rate toward target (missiles)
  weapon?: WeaponId;
  pierceRemaining?: number;
  maxTravel?: number;
  distanceTraveled?: number;
}

export type EnemyType =
  | 'basic'
  | 'fast'
  | 'tank'
  | 'boss'
  | 'mini'
  | 'splitter'
  | 'sniper'
  | 'shielded'
  | 'kamikaze'
  | 'healer';

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  type: EnemyType;
  shootTimer: number;
  shootInterval: number;
  movePattern: 'straight' | 'sine' | 'zigzag';
  movePhase: number;
  scoreValue: number;
  flashTimer: number;
  state?: 'patrol' | 'rush' | 'aim';
  aimTimer?: number;
  healPulse?: number;
  /** Set on bosses; selects chapter-specific attack pattern. */
  bossPattern?: BossPatternId;
  /** Increments each boss volley for alternating pattern variants. */
  bossVolley?: number;
}

export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spread' | 'speed' | 'shield' | 'bomb' | 'heal' | 'weapon';
  vy: number;
  weaponId?: WeaponId;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  shootTimer: number;
  shootInterval: number;
  hp: number;
  maxHp: number;
  invincibleTimer: number;
  powerLevel: number;
  shieldActive: boolean;
  shieldTimer: number;
  tilt: number; // visual banking -1..1
  grazeTimer: number; // visual feedback
  grazeCount: number; // total grazes this game
  aircraftId: AircraftId;
  skillCooldown: number;
  skillActiveTimer: number;
  skillShieldActive: boolean;
  skillShieldTimer: number;
  skillAbsorbedHits: number;
  damageBoost: number;
  dashVx: number;
  dashVy: number;
  weaponId: WeaponId;
  laserRamp: number;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

/** A player's aircraft/weapon choice, shared over the coop wire protocol. */
export interface CoopLoadout {
  aircraftId: AircraftId;
  weaponId: WeaponId;
}

/** Menu-facing lobby phase for the coop host/join flow. */
export type CoopLobbyStatus =
  | 'idle'
  | 'connecting'
  | 'waiting_for_guest'
  | 'waiting_for_host'
  | 'ready'
  | 'error';

export interface HighScore {
  score: number;
  date: string;
  wave: number;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  timer: number;
}

export interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  alpha: number;
}

export interface Hazard {
  type: 'asteroid' | 'turret' | 'teleporter';
  x: number;
  y: number;
  width: number;
  height: number;
  vx?: number;
  vy?: number;
  rot?: number;
  rotSpeed?: number;
  shootTimer?: number;
  shootInterval?: number;
  side?: number;
  padId?: number;
  pulse?: number;
  cooldown?: number;
}

export interface GameData {
  player: Player;
  /** Co-op second ship; null in solo modes. */
  player2: Player | null;
  /** Co-op session role; null in solo modes. */
  coopRole: 'host' | 'guest' | null;
  /** Co-op PartyKit room code; empty string when not in a session. */
  coopRoomCode: string;
  /** Latest input snapshot for the guest ship, applied to `player2` on the host sim. */
  coopGuestInput: InputState;
  /** Menu-only lobby phase driving the host/join UI copy. */
  coopLobbyStatus: CoopLobbyStatus;
  coopHostPresent: boolean;
  coopGuestPresent: boolean;
  /** True once the room has both a host and a guest; only the host may start. */
  coopLobbyCanStart: boolean;
  coopHostLoadout: CoopLoadout | null;
  coopGuestLoadout: CoopLoadout | null;
  /** Last `error` message from the room (e.g. `room_full`, `role_taken`, `game_started`). */
  coopError: string | null;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  powerUps: PowerUp[];
  score: number;
  wave: number;
  waveTimer: number;
  waveDelay: number;
  enemiesSpawned: number;
  enemiesPerWave: number;
  state: GameState;
  screenShake: ScreenShake;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  flashAlpha: number;
  flashColor: string;
  waveAnnounceTimer: number;
  dangerAlpha: number; // edge-of-screen red pulse when hp low
  slowMotion: number; // 0..1 time scale for bullet-time effect
  slowMotionTimer: number;
  frameCount: number;
  stars: { x: number; y: number; speed: number; brightness: number }[];
  nebulae: Nebula[];
  chapterId: ChapterId;
  hazards: Hazard[];
  hazardSpawnTimer: number;
  selectedAircraft: AircraftId;
  selectedWeapon: WeaponId;
  specialSpawns: { sniper: boolean; healer: boolean };
  gameMode: GameMode;
  difficulty: Difficulty;
  dailySeed: number;
  dailyModifier: DailyModifier | null;
  modeVictory: boolean;
  waveDamageTaken: boolean;
  dailyBonusAwarded: boolean;
  runCoinsEarned: number;
  achievementToast: { id: AchievementId; timer: number } | null;
  rng: Rng;
  shotsFired: number;
  shotsHit: number;
  damageDealt: number;
  enemiesKilled: number;
  autoFire: boolean; // when true the player fires continuously without holding shoot
  /** Practice-only: when true, hurtPlayer is a no-op. */
  practiceInvincible: boolean;
  /** Menu-only Practice start wave (1–20); applied in resetGame. */
  practiceStartWave: number;
}
