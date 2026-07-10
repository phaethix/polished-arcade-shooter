import type { AircraftId, Player, WeaponId } from './types';
import { CANVAS_W, CANVAS_H, PLAYER_W, PLAYER_H } from './core/constants';
import { getAircraft } from './aircraft';

/** Builds a fresh player ship for the given loadout. */
export function createPlayer(
  aircraftId: AircraftId = 'falcon',
  weaponId: WeaponId = 'standard',
): Player {
  const craft = getAircraft(aircraftId);
  return {
    x: CANVAS_W / 2,
    y: CANVAS_H - 80,
    width: PLAYER_W,
    height: PLAYER_H,
    speed: craft.speed,
    shootTimer: 0,
    shootInterval: 8,
    hp: craft.startHp,
    maxHp: craft.maxHp,
    invincibleTimer: 0,
    powerLevel: 0,
    shieldActive: false,
    shieldTimer: 0,
    tilt: 0,
    grazeTimer: 0,
    grazeCount: 0,
    aircraftId: craft.id,
    skillCooldown: 0,
    skillActiveTimer: 0,
    skillShieldActive: false,
    skillShieldTimer: 0,
    skillAbsorbedHits: 0,
    damageBoost: 0,
    dashVx: 0,
    dashVy: 0,
    weaponId,
    laserRamp: 0,
  };
}
