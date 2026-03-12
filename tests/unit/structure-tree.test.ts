import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { StructureTree } from '../../src/renderer/src/components/StructureTree'
import type { ManuscriptStructure } from '../../src/shared/cos-types'

describe('StructureTree', () => {
  it('renders manuscript summary groups including floating chapters', () => {
    const onSelectChapter = vi.fn()
    const manuscript: ManuscriptStructure = {
      book_id: 'book-1',
      title: 'My Book',
      front: [],
      body: [
        {
          id: 'chapter-1',
          slug: 'intro',
          title: 'Introduction',
          chapter_kind: 'introduction',
          status: 'draft',
          word_count: 1200,
          has_content: true,
        },
      ],
      back: [],
      floating: [
        {
          id: 'chapter-2',
          slug: 'sidebar-note',
          title: 'Sidebar Note',
          chapter_kind: 'sidebar',
          status: 'draft',
          word_count: 200,
          has_content: false,
        },
      ],
      structure_version: 3,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    }

    const html = renderToStaticMarkup(
      createElement(StructureTree, {
        manuscript,
        bufferState: null,
        onSelectChapter,
      }),
    )

    expect(html).toContain('Front Matter')
    expect(html).toContain('Body')
    expect(html).toContain('Back Matter')
    expect(html).toContain('Floating')
    expect(html).toContain('Introduction')
    expect(html).toContain('Sidebar Note')
  })
})
