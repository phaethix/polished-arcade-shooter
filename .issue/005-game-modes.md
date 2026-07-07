# 005 — Game Modes

**Status:** done  
**Phase:** 5  
**Target version:** v0.6.0

## Summary

Four distinct ways to play, selectable from the main menu.

## Modes

| ID | Name | Description |
|----|------|-------------|
| `story` | Story Mode | 4 chapters × 5 stages = 20 levels with brief story beats |
| `endless` | Endless | Current wave-based mode (default) |
| `boss_rush` | Boss Rush | Back-to-back boss fights, escalating patterns |
| `daily` | Daily Challenge | Seeded run with modifier (e.g. double speed, no bombs) |

## Menu flow

```text
Main Menu
├── Select Mode     (↑/↓)
├── Select Aircraft (←/→)
├── Select Weapon   ([ / ])
└── Start           (Space / Tap)
```

## Story structure

| Stages | Chapter | Boss |
|--------|---------|------|
| 1–5 | Deep Space | Space Commander |
| 6–10 | Asteroid Belt | Mining Rig |
| 11–15 | Enemy Carrier | Carrier Core |
| 16–20 | Wormhole | Void Entity |

## Daily challenge modifiers

- `2x enemy speed`
- `no power-ups`
- `single HP`
- `only kamikaze enemies`

## Implementation

- `src/game/modes.ts` — mode config, daily seed, wave/boss rules
- Menu mode picker (↑/↓ or tap mode row)
- Story victory screen after stage 20
- Endless behavior unchanged from prior releases

## Acceptance criteria

- [x] Mode selection persists through menu → game start
- [x] Endless mode behavior unchanged from v0.1.0
- [x] Boss rush is playable
- [x] Story mode 20-stage progression with chapter bosses
- [x] Daily challenge uses date-seeded modifier
