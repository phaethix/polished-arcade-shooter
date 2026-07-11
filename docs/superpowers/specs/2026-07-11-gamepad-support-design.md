# Design: Gamepad support (gameplay)

**Date:** 2026-07-11  
**Status:** Implemented  
**Branch:** `feature/gamepad-support`

---

## Goal

Add **browser Gamepad API** support for in-run controls so players can move, shoot, bomb, skill, and pause with a controller, alongside keyboard and touch.

Menu navigation, auto-fire toggle (`F`), Practice invincibility (`I`), and unlock (`U`) stay keyboard/touch in v1.

---

## Decisions (locked)

| Topic                    | Choice                                                          |
| ------------------------ | --------------------------------------------------------------- |
| Scope                    | **Gameplay only** (+ pause)                                     |
| Integration              | New `useGamepadInput` writes into existing `InputState`         |
| Merge with other devices | **OR** — any source can set a flag true                         |
| Stick                    | Left stick + D-pad; deadzone **0.25**                           |
| Mapping                  | Prefer pads with `gamepad.mapping === 'standard'`               |
| Multi-pad                | First connected standard pad (index order); ignore others in v1 |
| Remapping UI             | Out of scope                                                    |

---

## Standard Gamepad mapping (Xbox-style semantics)

| Action | Buttons / axes                                | Notes                                                |
| ------ | --------------------------------------------- | ---------------------------------------------------- |
| Move   | Left stick (axes 0/1) + D-pad (buttons 12–15) | Digital OR after deadzone                            |
| Shoot  | A (button 0) **or** RT (button 7)             | Held → `input.shoot = true`                          |
| Bomb   | B (button 1)                                  | Rising edge → `input.bomb = true` (same as keyboard) |
| Skill  | X (button 2)                                  | Rising edge → `input.skill = true`                   |
| Pause  | Start (button 9)                              | Rising edge → `togglePause(g)` when playing/paused   |

Button indices follow the [Standard Gamepad](https://w3c.github.io/gamepad/#remapping) layout.

### Edge vs level

- **Level (held):** movement, shoot — set every poll while active; when inactive, do **not** force `false` if keyboard still holds the key (see merge rules).
- **Edge (press):** bomb, skill, pause — detect `pressed && !wasPressed` using previous-frame button state stored in the hook ref.

### Input merge rules

Keyboard and pointer continue to write `InputState` as today. Each gamepad poll:

1. Compute gamepad contribution for move/shoot.
2. For directional and shoot flags: `input.flag = input.flag || gamepadFlag` is **unsafe** if keyboard cleared between frames. Prefer:
   - Keep keyboard as source of truth for keys it owns on keyup/keydown.
   - Gamepad poll **sets** move/shoot to true when pad wants them; when pad does not want them, **leave** existing values alone (keyboard/touch may still be true).

   Practical approach used by many games:

   ```text
   // Each frame before reading pad (optional clear of pad-only channels — not used)
   // Instead: accumulate
   if (padLeft) input.left = true;
   if (padRight) input.right = true;
   ...
   if (padShoot) input.shoot = true;
   // Never assign false from gamepad for these
   ```

   Keyboard keyup still clears its own flags. If both were held and keyboard releases, pad poll the same frame keeps the flag true. If pad releases, keyboard keydown state remains.

3. Bomb/skill: only set `true` on rising edge (consumed to `false` in `player-controller` as today).
4. Pause: call `togglePause` on rising edge of Start; do not use `InputState`.

### When active

- Apply move/shoot/bomb/skill only when `g.state === 'playing'`.
- Pause toggle when `g.state === 'playing' || g.state === 'paused'`.
- Menu / gameover: ignore gameplay buttons (no accidental bombs).

### Connection

- Listen to `gamepadconnected` / `gamepaddisconnected` only for optional logging or “pad active” hint; **always poll** `navigator.getGamepads()` each animation frame (browsers require user gesture / connection before pads appear).
- Skip null slots; pick lowest index with `mapping === 'standard'`. If none standard, fall back to first non-null pad (best-effort) **or** require standard only — **prefer standard-only** for v1 predictability.

### Audio

First gamepad button press while playing may call `resumeAudio()` (same as other input paths) so Web Audio unlocks on pad gesture where needed.

---

## Architecture

```text
App.tsx
  ├─ useKeyboardInput  → InputState + menu/pause keys
  ├─ usePointerInput   → InputState touch fields
  └─ useGamepadInput   → InputState move/shoot/bomb/skill + togglePause
        └─ poll getGamepads() inside useGameLoop tick OR rAF in the hook

player-controller.ts — unchanged (reads InputState)
```

**Prefer polling inside `useGamepadInput` via the existing game loop:** either

- pass a per-frame callback from `useGameLoop`, or
- poll at the start of `update()` via a small `pollGamepad(g, input)` called from `useGameLoop` before `update`.

Hook-based rAF duplicate is OK but wasteful. **Recommended:** export `pollGamepadInput(g, input, prevButtonsRef)` from `src/app/gamepad.ts` and call it from `use-game-loop.ts` once per fixed tick (or once per rAF frame before update). Wire `useGamepadInput` only for event listeners + ref setup if needed — or skip the hook and init refs in `App` / game loop.

Simplest clean split:

| File                           | Role                                                                        |
| ------------------------------ | --------------------------------------------------------------------------- |
| `src/app/gamepad.ts`           | Pure-ish poll: read pads, apply to `InputState`, edge detect, `togglePause` |
| `src/app/gamepad.test.ts`      | Unit tests with fake `Gamepad` objects                                      |
| `src/app/use-game-loop.ts`     | Call `pollGamepad` each frame                                               |
| `src/App.tsx`                  | No UI change (optional later HUD “PAD”)                                     |
| `docs/PLAYER_GUIDE.md`         | Controls table                                                              |
| `.issue/2026-07-07-roadmap.md` | Mark controller support done                                                |

`InputState` interface unchanged.

---

## Testing

- Unit-test mapping helpers with mock gamepad snapshots (axes, buttons pressed/value).
- Deadzone: axis 0.2 → no move; 0.3 → move.
- Rising edge: bomb only once per press.
- `state !== 'playing'` → no move/shoot/bomb/skill writes.
- Manual: Chrome/Firefox + Xbox/PS pad or OS gamepad tester.

---

## Acceptance

1. With a standard gamepad, player can move (stick + D-pad), hold A/RT to shoot, B bomb, X skill, Start pause/unpause during a run.
2. Keyboard and touch still work; combined use does not stick movement after pad release if keyboard idle.
3. On title menu, gamepad does not change selection or start the game.
4. `npm run typecheck && npm run test:run` pass.

## Non-goals

- Menu / Practice-wave / unlock via pad
- Remappable controls / settings screen
- Gyro, rumble, multiple local players
- Virtual on-screen gamepad overlay
- Forcing `autoFire` off when using pad (pad can hold shoot; autoFire still applies if on)
