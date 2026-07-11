# Co-op Endless (PartyKit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Implemented (Tasks 1–10 on `feature/coop-endless-partykit`). Remaining gaps: guest skills host-only; no live co-op smoke in CI.

**Goal:** Optional 2-player cooperative Endless over PartyKit room codes, while solo modes stay fully offline on GitHub Pages.

**Architecture:** Host browser runs authoritative `update()`; PartyKit room only caps at 2 players and relays JSON (`lobby` / `input` / `snapshot` / `gameover`). Guest sends input and renders snapshots. Solo never opens a WebSocket.

**Tech Stack:** TypeScript, Vite/React client, Vitest, PartyKit (`partykit` + `partysocket`), existing Canvas engine.

**Spec:** `docs/superpowers/specs/2026-07-11-coop-partykit-design.md`

---

## File map

| File                                    | Responsibility                                      |
| --------------------------------------- | --------------------------------------------------- |
| `src/net/protocol.ts`                   | Shared message types + parse/serialize helpers      |
| `src/net/protocol.test.ts`              | Protocol unit tests                                 |
| `src/net/room-code.ts`                  | Generate / validate short room codes                |
| `src/net/room-code.test.ts`             | Room-code unit tests                                |
| `src/net/snapshot.ts`                   | Build/apply host→guest snapshots                    |
| `src/net/snapshot.test.ts`              | Snapshot round-trip tests                           |
| `src/net/coop-session.ts`               | PartySocket client: connect, send, handlers         |
| `party/server.ts`                       | PartyKit room: join cap, role, relay                |
| `partykit.json`                         | PartyKit project config                             |
| `src/game/types.ts`                     | `coop_endless` mode; `player2`; coop session fields |
| `src/game/modes.ts`                     | Mode order/info; treat coop like endless for waves  |
| `src/game/modes.test.ts`                | Coop mode helpers                                   |
| `src/game/coop.ts`                      | `isCoopMode`, `activePlayers`, team-wipe helper     |
| `src/game/coop.test.ts`                 | Team-wipe / activePlayers tests                     |
| `src/game/combat.ts`                    | `hurtPlayer(g, player)` + team wipe                 |
| `src/game/systems/collision-system.ts`  | Collide both ships in coop                          |
| `src/game/systems/player-controller.ts` | Update both players from two inputs                 |
| `src/game/systems/power-up-system.ts`   | Either ship can collect                             |
| `src/game/engine.ts`                    | Coop reset / start from lobby payload               |
| `src/game/render/*`                     | Draw P2; lobby UI strings                           |
| `src/game/render/menu-layout.ts`        | Host / Join / room-code rows when coop              |
| `src/app/use-game-loop.ts`              | Host snapshot tick; guest apply-only path           |
| `src/app/use-keyboard-input.ts`         | Coop menu actions (host/join/start)                 |
| `src/App.tsx`                           | Wire session ref if needed                          |
| `.env.example`                          | `VITE_PARTYKIT_HOST`                                |
| `package.json`                          | `partykit`, `partysocket` deps + scripts            |
| `docs/PLAYER_GUIDE.md`                  | Co-op controls / room flow                          |
| `README.md`                             | PartyKit deploy note                                |
| Spec status → Implemented               | After verify                                        |

---

### Task 1: Room codes (TDD)

**Files:**

- Create: `src/net/room-code.ts`
- Create: `src/net/room-code.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './room-code';

describe('room-code', () => {
  it('generates 6-char uppercase alphanumeric codes', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('normalizes lowercase input', () => {
    expect(normalizeRoomCode('ab12cd')).toBe('AB12CD');
  });

  it('rejects invalid codes', () => {
    expect(isValidRoomCode('')).toBe(false);
    expect(isValidRoomCode('SHORT')).toBe(false);
    expect(isValidRoomCode('TOOLONG1')).toBe(false);
    expect(isValidRoomCode('AB12CD')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/net/room-code.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```typescript
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

