import type { WeaponId, GameData } from './types';
import { getAircraft } from './aircraft';
import * as sfx from './audio';

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  shortName: string;
  tagline: string;
  hudColor: string;
  bulletColor: string;
  unlockedByDefault: boolean;
  coinCost: number;
}

export const WEAPON_ORDER: WeaponId[] = [
  'standard',
  'armor_piercing',
  'shotgun',
  'laser',
  'homing',
];

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  standard: {
    id: 'standard',
    name: 'Standard Blaster',
    shortName: 'STD',
    tagline: 'Reliable spread-fire blaster',
    hudColor: '#0ff',
    bulletColor: '#0ff',
    unlockedByDefault: true,
    coinCost: 0,
  },
  armor_piercing: {
    id: 'armor_piercing',
    name: 'Armor Piercing',
    shortName: 'AP',
    tagline: 'Rounds pierce through enemies',
    hudColor: '#8f8',
    bulletColor: '#afa',
    unlockedByDefault: false,
    coinCost: 300,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    shortName: 'SG',
    tagline: 'Wide burst at close range',
    hudColor: '#fa4',
    bulletColor: '#fc8',
    unlockedByDefault: false,
    coinCost: 400,
  },
  laser: {
    id: 'laser',
    name: 'Laser',
    shortName: 'LSR',
    tagline: 'Continuous beam ramps damage',
    hudColor: '#f4f',
    bulletColor: '#f8f',
    unlockedByDefault: false,
    coinCost: 600,
  },
  homing: {
    id: 'homing',
    name: 'Homing',
    shortName: 'HMG',
    tagline: 'Slow missiles track targets',
    hudColor: '#f88',
    bulletColor: '#f88',
    unlockedByDefault: false,
    coinCost: 600,
  },
};

export function getWeapon(id: WeaponId): WeaponDefinition {
  return WEAPONS[id];
}

export function nextWeapon(id: WeaponId, direction: -1 | 1): WeaponId {
  const index = WEAPON_ORDER.indexOf(id);
  const next = (index + direction + WEAPON_ORDER.length) % WEAPON_ORDER.length;
  return WEAPON_ORDER[next];
}

export const ALTERNATE_WEAPONS: WeaponId[] = WEAPON_ORDER.filter((id) => id !== 'standard');

const BULLET_SPEED = 12;

function bulletColor(g: GameData): string {
  const craft = getAircraft(g.player.aircraftId);
  const weapon = getWeapon(g.player.weaponId);
  return g.player.weaponId === 'standard' ? craft.bulletColor : weapon.bulletColor;
}

function pushStandardSpread(g: GameData, damage: number, color: string) {
  const p = g.player;
  const l = p.powerLevel;
  g.bullets.push({
    x: p.x,
    y: p.y - p.height / 2 - 5,
    vx: 0,
    vy: -BULLET_SPEED,
    width: 4,
    height: 14,
    damage,
    isPlayer: true,
    color,
    weapon: p.weaponId,
  });
  g.shotsFired++;
  if (l >= 1)
    for (const d of [-10, 10]) {
      g.bullets.push({
        x: p.x + d,
        y: p.y - p.height / 2,
        vx: 0,
        vy: -BULLET_SPEED,
        width: 3,
        height: 12,
        damage,
        isPlayer: true,
        color,
        weapon: p.weaponId,
      });
      g.shotsFired++;
    }
  if (l >= 2)
    for (const d of [-1, 1]) {
      g.bullets.push({
        x: p.x + d * 8,
        y: p.y - p.height / 2,
        vx: d * 2,
        vy: -BULLET_SPEED,
        width: 3,
        height: 10,
        damage,
        isPlayer: true,
        color,
        weapon: p.weaponId,
      });
      g.shotsFired++;
    }
  if (l >= 3)
    for (const d of [-1, 1]) {
      g.bullets.push({
        x: p.x + d * 5,
        y: p.y - p.height / 2,
        vx: d * 3.5,
        vy: -BULLET_SPEED * 0.9,
        width: 3,
        height: 10,
        damage,
        isPlayer: true,
        color,
        weapon: p.weaponId,
      });
      g.shotsFired++;
    }
}

export function fireStandard(g: GameData) {
  const p = g.player;
  const damage = 1 + p.damageBoost;
  p.damageBoost = 0;
  const color = bulletColor(g);
  sfx.playShoot();
  pushStandardSpread(g, damage, color);
}

