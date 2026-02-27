import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

// Token mapping (sync with globals.css @theme):
// #1e1e2e -> --color-bg
// #313244 -> --color-bg-surface
// #45475a -> --color-bg-overlay
// #3b3d54 -> --color-bg-hover (closest hover elevation token for overlays)
// #cdd6f4 -> --color-text
// #a6adc8 -> --color-text-muted
// #6c7086 -> --color-text-subtle
// #89b4fa -> --color-accent
// #74c7ec -> --color-accent-hover
// #89dceb -> --color-info
// #a6e3a1 -> --color-success
// #f9e2af -> --color-warning
// #f38ba8 -> --color-error
// #585b70 -> --color-border
// #89b4fa33 / #89b4fa30 / #89b4fa20 -> --color-accent-muted variants
// #f9e2af30 / #f9e2af50 -> --color-warning alpha variants
// #fab387, #cba6f7, #f5c2e7 are currently unmapped semantic accents (consider new tokens in Move 14.2)

const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)',
      height: '100%',
      fontSize: 'var(--text-lg)',
      fontFamily: 'var(--font-mono)',
    },
    '.cm-content': {
      padding: 'var(--spacing-lg) var(--spacing-xl)',
      caretColor: 'var(--color-accent)',
      lineHeight: 'var(--line-height-relaxed)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--color-accent)',
      borderLeftWidth: '2px',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--color-bg-overlay) !important',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--color-bg-surface) 20%, transparent)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-subtle)',
      border: 'none',
      paddingRight: 'var(--spacing-sm)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--color-text-muted)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '3ch',
      textAlign: 'right',
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
    '.cm-searchMatch': {
      backgroundColor: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
      outline: '1px solid color-mix(in srgb, var(--color-warning) 35%, transparent)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'var(--color-accent-muted)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'var(--color-bg-overlay)',
      color: 'var(--color-text-muted)',
      border: 'none',
      padding: '0 var(--spacing-xs)',
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      color: 'var(--color-text)',
    },
    '.cm-panels': {
      backgroundColor: 'var(--color-bg-surface)',
      color: 'var(--color-text)',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid var(--color-border)',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid var(--color-border)',
    },
    '.cm-panel input': {
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
    },
    '.cm-panel button': {
      backgroundColor: 'var(--color-bg-overlay)',
      color: 'var(--color-text)',
    },
    '&.cm-focused': {
      outline: '2px solid var(--color-accent)',
      outlineOffset: '-2px',
    },
  },
  { dark: true },
)

const highlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    color: 'var(--color-error)',
    fontWeight: 'var(--font-weight-bold)',
    fontSize: '1.6em',
  },
  {
    tag: tags.heading2,
    color: 'color-mix(in srgb, var(--color-warning) 65%, var(--color-error) 35%)',
    fontWeight: 'var(--font-weight-bold)',
    fontSize: '1.4em',
  },
  {
    tag: tags.heading3,
    color: 'var(--color-warning)',
    fontWeight: 'var(--font-weight-bold)',
    fontSize: '1.2em',
  },
  { tag: tags.heading4, color: 'var(--color-success)', fontWeight: 'var(--font-weight-bold)' },
  { tag: tags.heading5, color: 'var(--color-accent)', fontWeight: 'var(--font-weight-bold)' },
  {
    tag: tags.heading6,
    color: 'color-mix(in srgb, var(--color-accent) 60%, var(--color-info) 40%)',
    fontWeight: 'var(--font-weight-bold)',
  },
  {
    tag: tags.strong,
    color: 'color-mix(in srgb, var(--color-text) 85%, var(--color-accent) 15%)',
    fontWeight: 'var(--font-weight-bold)',
  },
  {
    tag: tags.emphasis,
    color: 'color-mix(in srgb, var(--color-text) 85%, var(--color-accent) 15%)',
    fontStyle: 'italic',
  },
  {
    tag: tags.strikethrough,
    textDecoration: 'line-through',
    color: 'var(--color-text-subtle)',
  },
  { tag: tags.link, color: 'var(--color-accent)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--color-accent-hover)' },
  { tag: tags.monospace, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' },
  { tag: tags.quote, color: 'var(--color-text-muted)', fontStyle: 'italic' },
  { tag: tags.meta, color: 'var(--color-text-subtle)' },
  { tag: tags.comment, color: 'var(--color-text-subtle)' },
  { tag: tags.processingInstruction, color: 'var(--color-text-subtle)' },
  { tag: tags.contentSeparator, color: 'var(--color-border)' },
])

export function getTheme() {
  return [editorTheme, syntaxHighlighting(highlightStyle)]
}
