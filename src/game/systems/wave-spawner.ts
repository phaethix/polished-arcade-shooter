import type { GameData } from '../types';
import { saveHighScore } from '../storage/highscores';
import { spawnEnemy } from '../enemies';
import {
  getEnemiesPerWave,
  getSpawnIntervalMult,
  isStoryComplete,
  syncChapterForMode,
} from '../modes';
import { initChapterHazards } from '../hazards';
import { onWaveCleared } from '../run-progress';
import * as sfx from '../audio';

/** Advances wave timers and spawning. Returns true when the run should stop updating. */
export function updateWaves(g: GameData): boolean {
  if (g.waveAnnounceTimer > 0) {
    g.waveAnnounceTimer--;
  }
  g.waveTimer--;

  if (g.enemiesSpawned >= g.enemiesPerWave && g.enemies.length === 0) {
    if (g.waveTimer <= 0) {
      if (isStoryComplete(g)) {
        onWaveCleared(g);
        g.modeVictory = true;
        g.state = 'gameover';
        saveHighScore(g.score, g.wave);
        sfx.playBigExplosion();
        return true;
      }
      onWaveCleared(g);
      g.wave++;
      g.enemiesSpawned = 0;
      g.waveDamageTaken = false;
      g.specialSpawns = { sniper: false, healer: false };
      const chapterChanged = syncChapterForMode(g);
      if (chapterChanged) {
        initChapterHazards(g);
      }
      g.enemiesPerWave = getEnemiesPerWave(g);
      g.waveTimer = g.waveDelay;
      g.waveAnnounceTimer = 90;
    }
  } else if (g.enemiesSpawned < g.enemiesPerWave && g.waveTimer <= 0) {
    spawnEnemy(g);
    g.waveTimer = Math.max(15, (50 - g.wave * 3) * getSpawnIntervalMult(g));
  }

  return false;
}