export function fireArmorPiercing(g: GameData) {
  const p = g.player;
  const damage = 1 + p.damageBoost;
  p.damageBoost = 0;
  const color = getWeapon('armor_piercing').bulletColor;
  sfx.playShoot();
  const l = p.powerLevel;
  const pierce = 3;
  const mk = (x: number, y: number, vx: number, vy: number, w: number, h: number, dmg: number) => {
    g.bullets.push({
      x,
      y,
      vx,
      vy,
      width: w,
      height: h,
      damage: dmg,
      isPlayer: true,
      color,
      weapon: 'armor_piercing',
      pierceRemaining: pierce,
    });
    g.shotsFired++;
  };
  mk(p.x, p.y - p.height / 2 - 5, 0, -BULLET_SPEED, 4, 14, damage);
  if (l >= 1)
    for (const d of [-10, 10]) mk(p.x + d, p.y - p.height / 2, 0, -BULLET_SPEED, 3, 12, damage);
  if (l >= 2)
    for (const d of [-1, 1])
      mk(p.x + d * 8, p.y - p.height / 2, d * 2, -BULLET_SPEED, 3, 10, damage);
  if (l >= 3)
    for (const d of [-1, 1])
      mk(p.x + d * 5, p.y - p.height / 2, d * 3.5, -BULLET_SPEED * 0.9, 3, 10, damage);
}

export function fireShotgun(g: GameData) {
  const p = g.player;
  const damage = 1 + p.damageBoost;
  p.damageBoost = 0;
  const color = getWeapon('shotgun').bulletColor;
  sfx.playShoot();
  const pellets = 5 + p.powerLevel * 2;
  for (let i = 0; i < pellets; i++) {
    const t = pellets === 1 ? 0 : (i / (pellets - 1) - 0.5) * 1.1;
    const speed = 9;
    g.bullets.push({
      x: p.x,
      y: p.y - p.height / 2,
      vx: Math.sin(t) * speed * 0.55,
      vy: -Math.cos(t) * speed,
      width: 4,
      height: 4,
      damage,
      isPlayer: true,
      color,
      weapon: 'shotgun',
      maxTravel: 95,
      distanceTraveled: 0,
    });
    g.shotsFired++;
  }
}

export function fireHoming(g: GameData) {
  const p = g.player;
  const damage = 1 + p.damageBoost;
  p.damageBoost = 0;
  const color = getWeapon('homing').bulletColor;
  sfx.playShoot();
  const count = 1 + Math.min(2, p.powerLevel);
  for (let i = 0; i < count; i++) {
    const spread = count === 1 ? 0 : (i - 0.5) * 0.35;
    const angle = -Math.PI / 2 + spread;
    const speed = 7;
    g.bullets.push({
      x: p.x + Math.cos(angle) * 4,
      y: p.y - p.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      width: 5,
      height: 9,
      damage,
      isPlayer: true,
      color,
      weapon: 'homing',
      homingStrength: 0.14,
    });
    g.shotsFired++;
  }
}

/** Dispatch player primary fire based on equipped weapon. */
export function fireWeapon(g: GameData) {
  switch (g.player.weaponId) {
    case 'armor_piercing':
      fireArmorPiercing(g);
      break;
    case 'shotgun':
      fireShotgun(g);
      break;
    case 'homing':
      fireHoming(g);
      break;
    case 'laser':
      break;
    case 'standard':
    default:
      fireStandard(g);
      break;
  }
}

export function updateBulletTravel(g: GameData) {
  for (const b of g.bullets) {
    if (!b.isPlayer || b.maxTravel == null) continue;
    const step = Math.hypot(b.vx, b.vy);
    b.distanceTraveled = (b.distanceTraveled ?? 0) + step;
    if (b.distanceTraveled >= b.maxTravel) {
      b.distanceTraveled = b.maxTravel + 1;
    }
  }
  g.bullets = g.bullets.filter((b) => !b.maxTravel || (b.distanceTraveled ?? 0) <= b.maxTravel);
}

export function consumePierce(b: GameData['bullets'][number]) {
  if (b.pierceRemaining == null) return;
  b.pierceRemaining--;
  b.damage = Math.max(1, Math.floor(b.damage * 0.75));
}

export function drawWeaponLabel(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponId,
  x: number,
  y: number,
) {
  const weapon = getWeapon(weaponId);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px "Segoe UI",Arial,sans-serif';
  ctx.fillStyle = weapon.hudColor;
  ctx.fillText(weapon.shortName, x, y);
  ctx.font = '9px "Segoe UI",Arial,sans-serif';
  ctx.fillStyle = '#889';
  ctx.fillText(weapon.name, x, y + 12);
  ctx.restore();
}
