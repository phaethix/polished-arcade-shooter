import {
  resetGame,
  canStartGame,
  cycleAircraftSelection,
  cycleWeaponSelection,
  cycleGameModeSelection,
  cycleDifficultySelection,
} from '../game/engine';
import { resolveMenuTouch } from '../game/render/menu-layout';
import { playMenuSelect } from '../game/audio';
import type { GameData } from '../game/types';

export function handleMenuTouchAction(
  g: GameData,
  cx: number,
  cy: number,
  toGame: (x: number, y: number) => { x: number; y: number } | null,
): void {
  const pt = toGame(cx, cy);
  if (!pt) {
    return;
  }

  const action = resolveMenuTouch(pt.x, pt.y);
  if (!action) {
    return;
  }

  switch (action.kind) {
    case 'cycle_mode':
      cycleGameModeSelection(g, action.direction);
      playMenuSelect();
      break;
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
    case 'start':
      if (canStartGame(g)) {
        playMenuSelect();
        resetGame(g);
      }
      break;
  }
}
