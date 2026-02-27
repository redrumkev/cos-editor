import MarkdownIt from 'markdown-it'
import { useCallback, useMemo, useState } from 'react'

const PRESETS = ['Kindle', 'Paperback', 'Hardcover'] as const
type Preset = (typeof PRESETS)[number]

const PRESET_MAX_WIDTH: Record<Preset, number> = {
  Kindle: 375,
  Paperback: 400,
  Hardcover: 460,
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

interface PreviewPaneProps {
  content: string
}

export function PreviewPane({ content }: PreviewPaneProps): React.JSX.Element {
  const [preset, setPreset] = useState<Preset>('Paperback')

  const cyclePreset = useCallback(() => {
    setPreset((current) => {
      const idx = PRESETS.indexOf(current)
      return PRESETS[(idx + 1) % PRESETS.length]
    })
  }, [])

  const rendered = useMemo(() => md.render(content), [content])

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Pane header */}
      <div className="flex items-center justify-between shrink-0 px-3 py-1.5 border-b border-border bg-bg-surface">
        <span className="text-xs font-medium text-text-muted tracking-wide uppercase">Preview</span>
        <button
          type="button"
          onClick={cyclePreset}
          className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs text-text-muted transition-colors duration-[--duration-normal] hover:bg-bg-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Cycle viewport preset"
        >
          <span>{preset}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="opacity-60"
            aria-hidden="true"
          >
            <path
              d="M4.5 2.5L8 6L4.5 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Scrollable preview body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div
          className="preview-content mx-auto px-6 py-6"
          style={{ maxWidth: PRESET_MAX_WIDTH[preset] }}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown-it output with html:false is safe
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      </div>
    </div>
  )
}
