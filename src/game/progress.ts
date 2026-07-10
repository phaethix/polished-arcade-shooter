import type { AchievementId, AircraftId, EnemyType, WeaponId } from './types';
import { AIRCRAFT } from './aircraft';
import { WEAPONS } from './weapons';

const COINS_KEY = 'sky_blaster_coins_v1';
const UNLOCKS_KEY = 'sky_blaster_unlocks_v1';
const ACHIEVEMENTS_KEY = 'sky_blaster_achievements_v1';
const STATS_KEY = 'sky_blaster_stats_v1';

export interface UnlockState {
  aircraft: AircraftId[];
  weapons: WeaponId[];
}

export interface LifetimeStats {
  enemyKills: number;
  bossKills: number;
}

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDefinition> = {
  first_blood: { id: 'first_blood', name: 'First Blood', description: 'Destroy your first enemy' },
  combo_master: { id: 'combo_master', name: 'Combo Master', description: 'Reach a 20× combo' },
  graze_king: { id: 'graze_king', name: 'Graze King', description: 'Graze 50 bullets in one run' },
  boss_slayer: { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat 10 bosses (lifetime)' },
  survivor: { id: 'survivor', name: 'Survivor', description: 'Reach wave 10' },
  untouchable: { id: 'untouchable', name: 'Untouchable', description: 'Clear a stage without taking damage' },
};

const DEFAULT_UNLOCKS: UnlockState = {
  aircraft: ['falcon'],
  weapons: ['standard'],
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {/* */}
  return fallback;
}

function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {/* */}
}

// ─── In-memory cache (avoids repeated JSON.parse on every read) ───
let coinsCache: number | null = null;
let unlocksCache: UnlockState | null = null;
let achievementsCache: Set<AchievementId> | null = null;
let statsCache: LifetimeStats | null = null;

/** Clear all cached values. Intended for testing only. */
export function _resetProgressCache(): void {
  coinsCache = null;
  unlocksCache = null;
  achievementsCache = null;
  statsCache = null;
}

export function loadCoins(): number {
  if (coinsCache !== null) return coinsCache;
  coinsCache = readJson<number>(COINS_KEY, 0);
  return coinsCache;
}

export function addCoins(amount: number): number {
  if (amount <= 0) return loadCoins();
  const total = loadCoins() + amount;
  coinsCache = total;
  writeJson(COINS_KEY, total);
  return total;
}

export function spendCoins(amount: number): boolean {
  const coins = loadCoins();
  if (amount <= 0 || coins < amount) return false;
  coinsCache = coins - amount;
  writeJson(COINS_KEY, coins - amount);
  return true;
}

export function loadUnlocks(): UnlockState {
  if (unlocksCache !== null) return unlocksCache;
  const data = readJson<UnlockState>(UNLOCKS_KEY, DEFAULT_UNLOCKS);
  unlocksCache = {
    aircraft: [...new Set([...DEFAULT_UNLOCKS.aircraft, ...data.aircraft])],
    weapons: [...new Set([...DEFAULT_UNLOCKS.weapons, ...data.weapons])],
  };
  return unlocksCache;
}

function saveUnlocks(unlocks: UnlockState): void {
  unlocksCache = unlocks;
  writeJson(UNLOCKS_KEY, unlocks);
}

export function loadLifetimeStats(): LifetimeStats {
  if (statsCache !== null) return statsCache;
  statsCache = readJson<LifetimeStats>(STATS_KEY, { enemyKills: 0, bossKills: 0 });
  return statsCache;
}

function saveLifetimeStats(stats: LifetimeStats): void {
  statsCache = stats;
  writeJson(STATS_KEY, stats);
}

export function recordEnemyKill(isBoss: boolean): LifetimeStats {
  const stats = loadLifetimeStats();
  stats.enemyKills++;
  if (isBoss) stats.bossKills++;
  saveLifetimeStats(stats);
  return stats;
}

export function loadAchievementSet(): Set<AchievementId> {
  if (achievementsCache !== null) return achievementsCache;
  const list = readJson<AchievementId[]>(ACHIEVEMENTS_KEY, []);
  achievementsCache = new Set(list);
  return achievementsCache;
}

function saveAchievements(set: Set<AchievementId>): void {
  achievementsCache = set;
  writeJson(ACHIEVEMENTS_KEY, [...set]);
}

/** Returns the achievement id when newly unlocked, otherwise null. */
export function unlockAchievement(id: AchievementId): AchievementId | null {
  const set = loadAchievementSet();
  if (set.has(id)) return null;
  set.add(id);
  saveAchievements(set);
  return id;
}

export function isAchievementUnlocked(id: AchievementId): boolean {
  return loadAchievementSet().has(id);
}

export function isAircraftUnlocked(id: AircraftId): boolean {
  return loadUnlocks().aircraft.includes(id);
}

export function isWeaponUnlocked(id: WeaponId): boolean {
  return loadUnlocks().weapons.includes(id);
}

export function canAffordUnlock(coinCost: number): boolean {
  return loadCoins() >= coinCost;
}

export function tryUnlockAircraft(id: AircraftId): boolean {
  const craft = AIRCRAFT[id];
  if (craft.unlockedByDefault || isAircraftUnlocked(id)) return true;
  if (!spendCoins(craft.coinCost)) return false;
  const unlocks = loadUnlocks();
  if (!unlocks.aircraft.includes(id)) {
    unlocks.aircraft.push(id);
    saveUnlocks(unlocks);
  }
  return true;
}

export function tryUnlockWeapon(id: WeaponId): boolean {
  const weapon = WEAPONS[id];
  if (weapon.unlockedByDefault || isWeaponUnlocked(id)) return true;
  if (!spendCoins(weapon.coinCost)) return false;
  const unlocks = loadUnlocks();
  if (!unlocks.weapons.includes(id)) {
    unlocks.weapons.push(id);
    saveUnlocks(unlocks);
  }
  return true;
}

export function coinRewardForEnemy(type: EnemyType): number {
  switch (type) {
    case 'boss': return 50;
    case 'tank': return 10;
    case 'splitter': return 8;
    case 'sniper': return 9;
    case 'shielded': return 9;
    case 'healer': return 10;
    case 'kamikaze': return 7;
    case 'fast': return 4;
    case 'mini': return 2;
    default: return 3;
  }
}

export const STORY_STAGE_CLEAR_COINS = 25;
export const DAILY_COMPLETE_COINS = 100;
export const DAILY_COMPLETE_WAVE = 10;
