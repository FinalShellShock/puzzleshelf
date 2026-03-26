import { useState } from 'react'
import { deletePuzzle } from '../../lib/functions'
import type { Puzzle, Shelf } from '../../types'
import { FORMER_MEMBER_COLOR } from '../../utils/colors'
import { useMemberNames } from '../../hooks/useMemberNames'

interface PuzzleCardProps {
  puzzle: Puzzle
  shelf: Shelf
  userId: string
  onClick: () => void
}

export function PuzzleCard({ puzzle, shelf, userId: _userId, onClick }: PuzzleCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const memberNames = useMemberNames(shelf)

  const cells = Object.values(puzzle.cells ?? {})
  const totalFilled = cells.filter(c => c.value && !c.given).length

  // Contribution bars — include former members so progress bar stays accurate
  const allContributors = [
    ...Object.entries(shelf.members).map(([uid, m]) => ({ uid, color: m.color, name: memberNames[uid] ?? m.displayName })),
    ...Object.entries(shelf.formerMembers ?? {}).map(([uid, m]) => ({ uid, color: FORMER_MEMBER_COLOR, name: memberNames[uid] ?? m.displayName })),
  ]
  const contributions = allContributors.map(({ uid, color, name }) => ({
    uid, color, name,
    count: cells.filter(c => c.filledBy === uid && c.value).length,
  }))
  const totalCells = puzzle.gridWidth * puzzle.gridHeight

  // Who's currently in this puzzle (only current members can be present)
  const presentMembers = Object.entries(shelf.members).filter(([, m]) => m.currentPuzzle === puzzle.id)

  const statusColor = puzzle.status === 'completed'
    ? 'var(--color-correct)'
    : puzzle.status === 'abandoned'
    ? 'var(--color-text-muted)'
    : 'var(--color-accent)'

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setDeleting(true)
    try {
      await deletePuzzle({ shelfId: shelf.id, puzzleId: puzzle.id })
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
    // No need to reset — the card disappears from Firestore onSnapshot
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={confirming ? undefined : onClick}
      onKeyDown={e => { if (!confirming && (e.key === 'Enter' || e.key === ' ')) onClick() }}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: 16, cursor: confirming ? 'default' : 'pointer',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        transition: 'opacity 150ms',
        position: 'relative',
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

        {/* Status + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          {confirming ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Remove?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                  background: 'var(--color-incorrect)', color: '#fff', border: 'none',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? '…' : 'Remove'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirming(false) }}
                style={{
                  fontSize: 12, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                  background: 'var(--color-bg)', color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>
                  {puzzle.status === 'completed' ? '✓ Done' : puzzle.status === 'abandoned' ? 'Abandoned' : 'Active'}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setConfirming(true) }}
                  title="Remove from shelf"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                    color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1,
                    borderRadius: 4, opacity: 0.6,
                  }}
                >
                  ✕
                </button>
              </div>
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
                      {(memberNames[uid] ?? m.displayName)[0]}
                    </div>
                  ))}
                </div>
              )}
            </>
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
    </div>
  )
}
