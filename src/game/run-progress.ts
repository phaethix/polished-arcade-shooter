import type { AchievementId, GameData } from './types';
import { addScorePopup } from './effects';
import {
  addCoins,
  DAILY_COMPLETE_COINS,
  DAILY_COMPLETE_WAVE,
  STORY_STAGE_CLEAR_COINS,
  unlockAchievement,
} from './progress';
import { isPracticeMode } from './modes';
import { isCoopMode } from './coop';
import * as sfx from './audio';

export function tickAchievementToast(g: GameData, dt: number): void {
  if (!g.achievementToast) {
    return;
  }
  g.achievementToast.timer -= dt;
  if (g.achievementToast.timer <= 0) {
    g.achievementToast = null;
  }
}

export function queueAchievement(g: GameData, id: AchievementId): void {
  if (isPracticeMode(g)) {
    return;
  }
  const unlocked = unlockAchievement(id);
  if (unlocked) {
    g.achievementToast = { id, timer: 3.5 };
    sfx.playPowerUp();
  }
}

export function awardRunCoins(g: GameData, amount: number, x?: number, y?: number): void {
  if (isPracticeMode(g) || amount <= 0) {
    return;
  }
  if (isCoopMode(g) && g.coopRole !== 'host') {
    return;
  }
  addCoins(amount);
  g.runCoinsEarned += amount;
  if (x != null && y != null) {
    addScorePopup(g, x, y, `+${amount}¢`, '#fd4');
  }
}

export function onWaveCleared(g: GameData): void {
  if (!g.waveDamageTaken) {
    queueAchievement(g, 'untouchable');
  }
  if (g.gameMode === 'story') {
    awardRunCoins(g, STORY_STAGE_CLEAR_COINS);
  }
  if (g.gameMode === 'daily' && g.wave >= DAILY_COMPLETE_WAVE && !g.dailyBonusAwarded) {
    awardRunCoins(g, DAILY_COMPLETE_COINS);
    g.dailyBonusAwarded = true;
  }
  if (g.wave >= 10) {
    queueAchievement(g, 'survivor');
  }
}
