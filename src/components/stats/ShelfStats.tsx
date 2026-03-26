import type { Shelf, Puzzle } from '../../types'

interface Props {
  shelf: Shelf
  puzzles: Puzzle[]
}

export function ShelfStats({ shelf, puzzles }: Props) {
  const members = Object.entries(shelf.members)
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
            {members.map(([uid, m]) => {
              const count = totalByUser[uid] ?? 0
              const pct = grandTotal > 0 ? Math.round((count / grandTotal) * 100) : 0
              return (
                <div key={uid}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: m.color }}>{m.displayName}</span>
                    <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{pct}% · {count} cells</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${pct}%`, background: m.color,
                      transition: 'width 300ms ease-out',
                    }} />
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
