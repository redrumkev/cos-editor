import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  type ViewUpdate,
} from '@codemirror/view'
import { markdownDecorations } from './decorations'
import { getTheme } from './theme'

export function getExtensions(onChange: (update: ViewUpdate) => void) {
  return [
    // Markdown language support
    markdown({ base: markdownLanguage }),

    // Editor features
    history(),
    drawSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    bracketMatching(),
    closeBrackets(),
    lineNumbers(),

    // Syntax highlighting
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

    // Keymaps
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...closeBracketsKeymap]),

    // Theme
    getTheme(),

    // Live preview decorations
    markdownDecorations(),

    // Change listener
    EditorView.updateListener.of(onChange),

    // Editor config
    EditorView.lineWrapping,
  ]
}
