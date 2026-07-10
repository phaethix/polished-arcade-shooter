import { describe, it, expect } from 'vitest';
import type { GameData, DailyModifier } from './types';
import {
  isBossWave,
  getEnemiesPerWave,
  getBossHp,
  pickDailyModifier,
  getDailyModifierLabel,
  getWaveLabel,
  powerUpsEnabled,
  getEnemySpeedMult,
  getEnemyHpMult,
  getSpawnIntervalMult,
  getPlayerHpBonus,
  getSpawnPoolOverride,
  nextGameMode,
  nextDifficulty,
  isStoryComplete,
  MODE_ORDER,
  DIFFICULTY_ORDER,
} from './modes';

/** Build a minimal GameData with only the fields the mode helpers read. */
function mkGame(partial: Partial<GameData>): GameData {
  return partial as GameData;
}

describe('isBossWave', () => {
  it('always returns true for boss_rush', () => {
    expect(isBossWave(mkGame({ gameMode: 'boss_rush', wave: 1 }))).toBe(true);
    expect(isBossWave(mkGame({ gameMode: 'boss_rush', wave: 7 }))).toBe(true);
  });

  it('returns true on every 5th wave in story', () => {
    expect(isBossWave(mkGame({ gameMode: 'story', wave: 5 }))).toBe(true);
    expect(isBossWave(mkGame({ gameMode: 'story', wave: 10 }))).toBe(true);
    expect(isBossWave(mkGame({ gameMode: 'story', wave: 20 }))).toBe(true);
  });

  it('returns false on non-5th waves in story', () => {
    expect(isBossWave(mkGame({ gameMode: 'story', wave: 1 }))).toBe(false);
    expect(isBossWave(mkGame({ gameMode: 'story', wave: 4 }))).toBe(false);
  });

  it('returns true on every 5th wave >= 5 in endless', () => {
    expect(isBossWave(mkGame({ gameMode: 'endless', wave: 5 }))).toBe(true);
    expect(isBossWave(mkGame({ gameMode: 'endless', wave: 10 }))).toBe(true);
  });

  it('returns false before wave 5 in endless', () => {
    expect(isBossWave(mkGame({ gameMode: 'endless', wave: 4 }))).toBe(false);
  });

  it('returns false on wave 5 for daily without modifier', () => {
    // daily uses the same rule as endless
    expect(isBossWave(mkGame({ gameMode: 'daily', wave: 5 }))).toBe(true);
    expect(isBossWave(mkGame({ gameMode: 'daily', wave: 4 }))).toBe(false);
  });
});

describe('getEnemiesPerWave', () => {
  it('returns 1 for any boss wave', () => {
    expect(getEnemiesPerWave(mkGame({ gameMode: 'story', wave: 5 }))).toBe(1);
    expect(getEnemiesPerWave(mkGame({ gameMode: 'boss_rush', wave: 3 }))).toBe(1);
  });

  it('scales with wave in story mode (4 + wave) for non-boss waves', () => {
    expect(getEnemiesPerWave(mkGame({ gameMode: 'story', wave: 1 }))).toBe(5);
    expect(getEnemiesPerWave(mkGame({ gameMode: 'story', wave: 4 }))).toBe(8);
  });

  it('scales with wave in endless mode (5 + wave * 2) for non-boss waves', () => {
    expect(getEnemiesPerWave(mkGame({ gameMode: 'endless', wave: 1 }))).toBe(7);
    expect(getEnemiesPerWave(mkGame({ gameMode: 'endless', wave: 4 }))).toBe(13);
  });
});

describe('getBossHp', () => {
  it('scales faster in boss_rush (18 + wave * 10)', () => {
    expect(getBossHp(mkGame({ gameMode: 'boss_rush', wave: 1 }))).toBe(28);
    expect(getBossHp(mkGame({ gameMode: 'boss_rush', wave: 5 }))).toBe(68);
  });

  it('scales normally in other modes (20 + wave * 5)', () => {
    expect(getBossHp(mkGame({ gameMode: 'story', wave: 5 }))).toBe(45);
    expect(getBossHp(mkGame({ gameMode: 'endless', wave: 10 }))).toBe(70);
  });
});

