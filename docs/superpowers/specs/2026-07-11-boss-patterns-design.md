# Design: Chapter boss attack patterns

**Date:** 2026-07-11  
**Status:** Approved for implementation (approach 1)  
**Branch:** `feature/boss-patterns`

---

## Goal

Give each chapter’s boss a **distinct attack pattern** and a **light visual identity**, so Story bosses (and Endless / Boss Rush / Practice / Daily bosses in that chapter) feel different — not just renamed HP sponges with the same fan shot.

Multi-phase HP, summons, and brand-new enemy types are **out of scope**.

---

## Mapping

| ChapterId  | Story name (existing) | Pattern id  | Attack summary                                        |
| ---------- | --------------------- | ----------- | ----------------------------------------------------- |
| `space`    | Space Commander       | `fan`       | Current aimed 5-way fan (baseline)                    |
| `asteroid` | Mining Rig            | `rain`      | Vertical bullet rain + occasional side sweep          |
| `carrier`  | Carrier Core          | `broadside` | Left/right horizontal volleys + occasional aimed shot |
| `wormhole` | Void Entity           | `ring`      | Expanding ring burst + slow homing pellets            |

Pattern is chosen from **`g.chapterId` at spawn time** (already synced per mode/wave). Story announce names stay as today.

---

## Data model

Add optional field on `Enemy`:

```typescript
bossPattern?: 'fan' | 'rain' | 'broadside' | 'ring';
```

Only set when `type === 'boss'`. Non-boss enemies omit it.

Helper in `modes.ts` or `enemies/boss.ts`:

```typescript
export function bossPatternForChapter(chapterId: ChapterId): BossPatternId;
```

---

## Behavior

### Spawn (`enemies/spawn.ts`)

When spawning a boss:

- Set `bossPattern: bossPatternForChapter(g.chapterId)`
- Optionally tweak `shootInterval` slightly per pattern (e.g. ring a bit slower) — keep HP from `getBossHp` unchanged

### AI (`enemies/ai.ts` or new `enemies/boss-ai.ts`)

Replace the single `if (e.type === 'boss')` fan block with a dispatch on `e.bossPattern` (default `fan` if missing).

| Pattern     | Fire behavior (v1)                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `fan`       | Existing aimed 5-bullet fan                                                                                                                 |
| `rain`      | 4–6 bullets with `vx ≈ 0`, `vy > 0`, spaced across boss width; every Nth shot a left→right or right→left horizontal sweep of 3–4 bullets    |
| `broadside` | Alternate left/right: 3 bullets with mostly horizontal `vx`, slight downward `vy`; every other volley one aimed bullet at the player        |
| `ring`      | 8–10 bullets evenly spaced on a circle, moderate speed outward; every Nth volley 1–2 slow bullets with light `homingStrength` toward player |

Use existing `Bullet` fields (`homingStrength` already exists for player missiles). Enemy homing bullets must remain dodgeable (low turn rate / slow speed).

Keep boss movement as today (enter to y≈100, sine drift).

### Render (`render/enemies.ts`)

Keep the same silhouette; vary **colors / eye glow** by `bossPattern` (or chapter):

| Pattern     | Hull accent (approx) |
| ----------- | -------------------- |
| `fan`       | Current red          |
| `rain`      | Amber / brown        |
| `broadside` | Steel blue           |
| `ring`      | Violet               |

No new sprite assets.

---

## Files (expected)

| File                             | Change                                                      |
| -------------------------------- | ----------------------------------------------------------- |
| `src/game/types.ts`              | `BossPatternId`, optional `bossPattern` on `Enemy`          |
| `src/game/enemies/boss.ts` (new) | `bossPatternForChapter`, maybe pure helpers for ring angles |
| `src/game/enemies/boss.test.ts`  | Chapter → pattern mapping; optional angle helper tests      |
| `src/game/enemies/spawn.ts`      | Set `bossPattern` on boss spawn                             |
| `src/game/enemies/ai.ts`         | Dispatch boss fire by pattern (or import from `boss-ai.ts`) |
| `src/game/render/enemies.ts`     | Color accents by pattern                                    |
| `docs/PLAYER_GUIDE.md`           | Short note under enemies / story bosses                     |
| `.issue/roadmap.md`              | Backlog item for boss patterns → done                       |

Prefer extracting boss fire into `enemies/boss-ai.ts` if `ai.ts` grows awkwardly; otherwise keep dispatch in `ai.ts` with helpers in `boss.ts`.

---

## Acceptance

1. Story stages 5 / 10 / 15 / 20 use fan / rain / broadside / ring respectively (via chapter rotation).
2. Endless / Boss Rush / Practice / Daily bosses in a given chapter use that chapter’s pattern.
3. Each pattern is visually distinguishable in hull accent color.
4. Homing void pellets (if any) do not lock on unfairly (slow + weak turn).
5. `npm run typecheck && npm run test:run` pass.

## Non-goals

- HP phase transitions / enrage
- Spawning minions
- Unique hitboxes per boss
- New audio tracks per boss
