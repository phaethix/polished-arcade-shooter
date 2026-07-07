# 005 — Game Modes

**Status:** planned  
**Phase:** 5  
**Target version:** v0.5.0

## Summary

Four distinct ways to play, selectable from the main menu.

## Modes

| ID | Name | Description |
|----|------|-------------|
| `story` | Story Mode | 4 chapters × 5 stages = 20 levels with brief story beats |
| `endless` | Endless | Current wave-based mode (default) |
| `boss_rush` | Boss Rush | Back-to-back boss fights, escalating patterns |
| `daily` | Daily Challenge | Seeded run with modifier (e.g. double speed, no bombs) |

## Menu flow (planned)

```text
Main Menu
├── Select Mode     (←/→)
├── Select Aircraft (←/→)
└── Start           (Space / Tap)
```

## Story structure (draft)

| Stages | Chapter | Boss |
|--------|---------|------|
| 1–5 | Deep Space | Space Commander |
| 6–10 | Asteroid Belt | Mining Rig |
| 11–15 | Enemy Carrier | Carrier Core |
| 16–20 | Wormhole | Void Entity |

## Daily challenge modifiers (examples)

- `2x enemy speed`
- `no power-ups`
- `single HP`
- `only kamikaze enemies`

## Implementation slices

1. `GameMode` type + menu mode picker
2. Endless mode refactor (extract wave manager)
3. Boss rush mode
4. Story mode stage progression
5. Daily challenge seed + modifier system

## Acceptance criteria

- Mode selection persists through menu → game start
- Endless mode behavior unchanged from v0.1.0
- At least boss rush is playable before story mode ships
