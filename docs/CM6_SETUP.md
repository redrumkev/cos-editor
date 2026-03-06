# COS Editor — CM6 Configuration Reference

> **Origin:** Extracted from the original `cos_editor-spec.md` (pre-kernel, now deleted).
> Treat as implementation reference for Move 10 scaffolding.
> Current execution authority: `~/dev/NEXUS/vision/cos/COS_EDITOR_CRITICAL_PATH.md`.

## Why CM6

Obsidian's fluidity comes from CM6's architecture:

- **Functional, immutable state model** — every keystroke produces a new state via transactions
- **Efficient DOM diffing** — CM6 patches only what changed, no virtual DOM overhead
- **Decorations, not rich text** — markdown is the source of truth, rendered elements are cosmetic
- **Incremental parsing** — Lezer parses only what changed, sub-millisecond even in 10k+ word docs

## Required Extensions

```text
@codemirror/state — core state management
@codemirror/view — editor view and DOM management
@codemirror/lang-markdown — markdown language support (syntax, folding)
@lezer/markdown — incremental markdown parser
@codemirror/language — language infrastructure
@codemirror/commands — standard editing commands
@codemirror/search — search and replace
@codemirror/history — undo/redo (local, separate from version history)
```

## Editor Stack

```text
CodeMirror 6 (core editor)
  +-- @codemirror/lang-markdown (syntax + folding)
  +-- @lezer/markdown (incremental parse tree)
  +-- Custom decorations (live preview rendering):
      |-- Headings: render ## as styled text, show ## on cursor enter
      |-- Bold/italic: render **text** as styled, show markers on cursor
      |-- Links: render [text](url) as clickable, show markdown on cursor
      |-- Images: render ![alt](url) as inline image
      |-- Blockquotes: render > as styled block
      |-- Code blocks: render ``` as highlighted block
      |-- MBQ highlights: custom decoration for linked MBQ references
      +-- Receipt markers: custom decoration for receipt/evidence links
  +-- Custom keybindings:
      |-- Slash commands (/ for agent invocation if desired)
      |-- Standard markdown shortcuts (Cmd+B for bold, etc.)
      +-- Save shortcut (Cmd+S for force-save, bypasses debounce)
```

## Live Preview Technique

The "Obsidian feel" comes from CM6's `Decoration.replace()` and `Decoration.widget()`:

- A heading like `## Title` is decorated so the `##` is hidden and the text is styled larger — until the cursor enters that line, at which point the decoration is removed and you see the raw markdown.
- Bold `**text**` decorates to hide the `**` markers and style the text bold — cursor entering reveals markers.
- This is the standard CM6 ViewPlugin pattern using `DecorationSet` and the `visibleRanges` from the viewport.

## CM6 <-> Buffer IPC Protocol

```ts
// Renderer -> Main (on each transaction)
ipc.send('buffer:update', {
  sectionId: string,
  changes: ChangeSet    // CM6 changeset (not full content)
})

// Main -> Renderer (on section load)
ipc.send('buffer:load', {
  sectionId: string,
  content: string,      // full markdown
  version: number
})

// Main -> Renderer (on agent proposal accept)
ipc.send('buffer:apply-changes', {
  sectionId: string,
  changes: ChangeSet    // the accepted proposal
})

// Agent Pane -> Main (request current content)
ipc.invoke('buffer:get-content', sectionId) -> string

// Agent Pane -> Main (propose changes)
ipc.send('buffer:propose', {
  sectionId: string,
  changes: ChangeSet,
  agentId: string,
  description: string
})
```

## CM6 Isolation Rule

CM6 is imperative and must be isolated from React's DOM management:

- **Separate React roots** — `#editor-root` for CM6, `#app-root` for React panels
- React NEVER touches `#editor-root` DOM
- Communication between CM6 and React panels goes through IPC, not shared state
