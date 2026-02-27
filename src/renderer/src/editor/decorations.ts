import { syntaxTree } from '@codemirror/language'
import type { Range } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'

// Dim marker class — makes syntax markers (##, **, `, >) subtle
const dimMark = Decoration.mark({ class: 'cm-md-dim' })

// Heading line decorations
const headingLineDecos: Record<number, Decoration> = {
  1: Decoration.line({ class: 'cm-md-heading1' }),
  2: Decoration.line({ class: 'cm-md-heading2' }),
  3: Decoration.line({ class: 'cm-md-heading3' }),
  4: Decoration.line({ class: 'cm-md-heading4' }),
  5: Decoration.line({ class: 'cm-md-heading5' }),
  6: Decoration.line({ class: 'cm-md-heading6' }),
}

// Inline style marks
const boldMark = Decoration.mark({ class: 'cm-md-bold' })
const italicMark = Decoration.mark({ class: 'cm-md-italic' })
const codeMark = Decoration.mark({ class: 'cm-md-code' })
const blockquoteMark = Decoration.line({ class: 'cm-md-blockquote' })

function buildDecorations(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = []
  const docLen = view.state.doc.length

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        // Guard: syntax tree positions can be stale during rapid input (speech-to-text, IME)
        if (node.from > docLen || node.to > docLen) return

        // ATX Headings — apply line decoration and dim the markers
        if (
          node.name === 'ATXHeading1' ||
          node.name === 'ATXHeading2' ||
          node.name === 'ATXHeading3' ||
          node.name === 'ATXHeading4' ||
          node.name === 'ATXHeading5' ||
          node.name === 'ATXHeading6'
        ) {
          const level = Number(node.name.charAt(node.name.length - 1))
          const lineDeco = headingLineDecos[level]
          if (lineDeco) {
            const line = view.state.doc.lineAt(node.from)
            decos.push(lineDeco.range(line.from))
          }
        }

        // Heading markers (# symbols) — dim them
        if (node.name === 'HeaderMark') {
          decos.push(dimMark.range(node.from, node.to))
        }

        // Bold emphasis markers (**) — dim them
        if (node.name === 'StrongEmphasis') {
          // Find the ** markers at start and end
          const text = view.state.sliceDoc(node.from, node.to)
          const markerLen = text.startsWith('**') ? 2 : 1
          decos.push(dimMark.range(node.from, node.from + markerLen))
          decos.push(dimMark.range(node.to - markerLen, node.to))
          decos.push(boldMark.range(node.from, node.to))
        }

        // Italic emphasis markers (* or _) — dim them
        if (node.name === 'Emphasis') {
          decos.push(dimMark.range(node.from, node.from + 1))
          decos.push(dimMark.range(node.to - 1, node.to))
          decos.push(italicMark.range(node.from, node.to))
        }

        // Inline code — dim backticks, style content
        if (node.name === 'InlineCode') {
          decos.push(codeMark.range(node.from, node.to))
        }

        // Code marks (backticks themselves)
        if (node.name === 'CodeMark') {
          decos.push(dimMark.range(node.from, node.to))
        }

        // Blockquote markers
        if (node.name === 'Blockquote') {
          // Apply line decoration to each line in the blockquote
          const startLine = view.state.doc.lineAt(node.from)
          const endLine = view.state.doc.lineAt(node.to)
          for (let i = startLine.number; i <= endLine.number; i++) {
            const line = view.state.doc.line(i)
            decos.push(blockquoteMark.range(line.from))
          }
        }

        // Quote markers (> character)
        if (node.name === 'QuoteMark') {
          decos.push(dimMark.range(node.from, node.to))
        }
      },
    })
  }

  // Sort by from position — required by RangeSet
  decos.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide)
  return Decoration.set(decos)
}

const decorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations },
)

const decorationStyles = EditorView.baseTheme({
  // Dimmed markers
  '.cm-md-dim': {
    opacity: '0.35',
  },

  // Heading sizes
  '.cm-md-heading1': {
    fontSize: '1.6em',
    lineHeight: '1.4',
  },
  '.cm-md-heading2': {
    fontSize: '1.4em',
    lineHeight: '1.4',
  },
  '.cm-md-heading3': {
    fontSize: '1.2em',
    lineHeight: '1.4',
  },
  '.cm-md-heading4, .cm-md-heading5, .cm-md-heading6': {
    fontSize: '1.05em',
  },

  // Inline styles
  '.cm-md-bold': {
    fontWeight: 'bold',
  },
  '.cm-md-italic': {
    fontStyle: 'italic',
  },
  '.cm-md-code': {
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'color-mix(in srgb, var(--color-bg-overlay) 40%, transparent)',
    padding: '1px var(--spacing-xs)',
    borderRadius: 'var(--radius-sm)',
  },

  // Blockquote
  '.cm-md-blockquote': {
    borderLeft: '3px solid var(--color-border)',
    paddingLeft: 'var(--spacing-md)',
    color: 'var(--color-text-muted)',
  },
})

export function markdownDecorations() {
  return [decorationPlugin, decorationStyles]
}