describe('pickDailyModifier', () => {
  it('returns a deterministic modifier for a given seed', () => {
    const mod = pickDailyModifier(42);
    expect(mod).toBe(['double_speed', 'no_powerups', 'single_hp', 'kamikaze_only'][42 % 4]);
  });

  it('cycles through all four modifiers', () => {
    const mods = new Set<DailyModifier>();
    for (let i = 0; i < 4; i++) mods.add(pickDailyModifier(i));
    expect(mods.size).toBe(4);
  });
});

describe('getDailyModifierLabel', () => {
  it('returns a non-empty label for every modifier', () => {
    const all: DailyModifier[] = ['double_speed', 'no_powerups', 'single_hp', 'kamikaze_only'];
    for (const m of all) {
      expect(getDailyModifierLabel(m).length).toBeGreaterThan(0);
    }
  });
});

describe('getWaveLabel', () => {
  it('uses STAGE prefix in story', () => {
    expect(getWaveLabel(mkGame({ gameMode: 'story', wave: 3 }))).toBe('STAGE 3');
  });

  it('uses BOSS prefix in boss_rush', () => {
    expect(getWaveLabel(mkGame({ gameMode: 'boss_rush', wave: 2 }))).toBe('BOSS 2');
  });

  it('uses WAVE prefix in endless and daily', () => {
    expect(getWaveLabel(mkGame({ gameMode: 'endless', wave: 7 }))).toBe('WAVE 7');
    expect(getWaveLabel(mkGame({ gameMode: 'daily', wave: 1 }))).toBe('WAVE 1');
  });
});

describe('powerUpsEnabled', () => {
  it('returns true for normal modes', () => {
    expect(powerUpsEnabled(mkGame({ gameMode: 'endless' }))).toBe(true);
    expect(powerUpsEnabled(mkGame({ gameMode: 'story' }))).toBe(true);
  });

  it('returns false for daily with no_powerups modifier', () => {
    expect(powerUpsEnabled(mkGame({ gameMode: 'daily', dailyModifier: 'no_powerups' }))).toBe(
      false,
    );
  });

  it('returns true for daily with other modifiers', () => {
    expect(powerUpsEnabled(mkGame({ gameMode: 'daily', dailyModifier: 'double_speed' }))).toBe(
      true,
    );
  });
});

describe('getEnemySpeedMult', () => {
  it('returns 1 for non-daily modes', () => {
    expect(getEnemySpeedMult(mkGame({ gameMode: 'endless' }))).toBe(1);
    expect(getEnemySpeedMult(mkGame({ gameMode: 'story' }))).toBe(1);
  });

  it('returns 2 for daily double_speed', () => {
    expect(getEnemySpeedMult(mkGame({ gameMode: 'daily', dailyModifier: 'double_speed' }))).toBe(2);
  });
});

describe('getSpawnPoolOverride', () => {
  it('returns null for non-daily modes', () => {
    expect(getSpawnPoolOverride(mkGame({ gameMode: 'endless' }))).toBeNull();
  });

  it('returns kamikaze-heavy pool for daily kamikaze_only', () => {
    const pool = getSpawnPoolOverride(
      mkGame({ gameMode: 'daily', dailyModifier: 'kamikaze_only' }),
    );
    expect(pool).not.toBeNull();
    expect(pool!.every((t) => t === 'kamikaze' || t === 'fast')).toBe(true);
    expect(pool!.filter((t) => t === 'kamikaze').length).toBeGreaterThan(
      pool!.filter((t) => t === 'fast').length,
    );
  });
});

describe('nextGameMode', () => {
  it('cycles forward through all modes', () => {
    let mode = MODE_ORDER[0];
    const visited: string[] = [mode];
    for (let i = 0; i < MODE_ORDER.length; i++) {
      mode = nextGameMode(mode, 1);
      visited.push(mode);
    }
    // After cycling through all, returns to start
    expect(mode).toBe(MODE_ORDER[0]);
  });

  it('cycles backward', () => {
    const first = MODE_ORDER[0];
    const last = MODE_ORDER[MODE_ORDER.length - 1];
    expect(nextGameMode(first, -1)).toBe(last);
  });
});

