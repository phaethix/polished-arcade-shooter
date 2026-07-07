# 001 — Multi-Aircraft System

**Status:** done  
**Phase:** 1  
**Target version:** v0.2.0

## Summary

Three playable ships with distinct stats and active skills. Falcon is unlocked by default; Phantom and Fortress unlock via coins (Phase 6).

## Aircraft

| ID | Name | Role | Speed | HP | Skill |
|----|------|------|-------|-----|-------|
| `falcon` | Falcon | Balanced | 6 | 3/5 | Missile Salvo |
| `phantom` | Phantom | Agile | 8 | 2/4 | Dash (brief invincibility) |
| `fortress` | Fortress | Tank | 4 | 5/6 | Energy Shield (absorb → attack boost) |

## Skill details

### Missile Salvo (Falcon)

- Cooldown: ~8 seconds
- Fires 5 homing mini-missiles at nearest enemies
- Input: `C` / `Shift` (keyboard), on-screen button (touch)

### Dash (Phantom)

- Cooldown: ~4 seconds
- Short burst in movement direction, invincible during dash
- Can pass through enemies and bullets

### Energy Shield (Fortress)

- Cooldown: ~10 seconds
- 3-second barrier absorbs hits; each absorbed hit adds +1 damage to next volley
- Visual: golden hexagonal barrier

## Implementation slices

1. [x] Design spec (this file)
2. [x] Type definitions (`AircraftId`, `AircraftSkill`)
3. [x] Static config (`src/game/aircraft.ts`)
4. [x] Player spawn uses aircraft stats
5. [x] Menu picker (cycle with ←/→)
6. [x] Hull color per aircraft
7. [x] Skill framework (`skillCooldown`, `skillActive` on Player)
8. [x] Individual skill implementations (one commit each)

## Acceptance criteria

- Player can select aircraft on the main menu before starting
- Stats (speed, HP) reflect the chosen ship in gameplay
- Each ship has a visually distinct hull
- Skills work in endless mode without breaking existing controls
