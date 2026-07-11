import {
  resetGame,
  canStartGame,
  cycleAircraftSelection,
  cycleWeaponSelection,
  cycleGameModeSelection,
  cycleDifficultySelection,
  cyclePracticeStartWave,
} from '../game/engine';
import { isCoopMode } from '../game/coop';
import { resolveMenuTouch } from '../game/render/menu-layout';
import { playMenuSelect } from '../game/audio';
import type { GameData } from '../game/types';
import type { CoopSession } from '../net/coop-session';
import { hostCoopEndless, joinCoopEndless, leaveCoopEndless, startCoopEndlessRun } from './coop-actions';

export function handleMenuTouchAction(
  g: GameData,
  session: CoopSession,
  cx: number,
  cy: number,
  toGame: (x: number, y: number) => { x: number; y: number } | null,
): void {
  const pt = toGame(cx, cy);
  if (!pt) {
    return;
  }

  const action = resolveMenuTouch(pt.x, pt.y, g.gameMode === 'practice', isCoopMode(g));
  if (!action) {
    return;
  }

  switch (action.kind) {
    case 'cycle_mode': {
      const wasCoop = isCoopMode(g);
      cycleGameModeSelection(g, action.direction);
      if (wasCoop && !isCoopMode(g)) leaveCoopEndless(g, session);
      playMenuSelect();
      break;
    }
    case 'cycle_aircraft':
      cycleAircraftSelection(g, action.direction);
      playMenuSelect();
      break;
    case 'cycle_weapon':
      cycleWeaponSelection(g, action.direction);
      playMenuSelect();
      break;
    case 'cycle_difficulty':
      cycleDifficultySelection(g, action.direction);
      playMenuSelect();
      break;
    case 'cycle_practice_start_wave':
      cyclePracticeStartWave(g, action.direction);
      playMenuSelect();
      break;
    case 'coop_host':
      hostCoopEndless(g, session);
      playMenuSelect();
      break;
    case 'coop_join':
      joinCoopEndless(g, session);
      playMenuSelect();
      break;
    case 'start':
      if (isCoopMode(g)) {
        if (startCoopEndlessRun(g, session)) playMenuSelect();
        break;
      }
      if (canStartGame(g)) {
        playMenuSelect();
        resetGame(g);
      }
      break;
  }
}
