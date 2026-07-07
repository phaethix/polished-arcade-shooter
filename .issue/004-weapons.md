# 004 — Weapon System

**Status:** planned  
**Phase:** 2  
**Target version:** v0.3.0

## Summary

Switchable weapons that change bullet behavior. Standard blaster remains the default.

## Weapons

| ID | Name | Behavior |
|----|------|----------|
| `standard` | Standard | Current spread-power behavior |
| `armor_piercing` | Armor Piercing | Bullets pass through enemies (diminished damage per pierce) |
| `shotgun` | Shotgun | Wide fan, short range, high burst damage |
| `laser` | Laser | Continuous beam while firing, ramps DPS |
| `homing` | Homing | Slow missiles track nearest enemy |

## Bullet extensions (planned)

```typescript
interface Bullet {
  // existing fields...
  weapon?: WeaponId;
  pierceRemaining?: number;
  homingStrength?: number;
}
```

## Unlock flow

- Standard: default
- Others: coin unlock (Phase 6) or in-run weapon pickup (Phase 2 prototype)

## Implementation slices

1. Weapon type + config data
2. Refactor `playerShoot` into weapon strategies
3. One commit per weapon implementation
4. HUD weapon indicator

## Acceptance criteria

- Player can use at least 2 weapons in a single run
- Each weapon feels meaningfully different
- Weapon switching does not break power-up spread levels
