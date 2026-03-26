import type { Shelf, Puzzle } from '../../types'
import { FORMER_MEMBER_COLOR } from '../../utils/colors'

interface Props {
  shelf: Shelf
  puzzles: Puzzle[]
  memberNames?: Record<string, string>
}

export function ShelfStats({ shelf, puzzles, memberNames = {} }: Props) {
  const members = [
    ...Object.entries(shelf.members).map(([uid, m]) => ({ uid, displayName: memberNames[uid] ?? m.displayName, color: m.color, isFormer: false })),
    ...Object.entries(shelf.formerMembers ?? {}).map(([uid, m]) => ({ uid, displayName: memberNames[uid] ?? m.displayName, color: FORMER_MEMBER_COLOR, isFormer: true })),
  ]
  const completed = puzzles.filter(p => p.status === 'completed')
  const completionRate = puzzles.length > 0 ? Math.round((completed.length / puzzles.length) * 100) : 0

  // Aggregate contribution across all puzzles
  const totalByUser: Record<string, number> = {}
  let grandTotal = 0
  for (const puzzle of puzzles) {
    for (const cell of Object.values(puzzle.cells ?? {})) {
      if (cell.value && !cell.given && cell.filledBy) {
        totalByUser[cell.filledBy] = (totalByUser[cell.filledBy] ?? 0) + 1
        grandTotal++
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overview */}
      <div className="surface" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Shelf overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <StatItem label="Puzzles started" value={puzzles.length} />
          <StatItem label="Completed" value={completed.length} />
          <StatItem label="Completion rate" value={`${completionRate}%`} />
          <StatItem label="Crosswords" value={puzzles.filter(p => p.type === 'crossword').length} />
          <StatItem label="Sudokus" value={puzzles.filter(p => p.type === 'sudoku').length} />
        </div>
      </div>

      {/* Per-member contributions */}
      {grandTotal > 0 && (
        <div className="surface" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Contributions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {members.map(({ uid, displayName, color, isFormer }) => {
              const count = totalByUser[uid] ?? 0
              if (count === 0 && isFormer) return null  // hide former members with no contributions
              const pct = grandTotal > 0 ? Math.round((count / grandTotal) * 100) : 0
              return (
                <div key={uid} style={{ opacity: isFormer ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color }}>
                      {displayName}
                      {isFormer && <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 6 }}>left</span>}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{pct}% · {count} cells</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: color, transition: 'width 300ms ease-out' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent completions */}
      {completed.length > 0 && (
        <div className="surface" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Completed puzzles</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.slice(0, 5).map(puzzle => (
              <div key={puzzle.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{puzzle.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8, textTransform: 'uppercase' }}>
                    {puzzle.type}
                  </span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--color-correct)', fontWeight: 600 }}>✓</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
    </div>
  )
}
