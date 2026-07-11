# 006 — Achievements & Unlocks

**Status:** done  
**Phase:** 6  
**Target version:** v0.7.0

## Summary

Persistent progression via coins and achievements stored in `localStorage`.

## Coin economy

| Source                             | Amount         |
| ---------------------------------- | -------------- |
| Enemy kill                         | 1–10 (by type) |
| Boss kill                          | 50             |
| Stage clear (story)                | 25             |
| Daily challenge complete (wave 10) | 100            |

## Unlock costs

| Item           | Cost      |
| -------------- | --------- |
| Phantom        | 500 coins |
| Fortress       | 800 coins |
| Armor Piercing | 300 coins |
| Shotgun        | 400 coins |
| Laser          | 600 coins |
| Homing         | 600 coins |

## Achievements

| ID             | Name         | Condition                           |
| -------------- | ------------ | ----------------------------------- |
| `first_blood`  | First Blood  | Kill 1 enemy (lifetime)             |
| `combo_master` | Combo Master | Reach 20× combo                     |
| `graze_king`   | Graze King   | Graze 50 bullets in one run         |
| `boss_slayer`  | Boss Slayer  | Defeat 10 bosses (lifetime)         |
| `survivor`     | Survivor     | Reach wave 10                       |
| `untouchable`  | Untouchable  | Clear a stage without taking damage |

## Storage keys

```text
sky_blaster_coins_v1
sky_blaster_unlocks_v1
sky_blaster_achievements_v1
sky_blaster_stats_v1
```

## Implementation

- `src/game/progress.ts` — persistence, unlocks, coin awards
- Menu: coin balance, lock icons, `U` to unlock
- Achievement toast on unlock during play
- Locked aircraft/weapons block game start

## Acceptance criteria

- [x] Coins and unlocks persist across browser sessions
- [x] Locked items show cost and cannot start until unlocked
- [x] Achievements unlock once and stay unlocked
- [x] Achievement notification toast on unlock
