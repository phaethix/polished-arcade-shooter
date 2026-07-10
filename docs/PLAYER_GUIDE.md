# Player Guide

Reference for modes, controls, enemies, and progression in **Sky Blaster**. For product context and release history, see [WHITEPAPER.md](./WHITEPAPER.md).

---

## Game modes

| Mode                | Goal                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Story**           | Clear 20 stages across 4 chapters; defeat chapter bosses and earn a mission-complete ending                                                                                                                    |
| **Endless**         | Survive infinite waves; chapter environments rotate every 5 waves                                                                                                                                              |
| **Boss Rush**       | Fight consecutive bosses with scaling HP — no filler waves                                                                                                                                                     |
| **Daily Challenge** | Same modifier for all players each day (double speed, no power-ups, single HP, or kamikaze swarm); spawns, drops, and hazards also use a calendar-date seed so everyone that day shares the same random stream |

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

| Action    | Keyboard                                    | Touch / Mouse                      |
| --------- | ------------------------------------------- | ---------------------------------- |
| Move      | `WASD` or `Arrow Keys`                      | Drag anywhere                      |
| Shoot     | `Space` or `Z` (hold)                       | Auto-fire while touching           |
| Auto-fire | `F` toggles continuous fire (on by default) | —                                  |
| Bomb      | `X` or `B`                                  | —                                  |
| Skill     | `C` or `Shift`                              | Tap the skill zone (bottom center) |
| Pause     | `Esc` or `P`                                | Tap when paused                    |

### Menu

| Key           | Action                                           |
| ------------- | ------------------------------------------------ |
| `↑` / `↓`     | Cycle game mode                                  |
| `←` / `→`     | Cycle aircraft                                   |
| `[` / `]`     | Cycle weapon                                     |
| `,` / `.`     | Cycle difficulty                                 |
| `U`           | Unlock selected aircraft or weapon (costs coins) |
| `Space` / `Z` | Start game                                       |

**Touch:** tap each menu row to cycle — mode (up/down zones), aircraft, weapon, and difficulty (left/right on the row). Tap **TAP or PRESS SPACE** to start.

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

| Type         | Behavior                       | Base score |
| ------------ | ------------------------------ | ---------- |
| **Basic**    | Standard patterns              | 100        |
| **Fast**     | Quick, erratic movement        | 150        |
| **Tank**     | High HP, slow                  | 300        |
| **Splitter** | Spawns mini enemies on death   | 220        |
| **Sniper**   | Long-range aimed shots         | 350        |
| **Shielded** | Frontal immunity               | 280        |
| **Kamikaze** | Rushes the player and explodes | 180        |
| **Healer**   | Heals nearby enemies           | 400        |
| **Mini**     | Small splitter spawn           | 75         |
| **Boss**     | Boss waves / story milestones  | 2000       |

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
