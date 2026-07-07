import type { AircraftId, AircraftSkill } from './types';

export interface AircraftDefinition {
  id: AircraftId;
  name: string;
  tagline: string;
  speed: number;
  startHp: number;
  maxHp: number;
  skill: AircraftSkill;
  skillName: string;
  skillDescription: string;
  skillCooldown: number;
  unlockedByDefault: boolean;
  coinCost: number;
  hullTop: string;
  hullMid: string;
  hullBottom: string;
  cockpitColor: string;
  engineColor: string;
  bulletColor: string;
}

export const AIRCRAFT_ORDER: AircraftId[] = ['falcon', 'phantom', 'fortress'];

export const AIRCRAFT: Record<AircraftId, AircraftDefinition> = {
  falcon: {
    id: 'falcon',
    name: 'Falcon',
    tagline: 'Balanced all-rounder',
    speed: 6,
    startHp: 3,
    maxHp: 5,
    skill: 'missile_salvo',
    skillName: 'Missile Salvo',
    skillDescription: 'Launch homing missiles at nearby enemies',
    skillCooldown: 8,
    unlockedByDefault: true,
    coinCost: 0,
    hullTop: '#44ddff',
    hullMid: '#2288cc',
    hullBottom: '#115577',
    cockpitColor: '#88eeff',
    engineColor: '#0088ff',
    bulletColor: '#0ff',
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    tagline: 'Fast and fragile',
    speed: 8,
    startHp: 2,
    maxHp: 4,
    skill: 'dash',
    skillName: 'Dash',
    skillDescription: 'Blink forward with brief invincibility',
    skillCooldown: 4,
    unlockedByDefault: false,
    coinCost: 500,
    hullTop: '#cc88ff',
    hullMid: '#8844cc',
    hullBottom: '#442266',
    cockpitColor: '#ddaaff',
    engineColor: '#aa44ff',
    bulletColor: '#c8f',
  },
  fortress: {
    id: 'fortress',
    name: 'Fortress',
    tagline: 'Heavy and slow',
    speed: 4,
    startHp: 5,
    maxHp: 6,
    skill: 'energy_shield',
    skillName: 'Energy Shield',
    skillDescription: 'Absorb hits and empower your next attack',
    skillCooldown: 10,
    unlockedByDefault: false,
    coinCost: 800,
    hullTop: '#ffcc44',
    hullMid: '#cc8822',
    hullBottom: '#664411',
    cockpitColor: '#ffdd88',
    engineColor: '#ff8800',
    bulletColor: '#fc4',
  },
};

export function getAircraft(id: AircraftId): AircraftDefinition {
  return AIRCRAFT[id];
}

export function nextAircraft(id: AircraftId, direction: -1 | 1): AircraftId {
  const index = AIRCRAFT_ORDER.indexOf(id);
  const next = (index + direction + AIRCRAFT_ORDER.length) % AIRCRAFT_ORDER.length;
  return AIRCRAFT_ORDER[next];
}
