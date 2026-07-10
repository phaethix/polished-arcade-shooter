import { describe, it, expect } from "vitest";
import type { Bullet } from "./types";
import {
  consumePierce,
  getWeapon,
  nextWeapon,
  WEAPON_ORDER,
  ALTERNATE_WEAPONS,
} from "./weapons";

describe("consumePierce", () => {
  it("decrements pierceRemaining by 1", () => {
    const b: Bullet = {
      x: 0, y: 0, vx: 0, vy: -1, width: 4, height: 14,
      damage: 3, isPlayer: true, color: "#afa",
      weapon: "armor_piercing", pierceRemaining: 3,
    };
    consumePierce(b);
    expect(b.pierceRemaining).toBe(2);
  });

  it("reduces damage to 75% rounded down, min 1", () => {
    const b: Bullet = {
      x: 0, y: 0, vx: 0, vy: -1, width: 4, height: 14,
      damage: 4, isPlayer: true, color: "#afa",
      weapon: "armor_piercing", pierceRemaining: 3,
    };
    consumePierce(b);
    expect(b.damage).toBe(3); // floor(4 * 0.75) = 3
  });

  it("clamps damage to minimum 1", () => {
    const b: Bullet = {
      x: 0, y: 0, vx: 0, vy: -1, width: 4, height: 14,
      damage: 1, isPlayer: true, color: "#afa",
      weapon: "armor_piercing", pierceRemaining: 1,
    };
    consumePierce(b);
    expect(b.damage).toBe(1); // floor(1 * 0.75) = 0, clamped to 1
  });

  it("is a no-op when pierceRemaining is undefined", () => {
    const b: Bullet = {
      x: 0, y: 0, vx: 0, vy: -1, width: 4, height: 14,
      damage: 2, isPlayer: true, color: "#0ff",
    };
    consumePierce(b);
    expect(b.damage).toBe(2);
    expect(b.pierceRemaining).toBeUndefined();
  });
});

describe("getWeapon", () => {
  it("returns the correct weapon definition for each id", () => {
    for (const id of WEAPON_ORDER) {
      const w = getWeapon(id);
      expect(w.id).toBe(id);
      expect(w.name).toBeTruthy();
      expect(w.shortName).toBeTruthy();
      expect(w.bulletColor).toMatch(/^#/);
    }
  });
});

describe("nextWeapon", () => {
  it("cycles forward through the weapon order", () => {
    const visited: string[] = [];
    let current = WEAPON_ORDER[0];
    for (let i = 0; i < WEAPON_ORDER.length; i++) {
      visited.push(current);
      current = nextWeapon(current, 1);
    }
    expect(current).toBe(WEAPON_ORDER[0]);
    expect(new Set(visited).size).toBe(WEAPON_ORDER.length);
  });

  it("cycles backward", () => {
    const first = WEAPON_ORDER[0];
    const last = WEAPON_ORDER[WEAPON_ORDER.length - 1];
    expect(nextWeapon(first, -1)).toBe(last);
  });
});

describe("ALTERNATE_WEAPONS", () => {
  it("excludes the standard weapon", () => {
    expect(ALTERNATE_WEAPONS).not.toContain("standard");
    expect(ALTERNATE_WEAPONS.length).toBe(WEAPON_ORDER.length - 1);
  });
});
