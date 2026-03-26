import { useState, useCallback } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { checkPuzzle } from '../../lib/functions'
import { SudokuGrid } from './SudokuGrid'
import { ChatPanel } from '../chat/ChatPanel'
import { Spinner } from '../ui/Spinner'
import { detectConflicts } from '../../utils/sudoku'
import type { Puzzle, Shelf } from '../../types'

interface Props {
  puzzle: Puzzle
  shelf: Shelf
  userId: string
  shelfId: string
}

export function SudokuRenderer({ puzzle, shelf, userId, shelfId }: Props) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const myColor = shelf.members[userId]?.color ?? '#888'

  // Build values map for conflict detection (only non-given, non-empty cells)
  const cellValues: Record<string, string> = {}
  for (const [key, cell] of Object.entries(puzzle.cells)) {
    if (cell.value) cellValues[key] = cell.value
  }
  const conflicts = detectConflicts(cellValues)

  async function writeCell(cellKey: string, value: string) {
    const isGiven = puzzle.constraints?.[cellKey] !== undefined
    if (isGiven) return
    await updateDoc(doc(db, 'shelves', shelfId, 'puzzles', puzzle.id), {
      [`cells.${cellKey}`]: {
        value,
        filledBy: userId,
        timestamp: serverTimestamp(),
        status: 'unchecked',
        given: false,
      }
    })
  }

  const handleCellSelect = useCallback((key: string) => {
    const isGiven = puzzle.constraints?.[key] !== undefined
    if (!isGiven) setSelectedCell(key)
  }, [puzzle.constraints])

  async function handleNumberInput(digit: string) {
    if (!selectedCell) return
    await writeCell(selectedCell, digit)
    // Auto-advance: move to next empty cell
  }

  async function handleClear() {
    if (!selectedCell) return
    await writeCell(selectedCell, '')
  }

  async function handleCheck(scope: 'cell' | 'all') {
    setMenuOpen(false)
    setActionLoading(true)
    try {
      await checkPuzzle({
        shelfId, puzzleId: puzzle.id, scope,
        cellKey: scope === 'cell' ? (selectedCell ?? undefined) : undefined,
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg)', flexShrink: 0,
      }}>
        <button style={iconBtnStyle} onClick={() => window.history.back()}>←</button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {puzzle.title}
        </span>
        <button style={iconBtnStyle} onClick={() => setShowChat(c => !c)}>💬</button>
        <div style={{ position: 'relative' }}>
          <button style={iconBtnStyle} onClick={() => setMenuOpen(m => !m)}>
            {actionLoading ? <Spinner size={16} /> : '⋯'}
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 4,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 12, overflow: 'hidden', zIndex: 20, minWidth: 160,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}>
              {[
                { label: 'Check cell', action: () => handleCheck('cell') },
                { label: 'Check puzzle', action: () => handleCheck('all') },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={menuItemStyle}>{item.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <SudokuGrid
          puzzle={puzzle}
          shelf={shelf}
          selectedCell={selectedCell}
          conflicts={conflicts}
          myColor={myColor}
          onCellSelect={handleCellSelect}
        />
      </div>

      {/* Number pad */}
      <div style={{
        flexShrink: 0, padding: '12px 16px 32px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button
              key={d}
              onClick={() => handleNumberInput(d)}
              disabled={!selectedCell}
              style={{
                height: 52, borderRadius: 10, fontSize: 22, fontWeight: 700,
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                cursor: 'pointer', color: myColor,
                transition: 'opacity 150ms',
                opacity: selectedCell ? 1 : 0.4,
              }}
            >
              {d}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={!selectedCell}
            style={{
              height: 52, borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              cursor: 'pointer', color: 'var(--color-text-muted)',
              opacity: selectedCell ? 1 : 0.4,
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chat slide-up */}
      {showChat && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowChat(false)}>
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'var(--color-bg)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              maxHeight: '65vh', display: 'flex', flexDirection: 'column',
              padding: '0 0 40px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>Puzzle chat</span>
              <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ChatPanel
                chatPath={`shelves/${shelfId}/puzzles/${puzzle.id}/chat`}
                shelf={shelf}
                userId={userId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 18, padding: '4px 6px', borderRadius: 8,
  color: 'var(--color-text)', minWidth: 36, minHeight: 36,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '12px 16px',
  background: 'none', border: 'none', cursor: 'pointer',
  textAlign: 'left', fontSize: 14, color: 'var(--color-text)',
  borderBottom: '1px solid var(--color-border)',
}
