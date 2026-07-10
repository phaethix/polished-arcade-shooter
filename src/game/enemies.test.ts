import { describe, it, expect } from "vitest";
import type { Enemy, Bullet } from "./types";
import {
  blocksCenterShot,
  isFrontalShieldBlock,
  kamikazeExplosionRadius,
  isKamikazeBlastHit,
} from "./enemies";

function mkEnemy(partial: Partial<Enemy>): Enemy {
  return {
    x: 0, y: 0, width: 28, height: 28, hp: 1, maxHp: 1, speed: 1,
    type: "basic", shootTimer: 0, shootInterval: 60,
    movePattern: "straight", movePhase: 0, scoreValue: 100, flashTimer: 0,
    ...partial,
  };
}

function mkBullet(partial: Partial<Bullet>): Bullet {
  return {
    x: 0, y: 0, vx: 0, vy: -1, width: 4, height: 10,
    damage: 1, isPlayer: true, color: "#0ff",
    ...partial,
  };
}

describe("blocksCenterShot", () => {
  it("returns false for non-shielded enemies", () => {
    expect(blocksCenterShot(mkEnemy({ type: "basic", x: 100 }), 100)).toBe(false);
  });

  it("returns true when shot is within shield width threshold", () => {
    const e = mkEnemy({ type: "shielded", x: 100, width: 38 });
    // threshold = width * 0.38 = 14.44
    expect(blocksCenterShot(e, 100)).toBe(true);
    expect(blocksCenterShot(e, 110)).toBe(true);
  });

  it("returns false when shot is outside shield width threshold", () => {
    const e = mkEnemy({ type: "shielded", x: 100, width: 38 });
    expect(blocksCenterShot(e, 120)).toBe(false);
    expect(blocksCenterShot(e, 80)).toBe(false);
  });
});

describe("isFrontalShieldBlock", () => {
  it("returns false for non-shielded enemies", () => {
    const e = mkEnemy({ type: "basic" });
    const b = mkBullet({ vy: -1 });
    expect(isFrontalShieldBlock(e, b)).toBe(false);
  });

  it("returns false for downward-traveling bullets", () => {
    const e = mkEnemy({ type: "shielded", x: 100, width: 38 });
    const b = mkBullet({ x: 100, vy: 1 });
    expect(isFrontalShieldBlock(e, b)).toBe(false);
  });

  it("returns true for upward-traveling bullets hitting shield center", () => {
    const e = mkEnemy({ type: "shielded", x: 100, width: 38 });
    const b = mkBullet({ x: 100, vy: -1 });
    expect(isFrontalShieldBlock(e, b)).toBe(true);
  });

  it("returns false for upward bullets missing the shield", () => {
    const e = mkEnemy({ type: "shielded", x: 100, width: 38 });
    const b = mkBullet({ x: 130, vy: -1 });
    expect(isFrontalShieldBlock(e, b)).toBe(false);
  });
});

describe("kamikazeExplosionRadius", () => {
  it("returns 55", () => {
    expect(kamikazeExplosionRadius()).toBe(55);
  });
});

describe("isKamikazeBlastHit", () => {
  it("returns true when player is within blast radius", () => {
    const e = mkEnemy({ type: "kamikaze", x: 100, y: 100 });
    expect(isKamikazeBlastHit(e, 100, 100)).toBe(true);
    expect(isKamikazeBlastHit(e, 130, 100)).toBe(true); // within 55
  });

  it("returns false when player is outside blast radius", () => {
    const e = mkEnemy({ type: "kamikaze", x: 100, y: 100 });
    expect(isKamikazeBlastHit(e, 200, 100)).toBe(false);
    expect(isKamikazeBlastHit(e, 100, 200)).toBe(false);
  });

  it("returns true at exactly the radius boundary", () => {
    const e = mkEnemy({ type: "kamikaze", x: 0, y: 0 });
    const r = kamikazeExplosionRadius();
    // distance == r → dx*dx + dy*dy <= r*r is true (boundary inclusive)
    expect(isKamikazeBlastHit(e, r, 0)).toBe(true);
  });
});
