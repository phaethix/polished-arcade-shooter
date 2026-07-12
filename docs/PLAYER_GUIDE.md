# Player Guide

Reference for modes, controls, enemies, and progression in **Sky Blaster**. For product context and release history, see [WHITEPAPER.md](./WHITEPAPER.md).

---

## Game modes

| Mode                | Goal                                                                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Story**           | Clear 20 stages across 4 chapters; defeat chapter bosses and earn a mission-complete ending                                                                                                                                |
| **Endless**         | Survive infinite waves; chapter environments rotate every 5 waves                                                                                                                                                          |
| **Boss Rush**       | Fight consecutive bosses with scaling HP — no filler waves                                                                                                                                                                 |
| **Daily Challenge** | Same modifier for all players each day (double speed, no power-ups, single HP, or kamikaze swarm); spawns, drops, and hazards also use a calendar-date seed so everyone that day shares the same random stream             |
| **Practice**        | Endless-like waves with invincibility on by default (`I` toggles); choose a start wave (1–20) on the menu; chapter follows Endless rotation with bosses on waves 5, 10, 15, and 20; no coins, achievements, or high scores |
| **Co-op Endless**   | 2-player online Endless via a room code; same wave/chapter rules as Endless; **team wipe** — if either ship reaches 0 HP, the run ends for both; requires the co-op room server on Cloudflare Workers (solo modes do not)                       |

---

## Co-op Endless

Co-op is **optional** and **online only**. Story, Endless, Boss Rush, Daily, and Practice stay fully offline — no WebSocket unless you select **Co-op Endless**.

### Lobby

1. Select **Co-op Endless** on the title screen.
2. Each player picks aircraft and weapon locally.
3. **Host** (`H` or tap the left half of the **CO-OP LOBBY** row): creates a 6-character room code and waits for a guest.
4. **Guest** (`J` or tap the right half): the lobby row shows `TYPE CODE  _ _ _ _ _ _` — type the host's 6 characters on the keyboard, **Enter** (or Space) to join, **Backspace** to edit, **Esc** to cancel.
5. When both players are connected, the **host** starts the run with **Space** (guest sees “waiting for host”). Host **difficulty** applies to the run.

Touch: the lobby row uses the same left/right split as other menu rows — left = host, right = join.

### In run

| Role  | Simulation                                                | Notes                                                                                                                               |
| ----- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Host  | Runs the full game loop; sends snapshots to the guest     | Coins, achievements, and high scores save to **host** `localStorage` only                                                           |
| Guest | Sends input; renders host snapshots (no local combat sim) | Move (keyboard **or** mouse/touch drag), shoot, bomb, and pause requests work; **active skills (C / Shift) do not** yet (host-only) |

### Team wipe and disconnects

- **Team wipe:** Either ship at 0 HP ends the run for both players.
- **After game over:** Host presses **Space** (or taps) to rematch in the same room; guest presses **Space** to return to the lobby and wait for the host's next start.
- **Host disconnects** (lobby or run): session ends; guest sees a disconnect/game-over state.
- **Guest disconnects during a run:** run ends for both (no solo continuation).
- **Guest disconnects in lobby:** host returns to waiting for a guest.
- **Third player** joining a full room is rejected (`room_full`).

The co-op room server is a small relay (cap 2 players per room) running on Cloudflare Workers. Solo play on GitHub Pages never connects to it.

---

## Difficulty

Select **Easy**, **Normal**, or **Hard** on the menu before starting. All modes respect the selection.

| Tier       | Enemy speed | Enemy HP | Spawn rate | Player bonus   |
| ---------- | ----------- | -------- | ---------- | -------------- |
| **Easy**   | 75%         | 75%      | Slower     | +1 starting HP |
| **Normal** | 100%        | 100%     | Baseline   | —              |
| **Hard**   | 130%        | 125%     | Faster     | —              |

Boss HP uses the same multipliers. Daily modifiers (for example, double speed) stack on top.

---

## Loadout

### Aircraft

| Ship         | Style                | Skill                                             |
| ------------ | -------------------- | ------------------------------------------------- |
| **Falcon**   | Balanced all-rounder | Missile Salvo — homing missiles at nearby enemies |
| **Phantom**  | Fast and fragile     | Dash — short invincible burst                     |
| **Fortress** | Slow and tanky       | Energy Shield — absorbs hits and boosts attacks   |

### Weapons

| Weapon             | Effect                                  |
| ------------------ | --------------------------------------- |
| **Standard**       | Reliable spread-fire blaster (default)  |
| **Armor Piercing** | Rounds pierce through enemies           |
| **Shotgun**        | Wide burst at close range               |
| **Laser**          | Sustained beam; damage ramps while held |
| **Homing**         | Slow missiles that track targets        |

