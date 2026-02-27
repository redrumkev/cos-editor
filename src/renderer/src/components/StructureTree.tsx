import { useMemo, useState } from 'react'
import type { ManuscriptStructure, SectionType } from '../../../shared/cos-types'

interface StructureTreeProps {
  manuscript: ManuscriptStructure | null
  bufferState: { section: string; slug: string; dirty: boolean } | null
  onSelectChapter: (section: SectionType, slug: string) => void
}

interface SectionGroupProps {
  label: string
  sectionType: SectionType
  chapters: { slug: string; title: string }[]
  activeSection: string | null
  activeSlug: string | null
  dirty: boolean
  onSelect: (section: SectionType, slug: string) => void
}

const VIRTUALIZE_THRESHOLD = 100
const VISIBLE_SLICE_SIZE = 60

function SectionGroup({
  label,
  sectionType,
  chapters,
  activeSection,
  activeSlug,
  dirty,
  onSelect,
}: SectionGroupProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const [sliceStart, setSliceStart] = useState(0)

  const shouldVirtualize = chapters.length > VIRTUALIZE_THRESHOLD

  const visibleChapters = useMemo(() => {
    if (!shouldVirtualize) return chapters
    return chapters.slice(sliceStart, sliceStart + VISIBLE_SLICE_SIZE)
  }, [chapters, shouldVirtualize, sliceStart])

  const handleScroll = useMemo(() => {
    if (!shouldVirtualize) return undefined
    return (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const scrollRatio = el.scrollTop / (el.scrollHeight - el.clientHeight || 1)
      const maxStart = Math.max(0, chapters.length - VISIBLE_SLICE_SIZE)
      setSliceStart(Math.min(maxStart, Math.floor(scrollRatio * maxStart)))
    }
  }, [shouldVirtualize, chapters.length])

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase text-text-subtle hover:text-text hover:bg-bg-hover transition-colors duration-[--duration-normal]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3 h-3 transition-transform duration-[--duration-normal] ${collapsed ? '' : 'rotate-90'}`}
        >
          <title>{collapsed ? 'Expand' : 'Collapse'}</title>
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
        {label}
        <span className="text-text-subtle ml-auto">{chapters.length}</span>
      </button>
      {!collapsed && (
        <div
          className={`ml-2 ${shouldVirtualize ? 'overflow-y-auto max-h-[400px]' : ''}`}
          onScroll={handleScroll}
        >
          {visibleChapters.map((ch) => {
            const isActive = activeSection === sectionType && activeSlug === ch.slug
            const showDirty = isActive && dirty
            return (
              <button
                key={ch.slug}
                type="button"
                onClick={() => onSelect(sectionType, ch.slug)}
                className={`flex items-center gap-1.5 w-full text-left px-2 py-1 text-sm truncate transition-colors duration-[--duration-normal] ${
                  isActive
                    ? 'bg-bg-hover text-accent'
                    : 'text-text-muted hover:bg-bg-overlay hover:text-text'
                }`}
              >
                {showDirty && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />}
                <span className="truncate">{ch.title || ch.slug}</span>
              </button>
            )
          })}
          {chapters.length === 0 && (
            <div className="px-2 py-1 text-xs text-text-subtle italic">Empty</div>
          )}
        </div>
      )}
    </div>
  )
}

export function StructureTree({
  manuscript,
  bufferState,
  onSelectChapter,
}: StructureTreeProps): React.JSX.Element {
  if (!manuscript) {
    return <div className="px-3 py-4 text-sm text-text-subtle">Select a book</div>
  }

  const activeSection = bufferState?.section ?? null
  const activeSlug = bufferState?.slug ?? null
  const dirty = bufferState?.dirty ?? false

  return (
    <div className="py-1 overflow-y-auto flex-1 scrollbar-thin">
      <SectionGroup
        label="Front Matter"
        sectionType="front"
        chapters={manuscript.front.chapters}
        activeSection={activeSection}
        activeSlug={activeSlug}
        dirty={dirty}
        onSelect={onSelectChapter}
      />
      <SectionGroup
        label="Body"
        sectionType="body"
        chapters={manuscript.body.chapters}
        activeSection={activeSection}
        activeSlug={activeSlug}
        dirty={dirty}
        onSelect={onSelectChapter}
      />
      <SectionGroup
        label="Back Matter"
        sectionType="back"
        chapters={manuscript.back.chapters}
        activeSection={activeSection}
        activeSlug={activeSlug}
        dirty={dirty}
        onSelect={onSelectChapter}
      />
    </div>
  )
}
