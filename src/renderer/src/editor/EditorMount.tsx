import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { getExtensions } from './extensions'

interface EditorMountProps {
  content: string
  loading: boolean
  onChange: (content: string) => void
}

export function EditorMount({ content, loading, onChange }: EditorMountProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const contentRef = useRef(content)
  contentRef.current = content

  // Create editor on mount — uses refs to avoid recreating on every prop change
  useEffect(() => {
    if (!containerRef.current) return
    if (loading) return

    const view = new EditorView({
      state: EditorState.create({
        doc: contentRef.current,
        extensions: getExtensions((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
      }),
      parent: containerRef.current,
    })

    viewRef.current = view
    return () => view.destroy()
  }, [loading])

  // Update content from external source (buffer load)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (loading) return
    const currentContent = view.state.doc.toString()
    if (content !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      })
    }
  }, [content, loading])

  if (loading) {
    return (
      <div className="flex-1 px-8 py-10">
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <div className="h-3 w-11/12 animate-pulse rounded-full bg-bg-overlay" />
          <div className="h-3 w-9/12 animate-pulse rounded-full bg-bg-overlay" />
          <div className="h-3 w-10/12 animate-pulse rounded-full bg-bg-overlay" />
          <div className="h-3 w-7/12 animate-pulse rounded-full bg-bg-overlay" />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto transition-colors duration-[--duration-normal] focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg"
    />
  )
}
