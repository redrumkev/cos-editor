import { useState } from 'react'
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

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase text-text-subtle hover:text-text-muted transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`}
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
        <div className="ml-2">
          {chapters.map((ch) => {
            const isActive = activeSection === sectionType && activeSlug === ch.slug
            const showDirty = isActive && dirty
            return (
              <button
                key={ch.slug}
                type="button"
                onClick={() => onSelect(sectionType, ch.slug)}
                className={`flex items-center gap-1.5 w-full text-left px-2 py-1 text-sm truncate transition-colors ${
                  isActive
                    ? 'bg-bg-overlay text-accent'
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
    <div className="py-1 overflow-y-auto flex-1">
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
