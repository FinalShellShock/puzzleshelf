import { useRef, useEffect } from 'react'
import type { Puzzle } from '../../types'

type Direction = 'across' | 'down'

interface Props {
  puzzle: Puzzle
  selectedCell: string | null
  direction: Direction
  onSelectWord: (wordId: string, dir: Direction) => void
}

export function ClueList({ puzzle, selectedCell, direction, onSelectWord }: Props) {
  const activeWord = selectedCell && puzzle.gridMeta?.[selectedCell]
    ? (direction === 'across'
        ? puzzle.gridMeta[selectedCell].acrossWord
        : puzzle.gridMeta[selectedCell].downWord)
    : undefined

  const across = Object.entries(puzzle.clues?.across ?? {}).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  const down = Object.entries(puzzle.clues?.down ?? {}).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <ClueSection
        title="Across"
        entries={across}
        dir="across"
        activeWord={direction === 'across' ? activeWord : undefined}
        onSelect={onSelectWord}
      />
      <div style={{ width: 1, background: 'var(--color-border)' }} />
      <ClueSection
        title="Down"
        entries={down}
        dir="down"
        activeWord={direction === 'down' ? activeWord : undefined}
        onSelect={onSelectWord}
      />
    </div>
  )
}

function ClueSection({ title, entries, dir, activeWord, onSelect }: {
  title: string
  entries: [string, string][]
  dir: Direction
  activeWord: string | undefined
  onSelect: (wordId: string, dir: Direction) => void
}) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeWord) {
      activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeWord])

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{
        padding: '8px 12px 4px',
        fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--color-text-muted)',
        position: 'sticky', top: 0,
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        {title}
      </div>
      {entries.map(([num, clue]) => {
        const wordId = `${num}${dir === 'across' ? 'A' : 'D'}`
        const isActive = activeWord === wordId
        return (
          <button
            key={num}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(wordId, dir)}
            style={{
              display: 'flex', gap: 6, width: '100%',
              padding: '7px 12px', border: 'none',
              cursor: 'pointer', textAlign: 'left',
              background: isActive ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
            } as React.CSSProperties}
          >
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--color-accent)', minWidth: 20, flexShrink: 0 }}>
              {num}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.4 }}>{clue}</span>
          </button>
        )
      })}
    </div>
  )
}
