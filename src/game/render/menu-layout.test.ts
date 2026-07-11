import { describe, it, expect } from 'vitest';
import { CANVAS_W } from '../core/constants';
import { getMenuLayout, isInSkillZone, resolveMenuTouch } from './menu-layout';

describe('resolveMenuTouch', () => {
  it('cycles mode up in the top half of the mode row', () => {
    expect(resolveMenuTouch(CANVAS_W / 2, 180)).toEqual({
      kind: 'cycle_mode',
      direction: -1,
    });
  });

  it('cycles mode down in the bottom half of the mode row', () => {
    expect(resolveMenuTouch(CANVAS_W / 2, 220)).toEqual({
      kind: 'cycle_mode',
      direction: 1,
    });
  });

  it('cycles aircraft from left and right zones', () => {
    expect(resolveMenuTouch(50, 280)).toEqual({ kind: 'cycle_aircraft', direction: -1 });
    expect(resolveMenuTouch(320, 280)).toEqual({ kind: 'cycle_aircraft', direction: 1 });
  });

  // Centered ◀ NAME ▶ glyphs sit near mid-canvas; half-row split must hit them.
  it('cycles aircraft when tapping near the centered arrow glyphs', () => {
    expect(resolveMenuTouch(CANVAS_W / 2 - 20, 280)).toEqual({
      kind: 'cycle_aircraft',
      direction: -1,
    });
    expect(resolveMenuTouch(CANVAS_W / 2 + 20, 280)).toEqual({
      kind: 'cycle_aircraft',
      direction: 1,
    });
  });

  it('cycles difficulty from left and right zones', () => {
    expect(resolveMenuTouch(50, 410)).toEqual({ kind: 'cycle_difficulty', direction: -1 });
    expect(resolveMenuTouch(320, 410)).toEqual({ kind: 'cycle_difficulty', direction: 1 });
  });

  it('cycles difficulty when tapping near the centered arrow glyphs', () => {
    expect(resolveMenuTouch(CANVAS_W / 2 - 20, 410)).toEqual({
      kind: 'cycle_difficulty',
      direction: -1,
    });
    expect(resolveMenuTouch(CANVAS_W / 2 + 20, 410)).toEqual({
      kind: 'cycle_difficulty',
      direction: 1,
    });
  });

  it('cycles weapon when tapping near the centered arrow glyphs', () => {
    expect(resolveMenuTouch(CANVAS_W / 2 - 20, 350)).toEqual({
      kind: 'cycle_weapon',
      direction: -1,
    });
    expect(resolveMenuTouch(CANVAS_W / 2 + 20, 350)).toEqual({
      kind: 'cycle_weapon',
      direction: 1,
    });
  });

  it('starts from the center start row', () => {
    expect(resolveMenuTouch(CANVAS_W / 2, 455)).toEqual({ kind: 'start' });
  });

  it('ignores taps outside interactive rows', () => {
    expect(resolveMenuTouch(CANVAS_W / 2, 120)).toBeNull();
  });
});

describe('practice start-wave menu layout', () => {
  it('keeps start hit zone unchanged when practice row hidden', () => {
    const layout = getMenuLayout(false);
    expect(layout.start.hitYMin).toBe(440);
    expect(resolveMenuTouch(180, 450)).toEqual({ kind: 'start' });
  });

  it('shifts start down and hits cycle_practice_start_wave when shown', () => {
    const layout = getMenuLayout(true);
    expect(layout.start.hitYMin).toBeGreaterThan(440);
    const y = (layout.startWave.hitYMin + layout.startWave.hitYMax) / 2;
    expect(resolveMenuTouch(100, y, true)).toEqual({
      kind: 'cycle_practice_start_wave',
      direction: -1,
    });
    expect(resolveMenuTouch(300, y, true)).toEqual({
      kind: 'cycle_practice_start_wave',
      direction: 1,
    });
  });
});

describe('coop lobby menu layout', () => {
  it('keeps start hit zone unchanged when coop lobby row hidden', () => {
    const layout = getMenuLayout(false, false);
    expect(layout.start.hitYMin).toBe(440);
  });

  it('shifts start down and resolves host/join taps when shown', () => {
    const layout = getMenuLayout(false, true);
    expect(layout.start.hitYMin).toBeGreaterThan(440);
    const y = (layout.coopLobby.hitYMin + layout.coopLobby.hitYMax) / 2;
    expect(resolveMenuTouch(100, y, false, true)).toEqual({ kind: 'coop_host' });
    expect(resolveMenuTouch(300, y, false, true)).toEqual({ kind: 'coop_join' });
  });

  it('ignores the coop lobby row when not flagged as shown', () => {
    const layout = getMenuLayout(false, true);
    const y = (layout.coopLobby.hitYMin + layout.coopLobby.hitYMax) / 2;
    expect(resolveMenuTouch(100, y, false, false)).toBeNull();
  });
});

describe('isInSkillZone', () => {
  it('detects the bottom-center skill tap area', () => {
    expect(isInSkillZone(CANVAS_W / 2, 680)).toBe(true);
    expect(isInSkillZone(0, 680)).toBe(false);
  });
});
