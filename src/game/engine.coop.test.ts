import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameData, beginCoopRun, type CoopStartPayload } from './engine';
import { createPlayer } from './player-factory';
import { _resetProgressCache } from './progress';

/** Minimal in-memory localStorage mock so aircraft/weapon unlocks are controllable. */
function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

beforeEach(() => {
  const ls = createLocalStorage();
  vi.stubGlobal('localStorage', ls);
  localStorage.setItem(
    'sky_blaster_unlocks_v1',
    JSON.stringify({ aircraft: ['falcon', 'phantom'], weapons: ['standard', 'shotgun'] }),
  );
  _resetProgressCache();
});

const payload: CoopStartPayload = {
  difficulty: 'hard',
  seed: 42,
  hostLoadout: { aircraftId: 'falcon', weaponId: 'standard' },
  guestLoadout: { aircraftId: 'phantom', weaponId: 'shotgun' },
};

describe('beginCoopRun', () => {
  it('starts the host with their own loadout and a player2 for the guest', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'host';
    beginCoopRun(g, payload);
    expect(g.state).toBe('playing');
    expect(g.difficulty).toBe('hard');
    expect(g.selectedAircraft).toBe('falcon');
    expect(g.selectedWeapon).toBe('standard');
    expect(g.player2?.aircraftId).toBe('phantom');
    expect(g.player2?.weaponId).toBe('shotgun');
    expect(g.player.x).toBeLessThan(g.player2!.x);
  });

  it('starts the guest with their own loadout and a player2 for the host', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'guest';
    beginCoopRun(g, payload);
    expect(g.state).toBe('playing');
    expect(g.selectedAircraft).toBe('phantom');
    expect(g.selectedWeapon).toBe('shotgun');
    expect(g.player2?.aircraftId).toBe('falcon');
    expect(g.player2?.weaponId).toBe('standard');
    expect(g.player.x).toBeGreaterThan(g.player2!.x);
  });

  it('is a no-op when the local loadout is not unlocked', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'host';
    const lockedPayload: CoopStartPayload = {
      ...payload,
      hostLoadout: { aircraftId: 'fortress', weaponId: 'laser' },
    };
    beginCoopRun(g, lockedPayload);
    expect(g.state).toBe('menu');
    expect(g.player2).toBeNull();
  });

  it('applies Easy difficulty HP bonus to both ships', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'host';
    const baseGuest = createPlayer('phantom', 'shotgun');
    const baseHost = createPlayer('falcon', 'standard');
    beginCoopRun(g, { ...payload, difficulty: 'easy' });
    expect(g.player.maxHp).toBe(baseHost.maxHp + 1);
    expect(g.player2?.maxHp).toBe(baseGuest.maxHp + 1);
    expect(g.player2?.hp).toBe(baseGuest.hp + 1);
  });
});
