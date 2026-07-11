# Design: Co-op Endless via PartyKit

**Date:** 2026-07-11  
**Status:** Implemented  
**Branch:** `feature/coop-endless-partykit`

**Remaining gaps (v1):** Guest active skills are relayed but not applied (host-only). No automated two-client smoke test in CI — manual verify with `party:dev` + two browsers.

---

## Goal

Add **optional 2-player cooperative Endless** so two friends can share one run over the internet, while **solo play stays fully offline** on GitHub Pages with no PartyKit connection.

Pages remains a static client. Realtime needs a small room service — **PartyKit** ([Quickstart](https://docs.partykit.io/quickstart/)), deployed to `*.partykit.dev` without requiring a self-managed VPS or Cloudflare account for v1.

---

## Decisions (locked)

| Topic                   | Choice                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| Mode                    | Cooperative only (not PvP)                                              |
| Join                    | Room code (host creates, guest enters code)                             |
| Simulation authority    | **Host browser** runs `update()`; PartyKit is a dumb relay              |
| Lives / fail            | **Team wipe** — either player's `hp ≤ 0` ends the run                   |
| Modes in v1             | **Co-op Endless only**; all other modes stay solo                       |
| Solo                    | Unchanged; no WebSocket unless Co-op path selected                      |
| Backend                 | PartyKit free Individual deploy (`npx partykit deploy`)                 |
| Cloudflare              | **Not required** for v1; optional later for own account / custom domain |
| Matchmaking             | Out of scope                                                            |
| WebRTC / lockstep       | Out of scope                                                            |
| Guest client prediction | Out of scope in v1 (snapshot render only)                               |
| Player count            | Hard cap **2**                                                          |

---

## Architecture

```text
GitHub Pages (static game)
  ├─ Solo path: existing engine, no network
  └─ Co-op Endless:
        Host browser ──┐
                       ├── wss → PartyKit room (relay only)
        Guest browser ─┘
              │
        Host runs authoritative GameData.update()
        Guest sends input; applies snapshots then render()
```

- **PartyKit** does not simulate combat. It enforces room size, roles (host/guest), and forwards messages.
- **Host** is the single source of truth for enemies, bullets, score, wave, and both players' HP/positions after simulation.

---

## Menu and lobby flow

### Solo (unchanged)

Existing mode / aircraft / weapon / difficulty / start. No PartyKit connect.

### Co-op Endless

Add a distinct menu entry (e.g. game mode **Co-op Endless**, or Endless with Solo/Co-op sub-choice). Recommended: new mode id `coop_endless` so layout stays clear.

| Action  | Behavior                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Host    | Connect to PartyKit → create room with a short alphanumeric **room code** (also the PartyKit room `id`) → show code → wait in lobby |
| Guest   | Enter room code → join Party room with that `id` → lobby                                                                            |
| Loadout | Each player picks aircraft/weapon locally; host's **difficulty** applies to the run                                                 |
| Start   | When **2 players** are in the room, **only host** can start; no separate Ready step in v1                                           |
| Lock    | After start, reject further joins                                                                                                   |

### Disconnect (v1)

| Event                          | Result                                         |
| ------------------------------ | ---------------------------------------------- |
| Host disconnect (lobby or run) | Session ends; guest sees “host disconnected”   |
| Guest disconnect during run    | Run ends (team wipe style; no 1P continuation) |
| Guest disconnect in lobby      | Host returns to waiting for a guest            |

---

## Sync protocol

JSON messages over PartyKit WebSocket (PartySocket on the client).

### Lobby

| Type    | Direction         | Payload (conceptual)                   |
| ------- | ----------------- | -------------------------------------- |
| `hello` | client → room     | `{ role: 'host' \| 'guest', loadout }` |
| `lobby` | room → clients    | `{ players, canStart }`                |
| `start` | host → room → all | `{ difficulty, seed, loadouts }`       |

Room assigns the first connection as host if using host-created room id; guest joins by room id = code.

### In run

| Type       | Direction               | Rate / notes                                                     |
| ---------- | ----------------------- | ---------------------------------------------------------------- |
| `input`    | guest → host (via room) | Throttled; axes/buttons: move, shoot, bomb, skill, pause request |
| `snapshot` | host → guest            | ~10–20 Hz; gameplay state without heavy cosmetics                |
| `gameover` | host → guest            | Team wipe or disconnect reason                                   |

### Snapshot contents (v1)

Include: both players (position, hp, invuln, weapon/power essentials), enemies, bullets, power-ups, wave, score, combo essentials, `state` (`playing` / `paused` / `gameover`).

Omit or minimize: particle arrays, nebulae/stars (guest may keep local ambient or skip).

### Team wipe

On host: if either `player.hp ≤ 0` after collisions, set `state = 'gameover'`, broadcast `gameover` + final snapshot. Shared wave/score; pickups apply to the collector only.

---

## Engine changes (client)

1. **Dual players for co-op only** — e.g. `players: [Player, Player]` or `player` + `player2`; solo keeps single-player code paths.
2. **Input** — host merges local `InputState` for P1 and remote `input` for P2 into `update`.
3. **Collision / hurt** — damage targets the correct ship; either death triggers shared game over.
4. **Guest loop** — while co-op guest: poll/send input; on snapshot, replace renderable state; call `render` only (no combat `update`).
5. **Pause** — host applies pause; guest pause request forwarded as input/event for host to `togglePause`.
6. **Progression** — v1: coins/achievements/high scores follow **host** localStorage only (or disable meta rewards in co-op — prefer **host-only meta** to avoid double-award complexity).

Solo regression: if `gameMode !== 'coop_endless'`, behavior matches pre-co-op build.

---

## Repository layout

```text
polished-arcade-shooter/
  src/                 # existing Vite game (Pages)
  party/
    server.ts          # PartyKit room: cap 2, roles, relay
  partykit.json
```

Client Party URL via `import.meta.env` (dev: `localhost:1999` / PartyKit dev; prod: deployed `*.partykit.dev`).

### Deploy

| Artifact    | How                                                                    |
| ----------- | ---------------------------------------------------------------------- |
| Game        | Existing `pages.yml` → GitHub Pages                                    |
| Room server | `npx partykit deploy` per [docs](https://docs.partykit.io/quickstart/) |

---

## Testing

- Unit: room full rejection, message shape helpers, team-wipe condition.
- Manual: two browsers — create/join, one wave of play, host drop, guest drop.
- CI: existing typecheck/build/tests stay green; Party server typecheck if added to CI later (not blocking v1).

---

## Non-goals (v1)

- Public matchmaking, ranked play, anti-cheat
- Story / Daily / Boss Rush / Practice co-op
- 3+ players, mid-run reconnect / host migration
- Binding Cloudflare account (optional follow-up)
- WebRTC data channels, deterministic lockstep
- Guest-side movement prediction

---

## Success criteria

1. Solo modes playable on Pages with zero PartyKit traffic.
2. Two players can complete (or fail) a Co-op Endless run via room code on PartyKit free deploy.
3. Either ship reaching 0 HP ends the run for both.
4. Host or guest disconnect ends the session with a clear message.
5. No paid VPS required for the documented v1 path.