describe('isStoryComplete', () => {
  it('returns true at wave 20 in story', () => {
    expect(isStoryComplete(mkGame({ gameMode: 'story', wave: 20 }))).toBe(true);
  });

  it('returns false before wave 20 in story', () => {
    expect(isStoryComplete(mkGame({ gameMode: 'story', wave: 19 }))).toBe(false);
  });

  it('returns false in other modes regardless of wave', () => {
    expect(isStoryComplete(mkGame({ gameMode: 'endless', wave: 100 }))).toBe(false);
  });
});

describe('difficulty multipliers', () => {
  it('easy reduces enemy speed to 0.75', () => {
    expect(getEnemySpeedMult(mkGame({ difficulty: 'easy' }))).toBe(0.75);
  });

  it('hard increases enemy speed to 1.3', () => {
    expect(getEnemySpeedMult(mkGame({ difficulty: 'hard' }))).toBe(1.3);
  });

  it('normal has speed mult 1', () => {
    expect(getEnemySpeedMult(mkGame({ difficulty: 'normal' }))).toBe(1);
  });

  it('daily double_speed stacks with difficulty', () => {
    expect(
      getEnemySpeedMult(
        mkGame({ difficulty: 'hard', gameMode: 'daily', dailyModifier: 'double_speed' }),
      ),
    ).toBe(2.6);
  });

  it('easy reduces enemy HP to 0.75', () => {
    expect(getEnemyHpMult(mkGame({ difficulty: 'easy' }))).toBe(0.75);
  });

  it('hard increases enemy HP to 1.25', () => {
    expect(getEnemyHpMult(mkGame({ difficulty: 'hard' }))).toBe(1.25);
  });

  it('easy gives +1 player HP bonus', () => {
    expect(getPlayerHpBonus(mkGame({ difficulty: 'easy' }))).toBe(1);
  });

  it('normal and hard give no HP bonus', () => {
    expect(getPlayerHpBonus(mkGame({ difficulty: 'normal' }))).toBe(0);
    expect(getPlayerHpBonus(mkGame({ difficulty: 'hard' }))).toBe(0);
  });

  it('easy increases spawn interval to 1.3 (slower spawns)', () => {
    expect(getSpawnIntervalMult(mkGame({ difficulty: 'easy' }))).toBe(1.3);
  });

  it('hard decreases spawn interval to 0.8 (faster spawns)', () => {
    expect(getSpawnIntervalMult(mkGame({ difficulty: 'hard' }))).toBe(0.8);
  });

  it('boss HP scales with difficulty', () => {
    const easyBoss = getBossHp(mkGame({ gameMode: 'endless', wave: 5, difficulty: 'easy' }));
    const normalBoss = getBossHp(mkGame({ gameMode: 'endless', wave: 5, difficulty: 'normal' }));
    const hardBoss = getBossHp(mkGame({ gameMode: 'endless', wave: 5, difficulty: 'hard' }));
    expect(easyBoss).toBeLessThan(normalBoss);
    expect(hardBoss).toBeGreaterThan(normalBoss);
  });
});

describe('nextDifficulty', () => {
  it('cycles forward through all difficulties', () => {
    let diff = DIFFICULTY_ORDER[0];
    const visited: string[] = [diff];
    for (let i = 0; i < DIFFICULTY_ORDER.length; i++) {
      diff = nextDifficulty(diff, 1);
      visited.push(diff);
    }
    expect(diff).toBe(DIFFICULTY_ORDER[0]);
    expect(new Set(visited).size).toBe(DIFFICULTY_ORDER.length);
  });

  it('cycles backward', () => {
    expect(nextDifficulty('easy', -1)).toBe('hard');
    expect(nextDifficulty('normal', -1)).toBe('easy');
  });
});
