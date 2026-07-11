import type { GameData, Player } from './types';

/** True when the current mode is the 2-player co-op endless mode. */
export function isCoopMode(g: GameData): boolean {
  return g.gameMode === 'coop_endless';
}

/** Ships currently in play: both ships in co-op with a joined guest, else solo. */
export function activePlayers(g: GameData): Player[] {
  return g.player2 ? [g.player, g.player2] : [g.player];
}

/** True when the run should end: either ship down in co-op, or the lone ship down in solo. */
export function shouldTeamWipe(g: GameData): boolean {
  if (!isCoopMode(g) || !g.player2) return g.player.hp <= 0;
  return g.player.hp <= 0 || g.player2.hp <= 0;
}
