# Design: Auto-fire toggle

**Date:** 2026-07-11  
**Status:** Approved

## Goal

Keyboard players can toggle continuous fire with a single key. Auto-fire is **on by default**.

## Behavior

| Item          | Choice                                                  |
| ------------- | ------------------------------------------------------- |
| State         | `GameData.autoFire: boolean`                            |
| Default       | `true` in `createGameData`                              |
| Toggle key    | `F` while `state === 'playing'`                         |
| Fire when     | `autoFire \|\| input.shoot \|\| input.touchActive`      |
| Across runs   | Persist for the session (`resetGame` does not clear it) |
| Across reload | Back to default `true`                                  |
| Persistence   | No `localStorage`                                       |

## UI / docs

- HUD: show `AUTO` (bottom-right) when enabled
- Menu controls list: `F` → Toggle auto-fire
- `PLAYER_GUIDE.md`: document `F` toggle; note default on

## Out of scope

- Touch-side toggle button
- Gamepad mapping
- Persisting preference across page reloads
