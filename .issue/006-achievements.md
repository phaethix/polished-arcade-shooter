# 006 — Achievements & Unlocks

**Status:** planned  
**Phase:** 6  
**Target version:** v0.5.0

## Summary

Persistent progression via coins and achievements stored in `localStorage`.

## Coin economy

| Source | Amount |
|--------|--------|
| Enemy kill | 1–10 (by type) |
| Boss kill | 50 |
| Stage clear (story) | 25 |
| Daily challenge complete | 100 |

## Unlock costs (draft)

| Item | Cost |
|------|------|
| Phantom | 500 coins |
| Fortress | 800 coins |
| Armor Piercing | 300 coins |
| Shotgun | 400 coins |
| Laser | 600 coins |
| Homing | 600 coins |

## Achievements (draft)

| ID | Name | Condition |
|----|------|-----------|
| `first_blood` | First Blood | Kill 1 enemy |
| `combo_master` | Combo Master | Reach 20x combo |
| `graze_king` | Graze King | Graze 50 bullets in one run |
| `boss_slayer` | Boss Slayer | Defeat 10 bosses (lifetime) |
| `survivor` | Survivor | Reach wave 10 |
| `untouchable` | Untouchable | Clear a stage without taking damage |

## Storage keys (planned)

```text
sky_blaster_coins_v1
sky_blaster_unlocks_v1
sky_blaster_achievements_v1
```

## Implementation slices

1. Progress persistence module (`src/game/progress.ts`)
2. Coin awards on enemy kill / stage clear
3. Unlock checks on menu (lock icon for locked aircraft/weapons)
4. Achievement tracker hooks in engine events
5. Achievement toast UI on unlock

## Acceptance criteria

- Coins and unlocks persist across browser sessions
- Locked items show cost and cannot be selected
- Achievements unlock once and stay unlocked
