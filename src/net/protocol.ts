import type { AircraftId, Difficulty, WeaponId } from '../game/types';

export interface LoadoutWire {
  aircraftId: AircraftId;
  weaponId: WeaponId;
}

export type NetMessage =
  | { type: 'hello'; role: 'host' | 'guest'; loadout: LoadoutWire }
  | {
      type: 'lobby';
      hostPresent: boolean;
      guestPresent: boolean;
      canStart: boolean;
      hostLoadout?: LoadoutWire;
      guestLoadout?: LoadoutWire;
    }
  | {
      type: 'start';
      difficulty: Difficulty;
      seed: number;
      hostLoadout: LoadoutWire;
      guestLoadout: LoadoutWire;
    }
  | {
      type: 'input';
      /** Local tick the guest issued this command on, echoed back via snapshot. */
      tick: number;
      left: boolean;
      right: boolean;
      up: boolean;
      down: boolean;
      shoot: boolean;
      bomb: boolean;
      skill: boolean;
      pause: boolean;
      /** Pointer drag delta in game pixels (guest → host), matching local touch gain. */
      touchDx: number;
      touchDy: number;
    }
  | { type: 'snapshot'; payload: unknown }
  | { type: 'gameover'; reason: 'team_wipe' | 'host_left' | 'guest_left' }
  | { type: 'error'; message: string };

export function parseNetMessage(raw: string): NetMessage | null {
  try {
    const data = JSON.parse(raw) as { type?: string };
    if (!data || typeof data.type !== 'string') return null;
    switch (data.type) {
      case 'hello':
      case 'lobby':
      case 'start':
      case 'input':
      case 'snapshot':
      case 'gameover':
      case 'error':
        return data as NetMessage;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function encodeNetMessage(msg: NetMessage): string {
  return JSON.stringify(msg);
}
