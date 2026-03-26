import type { Puzzle, Shelf } from '../../types'

interface PuzzleCardProps {
  puzzle: Puzzle
  shelf: Shelf
  userId: string
  onClick: () => void
}

export function PuzzleCard({ puzzle, shelf, userId: _userId, onClick }: PuzzleCardProps) {
  const cells = Object.values(puzzle.cells ?? {})
  const totalFilled = cells.filter(c => c.value && !c.given).length

  // Contribution bars
  const members = Object.entries(shelf.members)
  const contributions = members.map(([uid, m]) => ({
    uid,
    color: m.color,
    name: m.displayName,
    count: cells.filter(c => c.filledBy === uid && c.value).length,
  }))
  const totalCells = puzzle.gridWidth * puzzle.gridHeight

  // Who's currently in this puzzle
  const presentMembers = members.filter(([, m]) => m.currentPuzzle === puzzle.id)

  const statusColor = puzzle.status === 'completed'
    ? 'var(--color-correct)'
    : puzzle.status === 'abandoned'
    ? 'var(--color-text-muted)'
    : 'var(--color-accent)'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: 16, cursor: 'pointer',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        transition: 'opacity 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Type badge */}
          <span style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'var(--color-text-muted)', display: 'block', marginBottom: 4,
          }}>
            {puzzle.type}{puzzle.difficulty ? ` · ${puzzle.difficulty}` : ''}
          </span>
          {/* Title */}
          <span style={{ fontWeight: 700, fontSize: 15, display: 'block' }}>{puzzle.title}</span>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>
            {puzzle.status === 'completed' ? '✓ Done' : puzzle.status === 'abandoned' ? 'Abandoned' : 'Active'}
          </span>
          {/* Present members */}
          {presentMembers.length > 0 && (
            <div style={{ display: 'flex', gap: 3 }}>
              {presentMembers.map(([uid, m]) => (
                <div key={uid} style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: m.color, fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white',
                }}>
                  {m.displayName[0]}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalCells > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Progress</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {Math.round((totalFilled / totalCells) * 100)}%
            </span>
          </div>
          <div style={{
            height: 6, borderRadius: 3,
            background: 'var(--color-border)',
            overflow: 'hidden', display: 'flex',
          }}>
            {contributions.map(({ uid, color, count }) => (
              count > 0 && (
                <div
                  key={uid}
                  style={{
                    height: '100%',
                    width: `${(count / totalCells) * 100}%`,
                    background: color,
                    transition: 'width 300ms ease-out',
                  }}
                />
              )
            ))}
          </div>
        </div>
      )}
    </button>
  )
}
