import { useEffect, type RefObject } from 'react';
import {
  resetGame,
  canStartGame,
  tryUnlockSelectedAircraft,
  tryUnlockSelectedWeapon,
  cycleAircraftSelection,
  cycleWeaponSelection,
  cycleGameModeSelection,
  cycleDifficultySelection,
  cyclePracticeStartWave,
  togglePause,
} from '../game/engine';
import { resumeAudio, playMenuSelect } from '../game/audio';
import type { GameData } from '../game/types';
import type { InputState } from './input';

export function useKeyboardInput(
  gameRef: RefObject<GameData>,
  inputRef: RefObject<InputState>,
): void {
  useEffect(() => {
    const handle = (e: KeyboardEvent, down: boolean) => {
      const inp = inputRef.current;
      const g = gameRef.current;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleGameModeSelection(g, -1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.up = down;
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleGameModeSelection(g, 1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.down = down;
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleAircraftSelection(g, -1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.left = down;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleAircraftSelection(g, 1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.right = down;
          e.preventDefault();
          break;

        case 'KeyU':
          if (g.state === 'menu' && down) {
            resumeAudio();
            const unlockedCraft = tryUnlockSelectedAircraft(g);
            const unlockedWeapon = tryUnlockSelectedWeapon(g);
            if (unlockedCraft || unlockedWeapon) {
              playMenuSelect();
            }
            e.preventDefault();
          }
          break;

        case 'Space':
        case 'KeyZ':
          e.preventDefault();
          if (down) {
            resumeAudio();
            if (g.state === 'menu' || g.state === 'gameover') {
              if (g.state === 'menu' && !canStartGame(g)) {
                break;
              }
              playMenuSelect();
              resetGame(g);
            } else {
              inp.shoot = true;
            }
          } else {
            inp.shoot = false;
          }
          break;

        case 'KeyX':
        case 'KeyB':
          if (down && g.state === 'playing') {
            inp.bomb = true;
          }
          e.preventDefault();
          break;

        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          if (down && g.state === 'playing') {
            inp.skill = true;
          }
          e.preventDefault();
          break;

        case 'BracketLeft':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleWeaponSelection(g, -1);
            playMenuSelect();
            e.preventDefault();
          }
          break;
        case 'BracketRight':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleWeaponSelection(g, 1);
            playMenuSelect();
            e.preventDefault();
          }
          break;

        case 'Comma':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleDifficultySelection(g, -1);
            playMenuSelect();
            e.preventDefault();
          }
          break;
        case 'Period':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleDifficultySelection(g, 1);
            playMenuSelect();
            e.preventDefault();
          }
          break;

        case 'Minus':
          if (g.state === 'menu' && g.gameMode === 'practice' && down) {
            resumeAudio();
            cyclePracticeStartWave(g, -1);
            playMenuSelect();
            e.preventDefault();
          }
          break;
        case 'Equal':
          if (g.state === 'menu' && g.gameMode === 'practice' && down) {
            resumeAudio();
            cyclePracticeStartWave(g, 1);
            playMenuSelect();
            e.preventDefault();
          }
          break;

        case 'Escape':
        case 'KeyP':
          if (down) {
            togglePause(g);
          }
          e.preventDefault();
          break;

        case 'KeyF':
          if (down && g.state === 'playing') {
            g.autoFire = !g.autoFire;
            playMenuSelect();
          }
          e.preventDefault();
          break;

        case 'KeyI':
          if (down && g.state === 'playing' && g.gameMode === 'practice') {
            g.practiceInvincible = !g.practiceInvincible;
            playMenuSelect();
          }
          e.preventDefault();
          break;
      }
    };

    const kd = (e: KeyboardEvent) => handle(e, true);
    const ku = (e: KeyboardEvent) => handle(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [gameRef, inputRef]);
}
