# Expansion Roadmap

Incremental rollout for Sky Blaster v0.2+. Each phase should land as multiple small commits.

## Principles

- **One concern per commit** — types, data, logic, UI, and polish stay separate
- **Ship vertically in thin slices** — each slice should be playable
- **Endless mode stays working** — new modes extend, not replace, the current loop

## Phase 1 — Aircraft foundation

| # | Item | Status |
|---|------|--------|
| 1.1 | Expansion type definitions | done |
| 1.2 | Aircraft configuration data | done |
| 1.3 | Aircraft stats on player spawn | done |
| 1.4 | Menu aircraft picker | done |
| 1.5 | Aircraft-specific visuals | done |
| 1.6 | Falcon — missile salvo skill | done |
| 1.7 | Phantom — dash skill | done |
| 1.8 | Fortress — energy shield skill | done |

## Phase 2 — Weapons (current)

| # | Item | Status |
|---|------|--------|
| 2.1 | Weapon type definitions + config | done |
| 2.2 | Weapon switching (in-run pickup or menu) | done |
| 2.3 | Armor-piercing bullets | done |
| 2.4 | Shotgun spread pattern | done |
| 2.5 | Laser beam (sustained DPS) | done |
| 2.6 | Homing missiles | done |

## Phase 3 — New enemies

| # | Item | Status |
|---|------|--------|
| 3.1 | Splitter (spawns mini enemies on death) | planned |
| 3.2 | Sniper (long-range aimed shots) | planned |
| 3.3 | Shielded (frontal immunity) | planned |
| 3.4 | Kamikaze (rush + explode) | planned |
| 3.5 | Healer (aura heal nearby enemies) | planned |

## Phase 4 — Chapters & environments

| # | Item | Status |
|---|------|--------|
| 4.1 | Chapter data model | planned |
| 4.2 | Deep space (current visuals, baseline) | planned |
| 4.3 | Asteroid belt (dodging hazards) | planned |
| 4.4 | Enemy carrier (turret obstacles) | planned |
| 4.5 | Wormhole (teleport pads) | planned |

## Phase 5 — Game modes

| # | Item | Status |
|---|------|--------|
| 5.1 | Mode selection on menu | planned |
| 5.2 | Story mode (4 chapters × 5 stages) | planned |
| 5.3 | Endless mode (existing, polished) | planned |
| 5.4 | Boss rush | planned |
| 5.5 | Daily challenge (seeded modifiers) | planned |

## Phase 6 — Meta progression

| # | Item | Status |
|---|------|--------|
| 6.1 | Coin economy + persistence | planned |
| 6.2 | Unlock aircraft with coins | planned |
| 6.3 | Unlock weapons with coins | planned |
| 6.4 | Achievement tracking | planned |
| 6.5 | Achievement notifications | planned |

## Supplementary ideas (backlog)

- **Difficulty tiers** — Easy / Normal / Hard affecting enemy density and bullet speed
- **Practice mode** — Sandbox with invincibility toggle
- **Run statistics screen** — DPS, accuracy, graze rate after game over
- **Colorblind palettes** — Accessible enemy and power-up colors
- **Controller support** — Gamepad mapping alongside keyboard/touch

## Version targets

| Version | Scope |
|---------|-------|
| v0.2.0 | Aircraft selection + 3 skills |
| v0.3.0 | Weapons + 2 new enemy types |
| v0.4.0 | Chapters + story mode skeleton |
| v0.5.0 | Boss rush, daily challenge, achievements |
