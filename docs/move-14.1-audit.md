# Move 14.1 - Screenshot Audit + Design Token Foundation

## Environment notes

- `pnpm dev` failed in this sandbox with `listen EPERM: operation not permitted ::1:8007`.
- Electron e2e launch also failed with `Process failed to launch!` (`pnpm test:e2e`).
- Because of that, live UI screenshots could not be captured in this environment.

## Screenshot/state audit status

Requested states to audit:

- Empty (no book): blocked by runtime constraint above
- Chapter loaded (live mode): blocked (requires running COS + app launch)
- Draft mode: blocked
- Conflict dialog: blocked
- Settings panel: blocked
- Capture panel open/closed: blocked
- Version viewer: blocked
- Disconnected banner: blocked
- Command palette: blocked
- Book switcher dropdown: blocked

Practical fallback used for this move:

- Full static audit of all relevant renderer components and editor theme sources.
- Token-system foundation added in `globals.css` so Move 14.2 can do targeted replacement.

## Design token foundation delivered

File updated: `src/renderer/src/styles/globals.css`

- Existing tokens preserved (no renames).
- Added:
  - Spacing scale: `--spacing-xs ... --spacing-2xl`
  - Typography scale: `--text-xs ... --text-2xl`, font weights, line heights
  - Border radii: `--radius-sm ... --radius-full`
  - Shadows: `--shadow-sm ... --shadow-xl`
  - Transitions: durations + easing curves
  - Missing Catppuccin tokens:
    - `--color-bg-hover: #3b3d54`
    - `--color-accent-muted: #89b4fa33`
    - `--color-info: #89dceb`

## Hardcoded usage audit (do not fix in Move 14.1)

### Raw hex outside `globals.css` and `editor/theme.ts`

- `src/renderer/src/editor/decorations.ts:169` `borderLeft: '3px solid #585b70'`
- `src/renderer/src/editor/decorations.ts:171` `color: '#a6adc8'`

### Hardcoded sizing/spacing values that should move to tokens/utilities

- `src/renderer/src/components/SettingsPanel.tsx:58` `w-[420px] max-w-[90vw]`
- `src/renderer/src/components/ConflictDialog.tsx:27` `w-[420px] p-5`
- `src/renderer/src/components/CommandPalette.tsx:118` `pt-[20vh]`
- `src/renderer/src/components/CommandPalette.tsx:124` `w-[480px] max-h-[60vh]`
- `src/renderer/src/components/VersionViewer.tsx:36` `w-[400px]`
- `src/renderer/src/components/LeftPane.tsx:37` `min-w-[180px]`
- `src/renderer/src/components/StatusBar.tsx:38` `max-w-[200px]`
- `src/renderer/src/components/BookSwitcher.tsx:70` `max-w-[200px]`

### Border radius inconsistency hotspots

- Inline style radius in editor decorations:
  - `src/renderer/src/editor/decorations.ts:164` `borderRadius: '3px'`
- Mixed utility radii (`rounded`, `rounded-lg`) across overlays and controls:
  - `SettingsPanel`, `ConflictDialog`, `CommandPalette`, `TopBar`, `CapturePanel`, `VersionViewer`, `BookSwitcher`

### Missing/weak focus states (UI interaction standard gap)

Per `UI_INTERACTION_STANDARD.md`, keyboard focus visibility should be explicit.

- Multiple buttons currently rely on hover but do not provide clear `focus-visible` ring treatments:
  - `TopBar.tsx`, `VersionViewer.tsx`, `ConflictDialog.tsx`, `ChangesView.tsx`, `StructureTree.tsx`, `BookSwitcher.tsx`, `CapturePanel.tsx`
- Inputs with `outline-none` and no replacement ring:
  - `CommandPalette.tsx` input
- Command palette options use clickable `div` rows with `tabIndex={-1}`:
  - `CommandPalette.tsx` option rows

## CM6 theme sync prep (added in file)

File updated: `src/renderer/src/editor/theme.ts`

- Added top-of-file token mapping comment between CM6 hardcoded hex values and `globals.css` tokens.
- Mapping includes direct palette entries and alpha-variant guidance (accent/warning/surface translucent uses).
- Noted currently unmapped Catppuccin accents (`#fab387`, `#cba6f7`, `#f5c2e7`) for possible token expansion in Move 14.2.

