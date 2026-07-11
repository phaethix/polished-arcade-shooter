# Internal Planning (`.issue`)

This directory tracks **design specs and implementation plans** for upcoming game features.

## Why `.issue`?

GitHub's standard workflow uses [GitHub Issues](https://docs.github.com/en/issues) and [Discussions](https://docs.github.com/en/discussions) for public planning. This `.issue` folder is a **repository-local supplement**:

- Keeps detailed design docs versioned alongside code
- Breaks large features into reviewable, incremental tasks
- Links each spec to a phased rollout in `2026-07-07-roadmap.md`

When a feature ships, its issue file should be updated with status (`planned` → `in progress` → `done`).

## For contributors

1. Read `2026-07-07-roadmap.md` for the overall sequence
2. Pick the next `planned` item in the current phase
3. Keep commits small and single-purpose (see `docs/GIT_CONVENTIONS.md`)
4. Prefer opening a GitHub Issue for bugs or public discussion

## File naming

Use the same date-prefix convention as `docs/superpowers/specs/`:

```text
YYYY-MM-DD-<topic>.md
```

The date is the file’s creation day (when the doc was first added). Keep `README.md` as the directory index.

```text
.issue/
├── README.md
├── 2026-07-07-roadmap.md
├── 2026-07-07-aircraft.md
├── 2026-07-07-chapters.md
└── ...
```
