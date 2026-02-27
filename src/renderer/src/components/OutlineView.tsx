interface OutlineViewProps {
  content: string | null
}

interface HeadingEntry {
  level: number
  text: string
}

function parseHeadings(content: string): HeadingEntry[] {
  const headings: HeadingEntry[] = []
  const regex = /^(#{1,6})\s+(.+)$/gm
  let match = regex.exec(content)
  while (match) {
    headings.push({ level: match[1].length, text: match[2] })
    match = regex.exec(content)
  }
  return headings
}

const indentClass: Record<number, string> = {
  1: 'pl-0',
  2: 'pl-3',
  3: 'pl-6',
  4: 'pl-9',
  5: 'pl-12',
  6: 'pl-15',
}

export function OutlineView({ content }: OutlineViewProps): React.JSX.Element {
  if (content === null) {
    return <div className="px-3 py-4 text-sm text-text-subtle">No chapter open</div>
  }

  const headings = parseHeadings(content)

  if (headings.length === 0) {
    return <div className="px-3 py-4 text-sm text-text-subtle">No headings</div>
  }

  return (
    <div className="py-1 overflow-y-auto flex-1 scrollbar-thin">
      {headings.map((h, i) => (
        <div
          key={`${h.level}-${h.text}-${i}`}
          className={`px-2 py-1 text-sm text-text-muted truncate ${indentClass[h.level] ?? 'pl-0'}`}
        >
          {h.text}
        </div>
      ))}
    </div>
  )
}