Phantom, Fortress, and alternate weapons unlock with coins earned during runs.

---

## Controls

### In-game

| Action     | Keyboard                                    | Touch / Mouse                      | Gamepad (standard layout) |
| ---------- | ------------------------------------------- | ---------------------------------- | ------------------------- |
| Move       | `WASD` or `Arrow Keys`                      | Drag anywhere                      | Left stick or D-pad       |
| Shoot      | `Space` or `Z` (hold)                       | Auto-fire while touching           | A or RT (hold)            |
| Auto-fire  | `F` toggles continuous fire (on by default) | —                                  | —                         |
| Invincible | `I` toggles (Practice mode only)            | —                                  | —                         |
| Bomb       | `X` or `B`                                  | —                                  | B                         |
| Skill      | `C` or `Shift`                              | Tap the skill zone (bottom center) | X                         |
| Pause      | `Esc` or `P`                                | Tap when paused                    | Start                     |

Menu navigation, auto-fire toggle, Practice invincibility, and unlocks remain keyboard/touch only.

### Menu

| Key           | Action                                                           |
| ------------- | ---------------------------------------------------------------- |
| `↑` / `↓`     | Cycle game mode                                                  |
| `←` / `→`     | Cycle aircraft                                                   |
| `[` / `]`     | Cycle weapon                                                     |
| `,` / `.`     | Cycle difficulty                                                 |
| `-` / `=`     | Cycle Practice start wave (1–20; Practice only)                  |
| `U`           | Unlock selected aircraft or weapon (costs coins)                 |
| `Space` / `Z` | Start game (solo); **host starts co-op run** when lobby is ready |
| `H`           | Host co-op lobby (Co-op Endless only)                            |
| `J`           | Join co-op — type 6-char code on screen, Enter                   |

**Practice start wave:** When Practice is selected, a **START WAVE** row appears between Difficulty and Start. Use `-` / `=` (or tap the row) to pick wave 1–20; the tagline shows the chapter name (same rotation as Endless) and **· boss** on waves 5, 10, 15, and 20.

**Touch / mouse:** tap each menu row to cycle — mode (upper/lower half), aircraft, weapon, difficulty, and Practice start wave (left/right half, including the ◀ ▶ glyphs). Tap **TAP or PRESS SPACE** to start.

> On mobile, tap the screen once if audio is silent — Web Audio unlocks on the first user gesture.

---

## Power-ups

| Icon  | Effect                                                      |
| ----- | ----------------------------------------------------------- |
| **S** | Spread — +1 power level (max 3; more bullets per shot)      |
| **F** | Fire rate — faster shooting                                 |
| **◇** | Shield — blocks one hit (~10 s)                             |
| **B** | Bomb — clears enemy bullets and damages all enemies         |
| **+** | Heal — +1 HP, or +500 score if already full                 |
| **W** | Weapon — swap to the dropped weapon for the rest of the run |

---

## Enemies

| Type         | Behavior                                    | Base score |
| ------------ | ------------------------------------------- | ---------- |
| **Basic**    | Standard patterns                           | 100        |
| **Fast**     | Quick, erratic movement                     | 150        |
| **Tank**     | High HP, slow                               | 300        |
| **Splitter** | Spawns mini enemies on death                | 220        |
| **Sniper**   | Long-range aimed shots                      | 350        |
| **Shielded** | Frontal immunity                            | 280        |
| **Kamikaze** | Rushes the player and explodes              | 180        |
| **Healer**   | Heals nearby enemies                        | 400        |
| **Mini**     | Small splitter spawn                        | 75         |
| **Boss**     | Chapter-specific attack pattern (see below) | 2000       |

Chapter bosses keep the same silhouette but change attack and hull accent by chapter:

| Chapter  | Pattern   | Attack feel                                |
| -------- | --------- | ------------------------------------------ |
| Space    | Fan       | Aimed 5-way spread                         |
| Asteroid | Rain      | Vertical rain + occasional side sweep      |
| Carrier  | Broadside | Left/right horizontal volleys + aimed shot |
| Wormhole | Ring      | Expanding ring burst + slow homing pellets |

---

## Scoring and progression

| Mechanic         | Detail                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| **Combo**        | Chain kills within 1.5 s; every 5 combo adds +50% score multiplier                             |
| **Graze**        | Fly near enemy bullets (without hitting) for +10 points each                                   |
| **Coins**        | Earned from kills, bosses, story clears, and daily milestones; spent on unlocks                |
| **Achievements** | Six goals (first kill, 20× combo, 50 grazes, 10 boss kills lifetime, wave 10, no-damage stage) |
| **High scores**  | Top 10 saved locally with wave and date                                                        |
| **Run stats**    | Game over screen shows accuracy, total damage dealt, and kills for the run                     |
