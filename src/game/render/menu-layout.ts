import { CANVAS_W, CANVAS_H } from '../core/constants';

/** Shared menu Y positions — keep in sync with drawMenu and touch hit testing. */
export const MENU_LAYOUT = {
  titleY: 130,
  subtitleY: 156,
  mode: {
    labelY: 182,
    valueY: 206,
    taglineY: 222,
    dailyY: 236,
    hitYMin: 170,
    hitYMax: 248,
    splitY: 206,
  },
  aircraft: {
    labelY: 262,
    valueY: 286,
    detailY: 316,
    hitYMin: 248,
    hitYMax: 328,
  },
  weapon: {
    labelY: 340,
    valueY: 362,
    detailY: 376,
    hitYMin: 328,
    hitYMax: 388,
  },
  difficulty: {
    labelY: 394,
    valueY: 414,
    taglineY: 428,
    hitYMin: 388,
    hitYMax: 440,
  },
  start: {
    textY: 452,
    hitYMin: 440,
    hitYMax: 472,
  },
  controls: {
    topY: 474,
    step: 15,
  },
} as const;

/** Outer thirds reserved for start-button centering (not loadout row arrows). */
export const MENU_ROW_LEFT_X = CANVAS_W / 3;
export const MENU_ROW_RIGHT_X = (CANVAS_W * 2) / 3;

export const SKILL_ZONE_HEIGHT = 72;
export const SKILL_ZONE_HALF_WIDTH = 36;

export type MenuTouchAction =
  | { kind: 'cycle_mode'; direction: -1 | 1 }
  | { kind: 'cycle_aircraft'; direction: -1 | 1 }
  | { kind: 'cycle_weapon'; direction: -1 | 1 }
  | { kind: 'cycle_difficulty'; direction: -1 | 1 }
  | { kind: 'start' };

/** Half-row split so centered ◀ / ▶ glyphs (near mid-canvas) are clickable. */
function rowCycleDirection(x: number): -1 | 1 {
  return x < CANVAS_W / 2 ? -1 : 1;
}

function isMenuRowCenter(x: number): boolean {
  return x >= MENU_ROW_LEFT_X && x <= MENU_ROW_RIGHT_X;
}

/** Map a game-space pointer position on the title screen to a menu action. */
export function resolveMenuTouch(x: number, y: number): MenuTouchAction | null {
  const { mode, aircraft, weapon, difficulty, start } = MENU_LAYOUT;

  if (y >= mode.hitYMin && y < mode.hitYMax) {
    return { kind: 'cycle_mode', direction: y < mode.splitY ? -1 : 1 };
  }
  if (y >= aircraft.hitYMin && y < aircraft.hitYMax) {
    return { kind: 'cycle_aircraft', direction: rowCycleDirection(x) };
  }
  if (y >= weapon.hitYMin && y < weapon.hitYMax) {
    return { kind: 'cycle_weapon', direction: rowCycleDirection(x) };
  }
  if (y >= difficulty.hitYMin && y < difficulty.hitYMax) {
    return { kind: 'cycle_difficulty', direction: rowCycleDirection(x) };
  }
  if (y >= start.hitYMin && y < start.hitYMax && isMenuRowCenter(x)) {
    return { kind: 'start' };
  }
  return null;
}

export function isInSkillZone(x: number, y: number): boolean {
  return y > CANVAS_H - SKILL_ZONE_HEIGHT && Math.abs(x - CANVAS_W / 2) < SKILL_ZONE_HALF_WIDTH;
}
