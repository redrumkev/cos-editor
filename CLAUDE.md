# COS Editor

**Read before ANY action:**

1. `~/dev/NEXUS/AGENTS.md` — Federal constitution
2. This `CLAUDE.md` — Repo-specific rules
3. `AGENTS_LOCAL.md` — Stack, architecture, forbidden tools
4. `~/dev/NEXUS/vision/cos/COS_EDITOR_CRITICAL_PATH.md` — Execution plan
5. `~/dev/NEXUS/vision/cos/cos_editor-spec.md` — System spec
6. `make help` — Available workflows

## Quick Context

COS Editor is an Electron + CM6 desktop editor that talks to COS via HTTP.
- **Epic:** `nexus-whz` | **Current Move:** 10 (Scaffold)
- **Backend:** COS FastAPI at `http://localhost:8000`
- **Dev server:** Port 8007 (Vite HMR)

## Architecture Rules

- CM6 is imperative — React NEVER touches `#editor-root` DOM
- Electron speaks HTTP to COS backend, NEVER direct Postgres
- `expected_head` goes in request BODY (not If-Match header)
- Response hash comes from `ETag` + `X-Content-Hash` headers
- Single buffer constraint: one chapter open at a time (MVP)

## Forbidden Tools

| Forbidden | Use Instead |
|-----------|-------------|
| npm | pnpm |
| eslint | biome |
| prettier | biome |
| yarn | pnpm |
