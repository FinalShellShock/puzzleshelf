import { useState, useCallback, useRef } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { checkPuzzle, revealCells } from '../../lib/functions'
import { CrosswordGrid } from './CrosswordGrid'
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
  // Tracks cursor position synchronously so rapid keystrokes don't all write to the same cell
  const cursorRef = useRef<string | null>(null)
  const directionRef = useRef<Direction>('across')

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

  function sortCells(cells: string[], dir: Direction): string[] {
    return [...cells].sort((a, b) => {
      const ma = a.match(/r(\d+)c(\d+)/)
      const mb = b.match(/r(\d+)c(\d+)/)
      if (!ma || !mb) return 0
      const [ra, ca] = [parseInt(ma[1]), parseInt(ma[2])]
      const [rb, cb] = [parseInt(mb[1]), parseInt(mb[2])]
      return dir === 'across'
        ? ra !== rb ? ra - rb : ca - cb
        : ca !== cb ? ca - cb : ra - rb
    })
  }

  function getOrderedWords(dir: Direction): string[] {
    if (!puzzle.gridMeta) return []
    const words = new Set<string>()
    Object.values(puzzle.gridMeta).forEach(meta => {
      const w = dir === 'across' ? meta.acrossWord : meta.downWord
      if (w) words.add(w)
    })
    return Array.from(words).sort((a, b) => parseInt(a) - parseInt(b))
  }

  const activeWord = selectedCell ? getWordId(selectedCell, direction) : undefined
  const activeWordCells = activeWord ? getCellsInWord(activeWord, direction) : []
  const clueNumber = activeWord?.replace(/[AD]$/, '')
  const clueText = clueNumber && puzzle.clues
    ? (direction === 'across' ? puzzle.clues.across : puzzle.clues.down)?.[clueNumber] ?? ''
    : ''

  function focusInput() {
    inputRef.current?.focus()
  }

  function navigateToWord(wordId: string, dir: Direction) {
    const cells = sortCells(getCellsInWord(wordId, dir), dir)
    if (cells.length === 0) return
    const firstEmpty = cells.find(k => !puzzle.cells[k]?.value)
    const target = firstEmpty ?? cells[0]
    cursorRef.current = target
    directionRef.current = dir
    setSelectedCell(target)
    setDirection(dir)
    focusInput()
  }

  function navigateWord(delta: 1 | -1) {
    const dir = directionRef.current
    const currentCell = cursorRef.current
    const currentWord = currentCell ? getWordId(currentCell, dir) : undefined
    const words = getOrderedWords(dir)
    if (words.length === 0) return
    if (!currentWord) {
      navigateToWord(words[0], dir)
      return
    }
    const idx = words.indexOf(currentWord)
    const nextIdx = (idx + delta + words.length) % words.length
    navigateToWord(words[nextIdx], dir)
  }

  function toggleDirection() {
    const newDir: Direction = directionRef.current === 'across' ? 'down' : 'across'
    const cell = cursorRef.current
    if (cell) {
      const meta = puzzle.gridMeta?.[cell]
      const supportsNew = newDir === 'across' ? !!meta?.acrossWord : !!meta?.downWord
      if (supportsNew) {
        directionRef.current = newDir
        setDirection(newDir)
        focusInput()
      } else {
        const words = getOrderedWords(newDir)
        if (words[0]) navigateToWord(words[0], newDir)
      }
    } else {
      const words = getOrderedWords(newDir)
      if (words[0]) navigateToWord(words[0], newDir)
    }
  }

  const handleCellSelect = useCallback((cellKey: string) => {
    // Focus input synchronously inside the event handler so iOS brings up the keyboard
    focusInput()
    if (cellKey === selectedCell) {
      const meta = puzzle.gridMeta?.[cellKey]
      if (meta?.acrossWord && meta?.downWord) {
        const newDir = directionRef.current === 'across' ? 'down' : 'across'
        directionRef.current = newDir
        setDirection(newDir)
      }
    } else {
      cursorRef.current = cellKey
      setSelectedCell(cellKey)
      const meta = puzzle.gridMeta?.[cellKey]
      if (directionRef.current === 'across' && !meta?.acrossWord && meta?.downWord) {
        directionRef.current = 'down'
        setDirection('down')
      } else if (directionRef.current === 'down' && !meta?.downWord && meta?.acrossWord) {
        directionRef.current = 'across'
        setDirection('across')
      }
    }
  }, [selectedCell, puzzle.gridMeta])

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

  function advanceCursor(fromCell: string) {
    const dir = directionRef.current
    const m = fromCell.match(/r(\d+)c(\d+)/)
    if (!m) return
    const row = parseInt(m[1]), col = parseInt(m[2])
    const nextKey = dir === 'across' ? `r${row}c${col + 1}` : `r${row + 1}c${col}`
    const nextMeta = puzzle.gridMeta?.[nextKey]
    const currentWordId = getWordId(fromCell, dir)
    const nextWordId = nextMeta ? getWordId(nextKey, dir) : undefined

    if (nextMeta && !nextMeta.isBlack && nextWordId === currentWordId) {
      cursorRef.current = nextKey
      setSelectedCell(nextKey)
    } else {
      // End of word — jump to next word's first empty cell
      navigateWord(1)
    }
  }

  function moveCursor(key: string) {
    if (!selectedCell) return
    const m = selectedCell.match(/r(\d+)c(\d+)/)
    if (!m) return
    const row = parseInt(m[1]), col = parseInt(m[2])
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

  async function handleLetterInput(letter: string) {
    const cell = cursorRef.current
    if (!cell) return
    const cellAtWrite = cell
    advanceCursor(cellAtWrite) // advance cursor immediately (synchronously) before the async write
    await writeCell(cellAtWrite, letter)
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!selectedCell) return
    const key = e.key

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault()
      moveCursor(key)
      return
    }

    if (key === 'Tab') {
      e.preventDefault()
      navigateWord(e.shiftKey ? -1 : 1)
      return
    }

    if (key === 'Backspace') {
      e.preventDefault()
      const cell = cursorRef.current ?? selectedCell
      const dir = directionRef.current
      const current = puzzle.cells[cell]?.value
      if (current) {
        await writeCell(cell, '')
      } else {
        const m = cell.match(/r(\d+)c(\d+)/)
        if (!m) return
        const row = parseInt(m[1]), col = parseInt(m[2])
        const prevKey = dir === 'across' ? `r${row}c${col - 1}` : `r${row - 1}c${col}`
        const prevMeta = puzzle.gridMeta?.[prevKey]
        const currentWordId = getWordId(cell, dir)
        const prevWordId = prevMeta ? getWordId(prevKey, dir) : undefined
        if (prevMeta && !prevMeta.isBlack && prevWordId === currentWordId) {
          cursorRef.current = prevKey
          setSelectedCell(prevKey)
          await writeCell(prevKey, '')
        }
      }
      return
    }

    if (/^[A-Za-z]$/.test(key)) {
      e.preventDefault()
      await handleLetterInput(key.toUpperCase())
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Handles mobile soft keyboard input (onChange fires; onKeyDown is unreliable on mobile)
    const val = e.target.value
    if (!val) return
    const char = val[val.length - 1]
    if (/^[A-Za-z]$/.test(char)) {
      void handleLetterInput(char.toUpperCase())
    }
    // Reset so the next keystroke is detected as a new character
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleCheck(scope: 'word' | 'all') {
    setMenuOpen(false)
    setActionLoading(true)
    try {
      await checkPuzzle({ shelfId, puzzleId: puzzle.id, scope, wordId: scope === 'word' ? activeWord : undefined })
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
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

      {/* Active clue bar — tap to toggle direction */}
      <div
        onClick={() => selectedCell && toggleDirection()}
        style={{
          padding: '10px 16px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: selectedCell ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        {activeWord ? (
          <>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-accent)',
              background: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))',
              padding: '3px 8px',
              borderRadius: 12,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {clueNumber} {direction === 'across' ? '→' : '↓'}
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text)' }}>
              {clueText}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Tap a cell to begin</span>
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

      {/* Word navigation bar */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'stretch',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
      }}>
        <button onClick={() => navigateWord(-1)} style={navBtnStyle}>
          ‹
        </button>
        <button
          onClick={toggleDirection}
          style={{
            ...navBtnStyle,
            flex: 1,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 1,
            borderLeft: '1px solid var(--color-border)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          {direction === 'across' ? '→ ACROSS' : '↓ DOWN'}
        </button>
        <button onClick={() => navigateWord(1)} style={navBtnStyle}>
          ›
        </button>
      </div>

      {/* Hidden input — captures keyboard on desktop and mobile */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={handleKeyDown}
        onChange={handleInputChange}
        style={{
          position: 'fixed',
          top: -200,
          left: -200,
          width: 1,
          height: 1,
          opacity: 0.01,
          fontSize: 16, // Prevent iOS zoom on focus
        }}
      />

      {/* Chat slide-up */}
      {showChat && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowChat(false)}
        >
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

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 22, padding: '12px 20px',
  color: 'var(--color-text)',
  minHeight: 48,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
