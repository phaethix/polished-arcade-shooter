import { describe, it, expect, vi } from 'vitest';
import { createGameData } from '../game/engine';
import { createPlayer } from '../game/player-factory';
import { CoopSession } from '../net/coop-session';
import { buildSnapshot } from '../net/snapshot';
import { createInputState } from './input';
import {
  appendCoopCodeDraft,
  backspaceCoopCodeDraft,
  beginJoinCoopCodeEntry,
  cancelJoinCoopCodeEntry,
  handleCoopClose,
  handleCoopMessage,
  notifyCoopTeamWipe,
  restartCoopFromGameOver,
  sendCoopGuestInput,
  sendCoopHostSnapshot,
  submitJoinCoopCode,
  syncCoopLobbyLoadout,
} from './coop-actions';

function coopGuest() {
  const g = createGameData();
  g.gameMode = 'coop_endless';
  g.coopRole = 'guest';
  g.state = 'playing';
  g.player2 = createPlayer('phantom');
  return g;
}

function coopHost() {
  const g = createGameData();
  g.gameMode = 'coop_endless';
  g.coopRole = 'host';
  g.state = 'playing';
  g.player2 = createPlayer('phantom');
  return g;
}

describe('sendCoopGuestInput', () => {
  it('sends the current input as a wire message and consumes rising-edge flags', () => {
    const g = coopGuest();
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    const input = createInputState();
    input.left = true;
    input.bomb = true;
    input.skill = true;
    input.pause = true;

    sendCoopGuestInput(g, session, input);

    expect(send).toHaveBeenCalledWith({
      type: 'input',
      left: true,
      right: false,
      up: false,
      down: false,
      shoot: false,
      bomb: true,
      skill: true,
      pause: true,
      touchDx: 0,
      touchDy: 0,
    });
    expect(input.bomb).toBe(false);
    expect(input.skill).toBe(false);
    expect(input.pause).toBe(false);
  });

  it('relays pointer drag as touchDx/touchDy for mouse parity with the host', () => {
    const g = coopGuest();
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    const input = createInputState();
    input.touchActive = true;
    input.prevTouchX = 100;
    input.prevTouchY = 200;
    input.touchX = 110;
    input.touchY = 190;

    sendCoopGuestInput(g, session, input);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'input',
        shoot: true,
        touchDx: 15,
        touchDy: -15,
      }),
    );
    expect(input.prevTouchX).toBe(110);
    expect(input.prevTouchY).toBe(190);
  });

  it('is a no-op for the host', () => {
    const g = coopHost();
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    sendCoopGuestInput(g, session, createInputState());
    expect(send).not.toHaveBeenCalled();
  });
});

