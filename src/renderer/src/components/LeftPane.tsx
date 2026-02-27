import type { CasHistoryEntry, ManuscriptStructure, SectionType } from '../../../shared/cos-types'
import type { BufferState } from '../../../shared/ipc'
import { ChangesView } from './ChangesView'
import { OutlineView } from './OutlineView'
import { StructureTree } from './StructureTree'

type TabId = 'structure' | 'outline' | 'changes'

interface LeftPaneProps {
  manuscript: ManuscriptStructure | null
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  bufferState: BufferState | null
  historyEntries: CasHistoryEntry[]
  onSelectChapter: (section: SectionType, slug: string) => void
  onViewVersion: (hash: string) => void
  activeVersionHash: string | null
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'structure', label: 'Structure' },
  { id: 'outline', label: 'Outline' },
  { id: 'changes', label: 'Changes' },
]

export function LeftPane({
  manuscript,
  activeTab,
  onTabChange,
  bufferState,
  historyEntries,
  onSelectChapter,
  onViewVersion,
  activeVersionHash,
}: LeftPaneProps): React.JSX.Element {
  return (
    <div className="w-60 min-w-[180px] bg-bg-surface border-r border-border flex flex-col shrink-0">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0 bg-bg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors duration-[--duration-normal] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent bg-bg-surface'
                : 'text-text-subtle hover:text-text hover:bg-bg-overlay/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'structure' && (
        <StructureTree
          manuscript={manuscript}
          bufferState={
            bufferState
              ? { section: bufferState.section, slug: bufferState.slug, dirty: bufferState.dirty }
              : null
          }
          onSelectChapter={onSelectChapter}
        />
      )}
      {activeTab === 'outline' && <OutlineView content={bufferState?.content ?? null} />}
      {activeTab === 'changes' && (
        <ChangesView
          entries={historyEntries}
          activeHash={activeVersionHash}
          onViewVersion={onViewVersion}
        />
      )}
    </div>
  )
}
