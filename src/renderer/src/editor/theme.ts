import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#1e1e2e',
      color: '#cdd6f4',
      height: '100%',
      fontSize: '16px',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    },
    '.cm-content': {
      padding: '16px 24px',
      caretColor: '#89b4fa',
      lineHeight: '1.7',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#89b4fa',
      borderLeftWidth: '2px',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: '#45475a !important',
    },
    '.cm-activeLine': {
      backgroundColor: '#31324420',
    },
    '.cm-gutters': {
      backgroundColor: '#1e1e2e',
      color: '#6c7086',
      border: 'none',
      paddingRight: '8px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#a6adc8',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '3ch',
      textAlign: 'right',
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
    '.cm-searchMatch': {
      backgroundColor: '#f9e2af30',
      outline: '1px solid #f9e2af50',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: '#89b4fa30',
    },
    '.cm-selectionMatch': {
      backgroundColor: '#89b4fa20',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#45475a',
      color: '#a6adc8',
      border: 'none',
      padding: '0 4px',
    },
    '.cm-tooltip': {
      backgroundColor: '#313244',
      border: '1px solid #585b70',
      color: '#cdd6f4',
    },
    '.cm-panels': {
      backgroundColor: '#313244',
      color: '#cdd6f4',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid #585b70',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid #585b70',
    },
    '.cm-panel input': {
      backgroundColor: '#1e1e2e',
      color: '#cdd6f4',
      border: '1px solid #585b70',
    },
    '.cm-panel button': {
      backgroundColor: '#45475a',
      color: '#cdd6f4',
    },
  },
  { dark: true },
)

const highlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#f38ba8', fontWeight: 'bold', fontSize: '1.6em' },
  { tag: tags.heading2, color: '#fab387', fontWeight: 'bold', fontSize: '1.4em' },
  { tag: tags.heading3, color: '#f9e2af', fontWeight: 'bold', fontSize: '1.2em' },
  { tag: tags.heading4, color: '#a6e3a1', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#89b4fa', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#cba6f7', fontWeight: 'bold' },
  { tag: tags.strong, color: '#f5c2e7', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#f5c2e7', fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#6c7086' },
  { tag: tags.link, color: '#89b4fa', textDecoration: 'underline' },
  { tag: tags.url, color: '#74c7ec' },
  { tag: tags.monospace, color: '#a6e3a1', fontFamily: "'JetBrains Mono', monospace" },
  { tag: tags.quote, color: '#a6adc8', fontStyle: 'italic' },
  { tag: tags.meta, color: '#6c7086' },
  { tag: tags.comment, color: '#6c7086' },
  { tag: tags.processingInstruction, color: '#6c7086' },
  { tag: tags.contentSeparator, color: '#585b70' },
])

export function getTheme() {
  return [editorTheme, syntaxHighlighting(highlightStyle)]
}