describe('sendCoopHostSnapshot', () => {
  it('sends a snapshot payload for the host', () => {
    const g = coopHost();
    g.score = 77;
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    sendCoopHostSnapshot(g, session);
    expect(send).toHaveBeenCalledTimes(1);
    const [msg] = send.mock.calls[0]!;
    expect(msg.type).toBe('snapshot');
  });

  it('is a no-op for the guest', () => {
    const g = coopGuest();
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    sendCoopHostSnapshot(g, session);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('notifyCoopTeamWipe', () => {
  it('sends a team_wipe gameover message for the host', () => {
    const g = coopHost();
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    notifyCoopTeamWipe(g, session);
    expect(send).toHaveBeenCalledWith({ type: 'gameover', reason: 'team_wipe' });
  });

  it('does nothing for the guest or solo', () => {
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    notifyCoopTeamWipe(coopGuest(), session);
    notifyCoopTeamWipe(createGameData(), session);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('restartCoopFromGameOver', () => {
  it('host rematches with a new start payload when the lobby can still start', () => {
    const g = coopHost();
    g.state = 'gameover';
    g.coopLobbyCanStart = true;
    g.coopGuestPresent = true;
    g.coopGuestLoadout = { aircraftId: 'phantom', weaponId: 'shotgun' };
    g.selectedAircraft = 'falcon';
    g.selectedWeapon = 'standard';
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    expect(restartCoopFromGameOver(g, session)).toBe(true);
    expect(g.state).toBe('playing');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        hostLoadout: { aircraftId: 'falcon', weaponId: 'standard' },
        guestLoadout: { aircraftId: 'phantom', weaponId: 'shotgun' },
      }),
    );
  });

  it('guest returns to the coop lobby menu and keeps the room session', () => {
    const g = coopGuest();
    g.state = 'gameover';
    g.coopRoomCode = 'AB12CD';
    g.coopLobbyCanStart = true;
    g.coopLobbyStatus = 'ready';
    expect(restartCoopFromGameOver(g, new CoopSession())).toBe(true);
    expect(g.state).toBe('menu');
    expect(g.player2).toBeNull();
    expect(g.coopRole).toBe('guest');
    expect(g.coopRoomCode).toBe('AB12CD');
    expect(g.coopLobbyStatus).toBe('ready');
  });

  it('host rematch fails after guest disconnect clears lobby presence', () => {
    const g = coopHost();
    g.coopLobbyCanStart = true;
    g.coopGuestPresent = true;
    g.coopGuestLoadout = { aircraftId: 'phantom', weaponId: 'shotgun' };
    const session = new CoopSession();
    handleCoopMessage(
      g,
      { type: 'lobby', hostPresent: true, guestPresent: false, canStart: false },
      session,
    );
    expect(g.state).toBe('gameover');
    expect(g.coopLobbyCanStart).toBe(false);
    expect(g.coopGuestPresent).toBe(false);
    expect(restartCoopFromGameOver(g, session)).toBe(false);
    expect(g.state).toBe('gameover');
  });

  it('is a no-op outside coop gameover', () => {
    const g = createGameData();
    g.state = 'gameover';
    expect(restartCoopFromGameOver(g, new CoopSession())).toBe(false);
  });
});

describe('handleCoopMessage', () => {
  it('host: applies an input message onto coopGuestInput', () => {
    const g = coopHost();
    const session = new CoopSession();
    handleCoopMessage(
      g,
      {
        type: 'input',
        left: true,
        right: false,
        up: false,
        down: false,
        shoot: true,
        bomb: true,
        skill: false,
        pause: false,
        touchDx: 12,
        touchDy: -4,
      },
      session,
    );
    expect(g.coopGuestInput.left).toBe(true);
    expect(g.coopGuestInput.shoot).toBe(true);
    expect(g.coopGuestInput.bomb).toBe(true);
    expect(g.coopGuestInput.touchDx).toBe(12);
    expect(g.coopGuestInput.touchDy).toBe(-4);
  });

  it('host: applies a guest pause request via togglePause', () => {
    const g = coopHost();
    const session = new CoopSession();
    handleCoopMessage(
      g,
      {
        type: 'input',
        left: false,
        right: false,
        up: false,
        down: false,
        shoot: false,
        bomb: false,
        skill: false,
        pause: true,
        touchDx: 0,
        touchDy: 0,
      },
      session,
    );
    expect(g.state).toBe('paused');
  });

  it('guest: applies a snapshot onto local render-only state', () => {
    const host = coopHost();
    host.score = 123;
    host.wave = 4;
    const snap = buildSnapshot(host);
    const guest = coopGuest();
    const session = new CoopSession();
    handleCoopMessage(guest, { type: 'snapshot', payload: snap }, session);
    expect(guest.score).toBe(123);
    expect(guest.wave).toBe(4);
  });

  it('guest: ends the run on a gameover message', () => {
    const g = coopGuest();
    const session = new CoopSession();
    handleCoopMessage(g, { type: 'gameover', reason: 'team_wipe' }, session);
    expect(g.state).toBe('gameover');
  });

  it('guest: a lobby message reporting the host missing mid-run ends the run as host_left', () => {
    const g = coopGuest();
    g.coopLobbyCanStart = true;
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    handleCoopMessage(
      g,
      { type: 'lobby', hostPresent: false, guestPresent: true, canStart: false },
      session,
    );
    expect(g.state).toBe('gameover');
    expect(g.coopLobbyCanStart).toBe(false);
    expect(g.coopHostPresent).toBe(false);
    // Only the host announces disconnect-driven gameovers; the guest just ends locally.
    expect(send).not.toHaveBeenCalled();
  });

  it('host: a lobby message reporting the guest missing mid-run ends the run and announces guest_left', () => {
    const g = coopHost();
    g.coopLobbyCanStart = true;
    g.coopGuestPresent = true;
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    handleCoopMessage(
      g,
      { type: 'lobby', hostPresent: true, guestPresent: false, canStart: false },
      session,
    );
    expect(g.state).toBe('gameover');
    expect(g.coopLobbyCanStart).toBe(false);
    expect(g.coopGuestPresent).toBe(false);
    expect(send).toHaveBeenCalledWith({ type: 'gameover', reason: 'guest_left' });
  });

  it('applies lobby messages normally outside an active run', () => {
    const g = createGameData();
    g.coopRole = 'host';
    const session = new CoopSession();
    handleCoopMessage(
      g,
      { type: 'lobby', hostPresent: true, guestPresent: false, canStart: false },
      session,
    );
    expect(g.coopLobbyStatus).toBe('waiting_for_guest');
  });
});

describe('handleCoopClose', () => {
  it('ends an in-progress coop run when the local socket closes', () => {
    const g = coopHost();
    handleCoopClose(g, new CoopSession());
    expect(g.state).toBe('gameover');
  });

  it('sets a lobby error when the socket closes outside a run', () => {
    const g = createGameData();
    g.coopRole = 'host';
    g.coopLobbyStatus = 'connecting';
    const session = new CoopSession();
    vi.spyOn(session, 'isOpen').mockReturnValue(true);
    handleCoopClose(g, session);
    expect(g.coopLobbyStatus).toBe('error');
    expect(g.coopError).toBe('disconnected');
  });

  it('reports connection_failed when the socket never opened', () => {
    const g = createGameData();
    g.coopRole = 'host';
    g.coopLobbyStatus = 'connecting';
    const session = new CoopSession();
    vi.spyOn(session, 'isOpen').mockReturnValue(false);
    handleCoopClose(g, session);
    expect(g.coopLobbyStatus).toBe('error');
    expect(g.coopError).toBe('connection_failed');
  });

  it('reports disconnected when the socket dropped after opening', () => {
    const g = createGameData();
    g.coopRole = 'host';
    g.coopLobbyStatus = 'connecting';
    const session = new CoopSession();
    vi.spyOn(session, 'isOpen').mockReturnValue(true);
    handleCoopClose(g, session);
    expect(g.coopLobbyStatus).toBe('error');
    expect(g.coopError).toBe('disconnected');
  });
});

describe('on-canvas join room code entry', () => {
  it('beginJoinCoopCodeEntry disconnects any prior socket before opening entry', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    const session = new CoopSession();
    const disconnect = vi.spyOn(session, 'disconnect');
    beginJoinCoopCodeEntry(g, session);
    expect(disconnect).toHaveBeenCalled();
    expect(g.coopLobbyStatus).toBe('entering_code');
  });

  it('beginJoinCoopCodeEntry opens entering_code with an empty draft', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    beginJoinCoopCodeEntry(g);
    expect(g.coopLobbyStatus).toBe('entering_code');
    expect(g.coopCodeDraft).toBe('');
    expect(g.coopRole).toBe('guest');
  });

  it('appendCoopCodeDraft uppercases and caps at 6 characters', () => {
    const g = createGameData();
    beginJoinCoopCodeEntry(g);
    for (const ch of 'ab23cdz') appendCoopCodeDraft(g, ch);
    expect(g.coopCodeDraft).toBe('AB23CD');
  });

  it('appendCoopCodeDraft ignores ambiguous characters never used by generateRoomCode', () => {
    const g = createGameData();
    beginJoinCoopCodeEntry(g);
    for (const ch of 'AI01OX') appendCoopCodeDraft(g, ch);
    expect(g.coopCodeDraft).toBe('AX');
  });

  it('backspaceCoopCodeDraft removes the last character', () => {
    const g = createGameData();
    beginJoinCoopCodeEntry(g);
    appendCoopCodeDraft(g, 'A');
    appendCoopCodeDraft(g, 'B');
    backspaceCoopCodeDraft(g);
    expect(g.coopCodeDraft).toBe('A');
  });

  it('submitJoinCoopCode connects with a valid draft and rejects invalid ones', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    beginJoinCoopCodeEntry(g);
    for (const ch of 'AB23CD') appendCoopCodeDraft(g, ch);
    const session = new CoopSession();
    const connect = vi.spyOn(session, 'connect').mockImplementation(() => undefined);
    const sendHello = vi.spyOn(session, 'sendHello').mockImplementation(() => undefined);
    expect(submitJoinCoopCode(g, session)).toBe(true);
    expect(connect).toHaveBeenCalledWith('AB23CD', expect.any(Object));
    expect(sendHello).toHaveBeenCalledWith('guest', expect.any(Object));
    expect(g.coopLobbyStatus).toBe('connecting');
    expect(g.coopRoomCode).toBe('AB23CD');

    const bad = createGameData();
    beginJoinCoopCodeEntry(bad);
    appendCoopCodeDraft(bad, 'A');
    expect(submitJoinCoopCode(bad, new CoopSession())).toBe(false);
    expect(bad.coopLobbyStatus).toBe('error');
    expect(bad.coopError).toBe('invalid_code');
  });

  it('cancelJoinCoopCodeEntry returns the lobby to idle', () => {
    const g = createGameData();
    beginJoinCoopCodeEntry(g);
    appendCoopCodeDraft(g, 'A');
    cancelJoinCoopCodeEntry(g);
    expect(g.coopLobbyStatus).toBe('idle');
    expect(g.coopCodeDraft).toBe('');
    expect(g.coopRole).toBeNull();
  });
});

describe('syncCoopLobbyLoadout', () => {
  it('re-sends hello while connected in the lobby', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.state = 'menu';
    g.coopRole = 'guest';
    g.coopLobbyStatus = 'ready';
    g.selectedAircraft = 'phantom';
    g.selectedWeapon = 'shotgun';
    const session = new CoopSession();
    const sendHello = vi.spyOn(session, 'sendHello');
    syncCoopLobbyLoadout(g, session);
    expect(sendHello).toHaveBeenCalledWith('guest', {
      aircraftId: 'phantom',
      weaponId: 'shotgun',
    });
  });

  it('skips when idle or entering a code', () => {
    const session = new CoopSession();
    const sendHello = vi.spyOn(session, 'sendHello');
    const idle = createGameData();
    idle.gameMode = 'coop_endless';
    idle.state = 'menu';
    idle.coopRole = 'guest';
    idle.coopLobbyStatus = 'entering_code';
    syncCoopLobbyLoadout(idle, session);
    expect(sendHello).not.toHaveBeenCalled();
  });
});
