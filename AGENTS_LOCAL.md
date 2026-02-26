# COS Editor — Local Agent Rules

## Stack

| Layer | Tool | Version |
|-------|------|---------|
| Runtime | Electron | 39.x |
| Build | electron-vite + Vite | 5.0 + 7.x |
| Framework | React | 19.x |
| Language | TypeScript (strict) | 5.9.x |
| Editor | CodeMirror 6 | 6.x |
| Package Manager | pnpm | 10.x |
| Styling | Tailwind CSS | 4.x |
| Linting | Biome | 2.x |
| Tests (Unit) | Vitest | 3.x |
| Tests (E2E) | Playwright | 1.58+ |

## Architecture

### Two React Roots
- `#root` — React shell (TopBar, StatusBar, SettingsPanel)
- `#editor-root` — CM6 editor (imperative mount, React never touches this DOM)

### Process Model
- **Main process:** cos-client (HTTP), buffer manager, settings store, IPC handlers
- **Preload:** contextBridge typed API (`window.cosEditor`)
- **Renderer:** React shell + CM6 editor

### IPC Contract
All IPC channels defined in `src/shared/ipc.ts` — single source of truth.

### COS Backend Communication
- HTTP to FastAPI at configurable URL (default: `http://localhost:8000`)
- Optimistic concurrency: `expected_head` in request body, hash from ETag response
- 409 = concurrent modification → prompt user to reload or overwrite

## Forbidden Tools

| Forbidden | Use Instead | Enforced By |
|-----------|-------------|-------------|
| npm | pnpm | CLAUDE.md |
| eslint | biome | biome.json |
| prettier | biome | biome.json |
| yarn | pnpm | CLAUDE.md |
| direct Postgres | COS HTTP API | Architecture |

## File Naming

- Components: PascalCase (`TopBar.tsx`, `StatusBar.tsx`)
- Utilities: camelCase (`cos-client.ts`, `buffer.ts`)
- Tests: `*.test.ts` in `tests/unit/` or `tests/e2e/`
- Shared types: `src/shared/` (included in both node and web tsconfigs)
