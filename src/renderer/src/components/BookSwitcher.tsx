import { useCallback, useEffect, useRef, useState } from 'react'
import type { BookRecord } from '../../../shared/cos-types'

interface BookSwitcherProps {
  selectedBook: BookRecord | null
  onSelectBook: (book: BookRecord) => void
  connected: boolean
}

export function BookSwitcher({
  selectedBook,
  onSelectBook,
  connected,
}: BookSwitcherProps): React.JSX.Element {
  const [books, setBooks] = useState<BookRecord[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!connected) {
      setBooks([])
      return
    }
    window.cosEditor.listBooks().then(setBooks).catch(console.error)
  }, [connected])

  const handleSelect = useCallback(
    (book: BookRecord) => {
      onSelectBook(book)
      setOpen(false)
    },
    [onSelectBook],
  )

  if (!connected) {
    return <span className="text-sm text-text-subtle">COS Editor</span>
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text transition-colors"
      >
        <span className="truncate max-w-[200px]">
          {selectedBook ? selectedBook.title : 'Select a book...'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5 shrink-0"
        >
          <title>Toggle book list</title>
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-bg-overlay border border-border rounded shadow-lg z-50 max-h-60 overflow-y-auto">
          {books.length === 0 && (
            <div className="px-3 py-2 text-xs text-text-subtle">No books found</div>
          )}
          {books.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => handleSelect(book)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-surface transition-colors ${
                selectedBook?.id === book.id ? 'text-accent' : 'text-text'
              }`}
            >
              <div className="truncate">{book.title}</div>
              <div className="text-xs text-text-subtle truncate">{book.book_code}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
