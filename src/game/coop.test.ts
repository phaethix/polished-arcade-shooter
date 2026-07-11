import { describe, it, expect } from 'vitest';
import { createGameData } from './engine';
import {
  isCoopMode,
  activePlayers,
  shouldTeamWipe,
  applyLobbyMessage,
  applyCoopError,
  resetCoopLobby,
} from './coop';
import { createPlayer } from './player-factory';

describe('coop', () => {
  it('isCoopMode detects coop_endless', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    expect(isCoopMode(g)).toBe(true);
  });

  it('activePlayers returns one ship in solo', () => {
    const g = createGameData();
    expect(activePlayers(g)).toHaveLength(1);
  });

  it('shouldTeamWipe when either hp is 0 in coop', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.player2 = createPlayer('phantom');
    g.player.hp = 1;
    g.player2.hp = 0;
    expect(shouldTeamWipe(g)).toBe(true);
  });

  describe('applyLobbyMessage', () => {
    it('marks the host waiting for a guest when alone in the room', () => {
      const g = createGameData();
      g.coopRole = 'host';
      applyLobbyMessage(g, { hostPresent: true, guestPresent: false, canStart: false });
      expect(g.coopLobbyStatus).toBe('waiting_for_guest');
      expect(g.coopLobbyCanStart).toBe(false);
    });

    it('marks the guest waiting for a host when alone in the room', () => {
      const g = createGameData();
      g.coopRole = 'guest';
      applyLobbyMessage(g, { hostPresent: false, guestPresent: true, canStart: false });
      expect(g.coopLobbyStatus).toBe('waiting_for_host');
    });

    it('flips to ready once both roles are present and clears prior errors', () => {
      const g = createGameData();
      g.coopRole = 'host';
      g.coopError = 'room_full';
      applyLobbyMessage(g, {
        hostPresent: true,
        guestPresent: true,
        canStart: true,
        hostLoadout: { aircraftId: 'falcon', weaponId: 'standard' },
        guestLoadout: { aircraftId: 'phantom', weaponId: 'shotgun' },
      });
      expect(g.coopLobbyStatus).toBe('ready');
      expect(g.coopLobbyCanStart).toBe(true);
      expect(g.coopError).toBeNull();
      expect(g.coopGuestLoadout).toEqual({ aircraftId: 'phantom', weaponId: 'shotgun' });
    });
  });

  it('applyCoopError records the message and flips status to error', () => {
    const g = createGameData();
    applyCoopError(g, 'room_full');
    expect(g.coopError).toBe('room_full');
    expect(g.coopLobbyStatus).toBe('error');
  });

  it('resetCoopLobby clears role, room, and lobby fields', () => {
    const g = createGameData();
    g.coopRole = 'host';
    g.coopRoomCode = 'AB12CD';
    g.coopLobbyCanStart = true;
    g.coopError = 'room_full';
    resetCoopLobby(g);
    expect(g.coopRole).toBeNull();
    expect(g.coopRoomCode).toBe('');
    expect(g.coopLobbyCanStart).toBe(false);
    expect(g.coopError).toBeNull();
    expect(g.coopLobbyStatus).toBe('idle');
  });
});
