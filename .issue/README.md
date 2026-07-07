# Internal Planning (`.issue`)

This directory tracks **design specs and implementation plans** for upcoming game features.

## Why `.issue`?

GitHub's standard workflow uses [GitHub Issues](https://docs.github.com/en/issues) and [Discussions](https://docs.github.com/en/discussions) for public planning. This `.issue` folder is a **repository-local supplement**:

- Keeps detailed design docs versioned alongside code
- Breaks large features into reviewable, incremental tasks
- Links each spec to a phased rollout in `roadmap.md`

When a feature ships, its issue file should be updated with status (`planned` → `in progress` → `done`).

## For contributors

1. Read `roadmap.md` for the overall sequence
2. Pick the next `planned` item in the current phase
3. Keep commits small and single-purpose (see `docs/GIT_CONVENTIONS.md`)
4. Prefer opening a GitHub Issue for bugs or public discussion

## File naming

```text
.issue/
├── README.md           # This file
├── roadmap.md          # Phased rollout plan
├── 001-aircraft.md     # Feature spec
├── 002-chapters.md
└── ...
```