export function generateRoomCode(length = 6): string {
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidRoomCode(raw: string): boolean {
  const code = normalizeRoomCode(raw);
  return /^[A-Z0-9]{6}$/.test(code);
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:run -- src/net/room-code.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/net/room-code.ts src/net/room-code.test.ts
git commit -m "feat(net): add coop room code helpers"
```

---

### Task 2: Wire protocol types (TDD)

**Files:**

- Create: `src/net/protocol.ts`
- Create: `src/net/protocol.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { parseNetMessage, type NetMessage } from './protocol';

describe('protocol', () => {
  it('parses a valid input message', () => {
    const raw = JSON.stringify({
      type: 'input',
      left: true,
      right: false,
      up: false,
      down: false,
      shoot: true,
      bomb: false,
      skill: false,
      pause: false,
    });
    const msg = parseNetMessage(raw);
    expect(msg?.type).toBe('input');
    if (msg?.type === 'input') expect(msg.shoot).toBe(true);
  });

  it('returns null for garbage', () => {
    expect(parseNetMessage('{')).toBeNull();
    expect(parseNetMessage(JSON.stringify({ type: 'nope' }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:run -- src/net/protocol.test.ts`

- [ ] **Step 3: Implement message union**

```typescript
import type { AircraftId, Difficulty, WeaponId } from '../game/types';

export interface LoadoutWire {
  aircraftId: AircraftId;
  weaponId: WeaponId;
}

export type NetMessage =
  | { type: 'hello'; role: 'host' | 'guest'; loadout: LoadoutWire }
  | {
      type: 'lobby';
      hostPresent: boolean;
      guestPresent: boolean;
      canStart: boolean;
      hostLoadout?: LoadoutWire;
      guestLoadout?: LoadoutWire;
    }
  | {
      type: 'start';
      difficulty: Difficulty;
      seed: number;
      hostLoadout: LoadoutWire;
      guestLoadout: LoadoutWire;
    }
  | {
      type: 'input';
      left: boolean;
      right: boolean;
      up: boolean;
      down: boolean;
      shoot: boolean;
      bomb: boolean;
      skill: boolean;
      pause: boolean;
    }
  | { type: 'snapshot'; payload: unknown } // narrowed in snapshot.ts
  | { type: 'gameover'; reason: 'team_wipe' | 'host_left' | 'guest_left' }
  | { type: 'error'; message: string };

export function parseNetMessage(raw: string): NetMessage | null {
  try {
    const data = JSON.parse(raw) as { type?: string };
    if (!data || typeof data.type !== 'string') return null;
    switch (data.type) {
      case 'hello':
      case 'lobby':
      case 'start':
      case 'input':
      case 'snapshot':
      case 'gameover':
      case 'error':
        return data as NetMessage;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function encodeNetMessage(msg: NetMessage): string {
  return JSON.stringify(msg);
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/net/protocol.ts src/net/protocol.test.ts
git commit -m "feat(net): add coop partykit message protocol"
```

---

### Task 3: PartyKit room server

**Files:**

- Create: `party/server.ts`
- Create: `partykit.json`
- Modify: `package.json` (deps + scripts)

- [ ] **Step 1: Install deps**

```bash
npm install partysocket
npm install -D partykit
```

- [ ] **Step 2: Add `partykit.json`**

```json
{
  "name": "sky-blaster-coop",
  "main": "party/server.ts",
  "compatibilityDate": "2024-04-01"
}
```

- [ ] **Step 3: Implement relay server**

```typescript
import type * as Party from 'partykit/server';

interface ConnMeta {
  role: 'host' | 'guest' | null;
}

export default class CoopRoom implements Party.Server {
  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext): void {
    const count = [...this.room.getConnections()].length;
    if (count > 2) {
      conn.send(JSON.stringify({ type: 'error', message: 'room_full' }));
      conn.close();
      return;
    }
    (conn as Party.Connection & { meta?: ConnMeta }).meta = { role: null };
    this.broadcastLobby();
  }

  onClose(_conn: Party.Connection): void {
    this.broadcastLobby();
    // Clients interpret missing host/guest; host may send gameover locally.
  }

  onMessage(message: string, sender: Party.Connection): void {
    let data: { type?: string; role?: 'host' | 'guest' };
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    if (data.type === 'hello' && (data.role === 'host' || data.role === 'guest')) {
      const meta = (sender as Party.Connection & { meta?: ConnMeta }).meta;
      if (meta) meta.role = data.role;
      // Enforce single host / single guest
      for (const c of this.room.getConnections()) {
        if (c.id === sender.id) continue;
        const other = (c as Party.Connection & { meta?: ConnMeta }).meta;
        if (other?.role === data.role) {
          sender.send(JSON.stringify({ type: 'error', message: 'role_taken' }));
          return;
        }
      }
      this.broadcastLobby();
      return;
    }

    // Relay start / input / snapshot / gameover to others
    if (
      data.type === 'start' ||
      data.type === 'input' ||
      data.type === 'snapshot' ||
      data.type === 'gameover' ||
      data.type === 'hello'
    ) {
      for (const c of this.room.getConnections()) {
        if (c.id !== sender.id) c.send(message);
      }
      if (data.type === 'hello') this.broadcastLobby();
    }
  }

  broadcastLobby(): void {
    let hostPresent = false;
    let guestPresent = false;
    for (const c of this.room.getConnections()) {
      const role = (c as Party.Connection & { meta?: ConnMeta }).meta?.role;
      if (role === 'host') hostPresent = true;
      if (role === 'guest') guestPresent = true;
    }
    const lobby = JSON.stringify({
      type: 'lobby',
      hostPresent,
      guestPresent,
      canStart: hostPresent && guestPresent,
    });
    for (const c of this.room.getConnections()) c.send(lobby);
  }
}

CoopRoom satisfies Party.Worker;
```

Refine against current PartyKit `Party.Server` typings from installed package if signatures differ (use official Quickstart class shape).

- [ ] **Step 4: Add scripts to `package.json`**

```json
"party:dev": "partykit dev",
"party:deploy": "partykit deploy"
```

- [ ] **Step 5: Smoke-test locally**

Run: `npx partykit dev`  
Expected: server listens (default port 1999); no crash.

- [ ] **Step 6: Commit**

```bash
git add party/server.ts partykit.json package.json package-lock.json
git commit -m "feat(party): add coop room relay server"
```

---

### Task 4: `coop_endless` mode (solo still works)

**Files:**

- Modify: `src/game/types.ts` (`GameMode` union)
- Modify: `src/game/modes.ts` (`MODE_ORDER`, `MODE_INFO`, wave helpers treat like `endless`)
- Modify: `src/game/modes.test.ts`
- Create: `src/game/coop.ts`
- Create: `src/game/coop.test.ts`

- [ ] **Step 1: Failing tests for coop helpers**

```typescript
import { describe, it, expect } from 'vitest';
import { createGameData } from './engine';
import { isCoopMode, activePlayers, shouldTeamWipe } from './coop';
import { createPlayer } from './player-factory';

describe('coop', () => {
  it('isCoopMode detects coop_endless', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    expect(isCoopMode(g)).toBe(true);
  });

  it('activePlayers returns one ship in solo', () => {
    const g = createGameData();
    expect(activePlayers(g)).toHaveLength(1);
  });

  it('shouldTeamWipe when either hp is 0 in coop', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.player2 = createPlayer('phantom');
    g.player.hp = 1;
    g.player2.hp = 0;
    expect(shouldTeamWipe(g)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Extend types + modes + coop helpers**

In `types.ts`:

```typescript
export type GameMode = 'story' | 'endless' | 'boss_rush' | 'daily' | 'practice' | 'coop_endless';

// On GameData:
player2: Player | null;
coopRole: 'host' | 'guest' | null;
coopRoomCode: string;
```

In `modes.ts` add to `MODE_ORDER` / `MODE_INFO`:

```typescript
coop_endless: { name: 'Co-op Endless', tagline: '2P · room code · team wipe' },
```

Wave/chapter helpers: treat `coop_endless` like `endless` (same branches as `endless`).

```typescript
// src/game/coop.ts
import type { GameData, Player } from './types';

export function isCoopMode(g: GameData): boolean {
  return g.gameMode === 'coop_endless';
}

export function activePlayers(g: GameData): Player[] {
  return g.player2 ? [g.player, g.player2] : [g.player];
}

export function shouldTeamWipe(g: GameData): boolean {
  if (!isCoopMode(g) || !g.player2) return g.player.hp <= 0;
  return g.player.hp <= 0 || g.player2.hp <= 0;
}
```

Initialize `player2: null`, `coopRole: null`, `coopRoomCode: ''` in `createGameData`.

- [ ] **Step 4: Run modes + coop tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/modes.ts src/game/modes.test.ts src/game/coop.ts src/game/coop.test.ts src/game/engine.ts
git commit -m "feat(game): add coop_endless mode and player2 slot"
```

---

### Task 5: Dual-ship combat + team wipe (TDD)

**Files:**

- Modify: `src/game/combat.ts` (`hurtPlayer`, `killPlayer`, `playerHitFromEnemy`)
- Modify: `src/game/systems/collision-system.ts`
- Modify: `src/game/systems/power-up-system.ts`
- Modify: `src/game/systems/player-controller.ts`
- Modify: `src/game/hazards.ts` (if needed for dual targets)
- Test: `src/game/coop.test.ts` (extend) or `src/game/combat.coop.test.ts`

- [ ] **Step 1: Write failing test — hurting P2 to 0 triggers gameover in coop**

```typescript
import { describe, it, expect } from 'vitest';
import { createGameData } from './engine';
import { createPlayer } from './player-factory';
import { hurtPlayer } from './combat';

describe('coop hurt', () => {
  it('team-wipes when player2 reaches 0 hp', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.state = 'playing';
    g.player2 = createPlayer('fortress');
    g.player2.hp = 1;
    g.player2.invincibleTimer = 0;
    hurtPlayer(g, g.player2);
    expect(g.player2.hp).toBe(0);
    expect(g.state).toBe('gameover');
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (signature / behavior)

- [ ] **Step 3: Change `hurtPlayer` to accept target player**

```typescript
export function hurtPlayer(g: GameData, target: Player = g.player): void {
  if (isPracticeInvincible(g)) return;
  g.waveDamageTaken = true;
  target.hp--;
  target.invincibleTimer = 2;
  // particles/shake at target.x/y
  if (isCoopMode(g)) {
    if (shouldTeamWipe(g)) killPlayer(g, target);
  } else if (target.hp <= 0) {
    killPlayer(g, target);
  }
}
```

Update all call sites: enemy body / bullet / hazard must resolve **which** ship was hit (loop `activePlayers`, test AABB per ship). Solo: only `g.player` as today.

`player-controller`: if coop host, call movement/shoot for `g.player` with local input and `g.player2` with remote `InputState` stored on `g` or session (e.g. `g.coopGuestInput`).

Add to `GameData`:

```typescript
coopGuestInput: InputState; // host fills from net; unused in solo
```

- [ ] **Step 4: Power-ups — first overlapping ship among `activePlayers` collects**

- [ ] **Step 5: Run tests + `npm run typecheck`**

- [ ] **Step 6: Commit**

```bash
git add src/game/combat.ts src/game/systems/collision-system.ts src/game/systems/power-up-system.ts src/game/systems/player-controller.ts src/game/hazards.ts src/game/coop.test.ts
git commit -m "feat(game): dual-ship collisions and coop team wipe"
```

---

### Task 6: Snapshot build / apply (TDD)

**Files:**

- Create: `src/net/snapshot.ts`
- Create: `src/net/snapshot.test.ts`

- [ ] **Step 1: Failing round-trip test**

```typescript
import { describe, it, expect } from 'vitest';
import { createGameData } from '../game/engine';
import { createPlayer } from '../game/player-factory';
import { buildSnapshot, applySnapshot } from './snapshot';

describe('snapshot', () => {
  it('round-trips players enemies bullets score wave state', () => {
    const host = createGameData();
    host.gameMode = 'coop_endless';
    host.state = 'playing';
    host.player2 = createPlayer('phantom');
    host.score = 42;
    host.wave = 3;
    host.enemies = [
      {
        x: 10,
        y: 20,
        width: 30,
        height: 30,
        hp: 2,
        maxHp: 2,
        speed: 1,
        type: 'basic',
        shootTimer: 0,
        shootInterval: 1,
        movePattern: 'straight',
        movePhase: 0,
        scoreValue: 100,
        flashTimer: 0,
      },
    ];
    const snap = buildSnapshot(host);
    const guest = createGameData();
    guest.gameMode = 'coop_endless';
    guest.player2 = createPlayer('phantom');
    applySnapshot(guest, snap);
    expect(guest.score).toBe(42);
    expect(guest.wave).toBe(3);
    expect(guest.enemies).toHaveLength(1);
    expect(guest.player.x).toBe(host.player.x);
    expect(guest.player2?.hp).toBe(host.player2.hp);
  });
});
```

- [ ] **Step 2: Implement `buildSnapshot` / `applySnapshot`**

Omit particles/stars/nebulae. Include both players’ gameplay fields, bullets, enemies, powerUps, score, wave, combo, state, slowMotion.

- [ ] **Step 3: Run — expect PASS**

- [ ] **Step 4: Commit**

```bash
git add src/net/snapshot.ts src/net/snapshot.test.ts
git commit -m "feat(net): coop host snapshot serialize and apply"
```

---

### Task 7: Coop session client

**Files:**

- Create: `src/net/coop-session.ts`
- Create: `.env.example`

- [ ] **Step 1: Implement `CoopSession`**

```typescript
import PartySocket from 'partysocket';
import { encodeNetMessage, parseNetMessage, type NetMessage, type LoadoutWire } from './protocol';

export type CoopSessionHandlers = {
  onMessage: (msg: NetMessage) => void;
  onClose: () => void;
};

export function getPartyHost(): string {
  return import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999';
}

export class CoopSession {
  private socket: PartySocket | null = null;

  connect(roomCode: string, handlers: CoopSessionHandlers): void {
    this.disconnect();
    this.socket = new PartySocket({
      host: getPartyHost(),
      room: roomCode,
    });
    this.socket.addEventListener('message', (ev) => {
      const msg = parseNetMessage(String(ev.data));
      if (msg) handlers.onMessage(msg);
    });
    this.socket.addEventListener('close', () => handlers.onClose());
  }

  send(msg: NetMessage): void {
    this.socket?.send(encodeNetMessage(msg));
  }

  sendHello(role: 'host' | 'guest', loadout: LoadoutWire): void {
    this.send({ type: 'hello', role, loadout });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }
}
```

`.env.example`:

```bash
# PartyKit host (no protocol). Dev: localhost:1999  Prod: <name>.<user>.partykit.dev
VITE_PARTYKIT_HOST=localhost:1999
```

- [ ] **Step 2: Commit**

```bash
git add src/net/coop-session.ts .env.example
git commit -m "feat(net): add partysocket coop session client"
```

---

### Task 8: Menu lobby UX (host / join / code)

**Files:**

- Modify: `src/game/render/menu-layout.ts` — when `gameMode === 'coop_endless'`, show Host/Join row + room code display/entry affordance
- Modify: `src/game/render/menu.ts` — draw lobby status (`WAITING`, code, `CAN START`)
- Modify: `src/app/use-keyboard-input.ts` — keys: e.g. `H` host, `J` join+prompt or cycle host/join; room code entry via temporary `window.prompt` in v1 OR digit keys (prefer **prompt for guest code** to avoid huge menu rewrite)
- Modify: `src/app/menu-touch.ts` — touch targets for host/join/start

**v1 UX (locked for speed):**

1. Select **Co-op Endless**.
2. Press **H** → generate code, `CoopSession.connect`, `hello` as host, show code on menu.
3. Press **J** → `prompt('Room code')`, validate, connect as guest, `hello`.
4. When `lobby.canStart`, host presses **Space** → send `start` with difficulty/seed/loadouts; both call coop `resetGame`.

- [ ] **Step 1: Implement keyboard host/join/start wiring in `use-keyboard-input.ts` holding a module or React-ref `CoopSession`**

Prefer storing session on `App` / ref passed into hooks (match existing `gameRef` pattern).

- [ ] **Step 2: Manual check — two browser windows can show lobby `canStart` with `partykit dev`**

- [ ] **Step 3: Commit**

```bash
git add src/game/render/menu-layout.ts src/game/render/menu.ts src/app/use-keyboard-input.ts src/app/menu-touch.ts src/App.tsx
git commit -m "feat(ui): coop endless host join lobby flow"
```

---

### Task 9: Host / guest game loops

**Files:**

- Modify: `src/app/use-game-loop.ts`
- Modify: `src/game/engine.ts` (`resetCoopGame` from `start` payload)
- Modify: `src/game/render/world.ts` / `hud.ts` — draw second ship + dual HP

- [ ] **Step 1: Host path**

When `coopRole === 'host'` and `state === 'playing'`:

1. Apply latest guest `input` into `g.coopGuestInput`.
2. `update(g, localInput, dt)` (controller uses both inputs).
3. Every N frames (~3 at 60fps ≈ 20Hz) `session.send({ type: 'snapshot', payload: buildSnapshot(g) })`.
4. On team wipe / gameover: `session.send({ type: 'gameover', reason: 'team_wipe' })`.

- [ ] **Step 2: Guest path**

When `coopRole === 'guest'` and playing:

1. Each frame encode local input → `session.send({ type: 'input', ... })` (throttle bomb/skill edges).
2. On snapshot message → `applySnapshot(g, payload)`.
3. Skip combat `update`; still allow `updateBackground` cosmetics if desired.
4. `render` as normal.

- [ ] **Step 3: Disconnect**

- Host socket close → guest sets gameover + message reason `host_left`.
- Guest close during run → host `gameover` reason `guest_left`.

- [ ] **Step 4: Meta** — wrap `awardRunCoins` / `saveHighScore` so only host persists in coop (`if (isCoopMode(g) && g.coopRole !== 'host') return` early in those paths).

- [ ] \*\*Step 5: `npm run typecheck` && `npm run test:run`

- [ ] **Step 6: Commit**

```bash
git add src/app/use-game-loop.ts src/game/engine.ts src/game/render/world.ts src/game/render/hud.ts src/game/run-progress.ts src/game/combat.ts
git commit -m "feat(game): host authoritative coop loop and guest snapshot render"
```

---

### Task 10: Docs + deploy smoke

**Files:**

- Modify: `docs/PLAYER_GUIDE.md`
- Modify: `README.md` (PartyKit `party:dev` / `party:deploy`, `VITE_PARTYKIT_HOST`)
- Modify: `.issue/2026-07-07-roadmap.md` (optional backlog row for co-op)
- Modify: `docs/superpowers/specs/2026-07-11-coop-partykit-design.md` status → Implemented (after manual verify)

- [ ] **Step 1: Document co-op**

PLAYER_GUIDE: Co-op Endless, H/J/Space, team wipe, PartyKit required for co-op only.

README:

```bash
npm run party:dev   # terminal 1
npm run dev         # terminal 2, VITE_PARTYKIT_HOST=localhost:1999
```

Deploy room: `npm run party:deploy` then set Pages env / bake host into production build.

- [ ] **Step 2: Manual test checklist**

1. Solo Endless — no network errors in console.
2. Host+guest one wave, both ships move/shoot.
3. Kill P1 or P2 → both see gameover.
4. Close host tab → guest notified.
5. Third join → `room_full`.

- [ ] **Step 3: Commit**

```bash
git add docs/PLAYER_GUIDE.md README.md .issue/2026-07-07-roadmap.md docs/superpowers/specs/2026-07-11-coop-partykit-design.md
git commit -m "docs: document coop endless partykit play and deploy"
```

---

## Spec coverage checklist

| Spec item              | Task                             |
| ---------------------- | -------------------------------- |
| Solo offline           | Task 4/9 (no socket unless coop) |
| Room codes             | Task 1, 8                        |
| PartyKit relay, cap 2  | Task 3                           |
| Host authority         | Task 9                           |
| Team wipe              | Task 5                           |
| Co-op Endless only     | Task 4                           |
| Snapshot ~10–20Hz      | Task 6, 9                        |
| Host-only meta         | Task 9                           |
| Docs / deploy          | Task 10                          |
| No Cloudflare required | Task 3/10 (partykit.dev)         |

---

## Execution notes

- Prefer feature branch `feature/coop-endless-partykit` from latest `main`.
- Keep commits conventional + lower-case subjects.
- If PartyKit Server API typings differ from Task 3 snippet, follow installed `partykit` types / [Quickstart](https://docs.partykit.io/quickstart/) — behavior (cap 2 + relay) must remain.
