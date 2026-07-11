import { describe, it, expect, vi } from 'vitest';
import { createGameData } from '../game/engine';
import { createPlayer } from '../game/player-factory';
import { CoopSession } from '../net/coop-session';
import { buildSnapshot } from '../net/snapshot';
import { createInputState } from './input';
import {
  handleCoopClose,
  handleCoopMessage,
  notifyCoopTeamWipe,
  sendCoopGuestInput,
  sendCoopHostSnapshot,
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
    });
    expect(input.bomb).toBe(false);
    expect(input.skill).toBe(false);
    expect(input.pause).toBe(false);
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
      },
      session,
    );
    expect(g.coopGuestInput.left).toBe(true);
    expect(g.coopGuestInput.shoot).toBe(true);
    expect(g.coopGuestInput.bomb).toBe(true);
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
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    handleCoopMessage(
      g,
      { type: 'lobby', hostPresent: false, guestPresent: true, canStart: false },
      session,
    );
    expect(g.state).toBe('gameover');
    // Only the host announces disconnect-driven gameovers; the guest just ends locally.
    expect(send).not.toHaveBeenCalled();
  });

  it('host: a lobby message reporting the guest missing mid-run ends the run and announces guest_left', () => {
    const g = coopHost();
    const session = new CoopSession();
    const send = vi.spyOn(session, 'send');
    handleCoopMessage(
      g,
      { type: 'lobby', hostPresent: true, guestPresent: false, canStart: false },
      session,
    );
    expect(g.state).toBe('gameover');
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
    handleCoopClose(g);
    expect(g.state).toBe('gameover');
  });

  it('sets a lobby error when the socket closes outside a run', () => {
    const g = createGameData();
    g.coopRole = 'host';
    g.coopLobbyStatus = 'connecting';
    handleCoopClose(g);
    expect(g.coopLobbyStatus).toBe('error');
    expect(g.coopError).toBe('disconnected');
  });
});
