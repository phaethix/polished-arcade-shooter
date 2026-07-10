import { describe, it, expect, beforeEach, vi } from "vitest";
import type { EnemyType } from "./types";
import {
  coinRewardForEnemy,
  loadCoins,
  addCoins,
  spendCoins,
  loadUnlocks,
  unlockAchievement,
  loadAchievementSet,
  recordEnemyKill,
  loadLifetimeStats,
  ACHIEVEMENTS,
  _resetProgressCache,
} from "./progress";

/** Minimal in-memory localStorage mock for node test environment. */
function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

beforeEach(() => {
  const ls = createLocalStorage();
  vi.stubGlobal("localStorage", ls);
  _resetProgressCache();
});

describe("coinRewardForEnemy", () => {
  it("rewards 50 coins for boss kills", () => {
    expect(coinRewardForEnemy("boss")).toBe(50);
  });

  it("rewards more for tanky enemies than basics", () => {
    expect(coinRewardForEnemy("tank")).toBeGreaterThan(coinRewardForEnemy("basic"));
  });

  it("rewards the least for mini enemies", () => {
    expect(coinRewardForEnemy("mini")).toBe(2);
  });

  it("returns a positive value for every enemy type", () => {
    const all: EnemyType[] = [
      "basic", "fast", "tank", "boss", "mini",
      "splitter", "sniper", "shielded", "kamikaze", "healer",
    ];
    for (const t of all) {
      expect(coinRewardForEnemy(t)).toBeGreaterThan(0);
    }
  });
});

describe("coin economy", () => {
  it("starts with zero coins", () => {
    expect(loadCoins()).toBe(0);
  });

  it("adds coins and persists", () => {
    addCoins(100);
    expect(loadCoins()).toBe(100);
    addCoins(50);
    expect(loadCoins()).toBe(150);
  });

  it("does not add zero or negative coins", () => {
    addCoins(100);
    addCoins(0);
    addCoins(-50);
    expect(loadCoins()).toBe(100);
  });

  it("spends coins when affordable", () => {
    addCoins(500);
    expect(spendCoins(200)).toBe(true);
    expect(loadCoins()).toBe(300);
  });

  it("refuses to spend when not affordable", () => {
    addCoins(100);
    expect(spendCoins(200)).toBe(false);
    expect(loadCoins()).toBe(100);
  });
});

describe("unlocks", () => {
  it("starts with falcon and standard unlocked", () => {
    const u = loadUnlocks();
    expect(u.aircraft).toContain("falcon");
    expect(u.weapons).toContain("standard");
  });

  it("always includes default unlocks even if storage is corrupted", () => {
    localStorage.setItem("sky_blaster_unlocks_v1", '{"aircraft":[],"weapons":[]}');
    const u = loadUnlocks();
    expect(u.aircraft).toContain("falcon");
    expect(u.weapons).toContain("standard");
  });
});

describe("achievements", () => {
  it("starts with no achievements", () => {
    expect(loadAchievementSet().size).toBe(0);
  });

  it("unlocks an achievement and returns its id", () => {
    expect(unlockAchievement("first_blood")).toBe("first_blood");
    expect(loadAchievementSet().has("first_blood")).toBe(true);
  });

  it("returns null when unlocking an already-unlocked achievement", () => {
    unlockAchievement("first_blood");
    expect(unlockAchievement("first_blood")).toBeNull();
  });

  it("has definitions for all six achievements", () => {
    expect(Object.keys(ACHIEVEMENTS)).toHaveLength(6);
  });
});

describe("lifetime stats", () => {
  it("starts at zero", () => {
    const s = loadLifetimeStats();
    expect(s.enemyKills).toBe(0);
    expect(s.bossKills).toBe(0);
  });

  it("increments enemy kills", () => {
    recordEnemyKill(false);
    recordEnemyKill(false);
    expect(loadLifetimeStats().enemyKills).toBe(2);
    expect(loadLifetimeStats().bossKills).toBe(0);
  });

  it("increments boss kills separately", () => {
    recordEnemyKill(true);
    expect(loadLifetimeStats().enemyKills).toBe(1);
    expect(loadLifetimeStats().bossKills).toBe(1);
  });
});

describe("caching", () => {
  it("serves repeated reads from cache without touching localStorage", () => {
    addCoins(100);
    // Spy on getItem after the initial write
    const spy = vi.spyOn(localStorage, "getItem");
    loadCoins();
    loadCoins();
    loadCoins();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("reflects writes in subsequent cached reads", () => {
    addCoins(50);
    expect(loadCoins()).toBe(50);
    spendCoins(20);
    expect(loadCoins()).toBe(30);
  });

  it("forces re-read from storage after cache reset", () => {
    addCoins(100);
    _resetProgressCache();
    // After reset, loadCoins should read from localStorage
    const spy = vi.spyOn(localStorage, "getItem");
    expect(loadCoins()).toBe(100);
    expect(spy).toHaveBeenCalledWith("sky_blaster_coins_v1");
    spy.mockRestore();
  });

  it("caches unlocks after first read", () => {
    loadUnlocks();
    const spy = vi.spyOn(localStorage, "getItem");
    loadUnlocks();
    loadUnlocks();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
