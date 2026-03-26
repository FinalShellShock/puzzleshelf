import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { checkPuzzle, revealCells } from '../../lib/functions'
import { CrosswordGrid } from './CrosswordGrid'
import { ClueList } from './ClueList'
import { ChatPanel } from '../chat/ChatPanel'
import { Spinner } from '../ui/Spinner'
import type { Puzzle, Shelf } from '../../types'

interface Props {
  puzzle: Puzzle
  shelf: Shelf
  userId: string
  shelfId: string
}

type Direction = 'across' | 'down'

export function CrosswordRenderer({ puzzle, shelf, userId, shelfId }: Props) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [direction, setDirection] = useState<Direction>('across')
  const [showChat, setShowChat] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus hidden input when a cell is selected (captures keyboard on desktop)
  useEffect(() => {
    if (selectedCell) inputRef.current?.focus()
  }, [selectedCell])

  const myColor = shelf.members[userId]?.color ?? '#888'

  function getWordId(cellKey: string, dir: Direction): string | undefined {
    return puzzle.gridMeta?.[cellKey]?.[dir === 'across' ? 'acrossWord' : 'downWord']
  }

  function getCellsInWord(wordId: string, dir: Direction): string[] {
    if (!puzzle.gridMeta) return []
    return Object.entries(puzzle.gridMeta)
      .filter(([, meta]) => (dir === 'across' ? meta.acrossWord : meta.downWord) === wordId)
      .map(([key]) => key)
  }

  const activeWord = selectedCell ? getWordId(selectedCell, direction) : undefined
  const activeWordCells = activeWord ? getCellsInWord(activeWord, direction) : []

  const handleCellSelect = useCallback((cellKey: string) => {
    if (cellKey === selectedCell) {
      // Toggle direction on re-tap
      setDirection(d => d === 'across' ? 'down' : 'across')
    } else {
      setSelectedCell(cellKey)
      // Default to across if available, else down
      const meta = puzzle.gridMeta?.[cellKey]
      if (meta?.acrossWord && direction === 'down') setDirection('across')
      if (!meta?.acrossWord && meta?.downWord) setDirection('down')
    }
  }, [selectedCell, direction, puzzle.gridMeta])

  async function writeCell(cellKey: string, value: string) {
    await updateDoc(doc(db, 'shelves', shelfId, 'puzzles', puzzle.id), {
      [`cells.${cellKey}`]: {
        value: value.toUpperCase(),
        filledBy: userId,
        timestamp: serverTimestamp(),
        status: 'unchecked',
        given: false,
      }
    })
  }

  function advanceCursor(cellKey: string) {
    const [, rowStr, , colStr] = cellKey.match(/r(\d+)c(\d+)/) ?? []
    if (!rowStr || !colStr) return
    const row = parseInt(rowStr), col = parseInt(colStr)
    const nextKey = direction === 'across' ? `r${row}c${col + 1}` : `r${row + 1}c${col}`
    if (puzzle.gridMeta?.[nextKey] && !puzzle.gridMeta[nextKey].isBlack) {
      setSelectedCell(nextKey)
    }
  }

  function moveCursor(key: string) {
    if (!selectedCell) return
    const [, rowStr, , colStr] = selectedCell.match(/r(\d+)c(\d+)/) ?? []
    if (!rowStr || !colStr) return
    const row = parseInt(rowStr), col = parseInt(colStr)
    const moves: Record<string, string> = {
      ArrowUp: `r${row - 1}c${col}`,
      ArrowDown: `r${row + 1}c${col}`,
      ArrowLeft: `r${row}c${col - 1}`,
      ArrowRight: `r${row}c${col + 1}`,
    }
    const nextKey = moves[key]
    if (nextKey && puzzle.gridMeta?.[nextKey] && !puzzle.gridMeta[nextKey].isBlack) {
      setSelectedCell(nextKey)
      setDirection(key === 'ArrowLeft' || key === 'ArrowRight' ? 'across' : 'down')
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (!selectedCell) return
    const key = e.key

    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault()
      moveCursor(key)
      return
    }

    if (key === 'Tab') {
      e.preventDefault()
      // Advance to next word
      return
    }

    if (key === 'Backspace') {
      const current = puzzle.cells[selectedCell]?.value
      if (current) {
        await writeCell(selectedCell, '')
      } else {
        // Move back
        const [, rowStr, , colStr] = selectedCell.match(/r(\d+)c(\d+)/) ?? []
        if (!rowStr || !colStr) return
        const row = parseInt(rowStr), col = parseInt(colStr)
        const prevKey = direction === 'across' ? `r${row}c${col - 1}` : `r${row - 1}c${col}`
        if (puzzle.gridMeta?.[prevKey] && !puzzle.gridMeta[prevKey].isBlack) {
          setSelectedCell(prevKey)
          await writeCell(prevKey, '')
        }
      }
      return
    }

    if (/^[A-Za-z]$/.test(key)) {
      await writeCell(selectedCell, key.toUpperCase())
      advanceCursor(selectedCell)
    }
  }

  async function handleCheck(scope: 'word' | 'all') {
    setMenuOpen(false)
    setActionLoading(true)
    try {
      await checkPuzzle({
        shelfId, puzzleId: puzzle.id, scope,
        wordId: scope === 'word' ? activeWord : undefined,
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReveal(scope: 'cell' | 'word') {
    setMenuOpen(false)
    setActionLoading(true)
    try {
      await revealCells({
        shelfId, puzzleId: puzzle.id, scope,
        cellKey: scope === 'cell' ? (selectedCell ?? undefined) : undefined,
        wordId: scope === 'word' ? activeWord : undefined,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const clueText = activeWord && puzzle.clues
    ? (direction === 'across' ? puzzle.clues.across : puzzle.clues.down)[activeWord.replace(/[AD]/, '')]
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        flexShrink: 0,
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
              borderRadius: 12, overflow: 'hidden', zIndex: 20, minWidth: 180,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}>
              {[
                { label: 'Check word', action: () => handleCheck('word') },
                { label: 'Check puzzle', action: () => handleCheck('all') },
                { label: 'Reveal cell', action: () => handleReveal('cell') },
                { label: 'Reveal word', action: () => handleReveal('word') },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={menuItemStyle}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active clue */}
      <div style={{
        padding: '10px 16px', background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0, minHeight: 44,
      }}>
        {activeWord ? (
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong style={{ color: 'var(--color-accent)' }}>
              {activeWord} {direction === 'across' ? 'Across' : 'Down'}
            </strong>
            {clueText ? ` — ${clueText}` : ''}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>Tap a cell to start</p>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 8 }}>
        <CrosswordGrid
          puzzle={puzzle}
          shelf={shelf}
          selectedCell={selectedCell}
          activeWordCells={activeWordCells}
          myColor={myColor}
          onCellSelect={handleCellSelect}
        />
      </div>

      {/* Hidden input to capture keyboard */}
      <input
        ref={inputRef}
        onKeyDown={handleKeyDown}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, top: -100 }}
        readOnly
      />

      {/* Clue list */}
      <div style={{
        flexShrink: 0, maxHeight: '30vh', overflow: 'auto',
        borderTop: '1px solid var(--color-border)',
      }}>
        <ClueList
          puzzle={puzzle}
          selectedCell={selectedCell}
          direction={direction}
          onSelectWord={(wordId, dir) => {
            setDirection(dir)
            // Find first cell of this word
            const cells = getCellsInWord(wordId, dir)
            if (cells[0]) setSelectedCell(cells[0])
          }}
        />
      </div>

      {/* Chat slide-up */}
      {showChat && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 30,
          background: 'rgba(0,0,0,0.4)',
        }} onClick={() => setShowChat(false)}>
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
