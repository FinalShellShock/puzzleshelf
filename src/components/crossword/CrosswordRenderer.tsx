import { useState, useCallback, useRef, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { checkPuzzle, revealCells } from '../../lib/functions'
import { CrosswordGrid } from './CrosswordGrid'
import { CrosswordKeyboard } from './CrosswordKeyboard'
import { ChatPanel } from '../chat/ChatPanel'
import { Spinner } from '../ui/Spinner'
import { useTheme } from '../../hooks/useTheme'
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
  const [showClueList, setShowClueList] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const cursorRef = useRef<string | null>(null)
  const directionRef = useRef<Direction>('across')
  const { dark, toggle: toggleTheme } = useTheme()

  const myColor = shelf.members[userId]?.color ?? '#888'

  // Other members currently in this puzzle with a fresh lastSeen
  const coPresent = Object.entries(shelf.members).filter(([id, m]) =>
    id !== userId &&
    m.currentPuzzle === puzzle.id &&
    m.lastSeen != null &&
    Date.now() - m.lastSeen.toMillis() < 2 * 60 * 1000
  )

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

  function navigateToWord(wordId: string, dir: Direction) {
    const cells = sortCells(getCellsInWord(wordId, dir), dir)
    if (cells.length === 0) return
    const firstEmpty = cells.find(k => !puzzle.cells[k]?.value)
    const target = firstEmpty ?? cells[0]
    cursorRef.current = target
    directionRef.current = dir
    setSelectedCell(target)
    setDirection(dir)
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
    const nextIdx = idx + delta

    if (nextIdx >= words.length) {
      // Past the end — switch to the other orientation and start from its first word
      const otherDir: Direction = dir === 'across' ? 'down' : 'across'
      const otherWords = getOrderedWords(otherDir)
      if (otherWords.length > 0) {
        navigateToWord(otherWords[0], otherDir)
      } else {
        navigateToWord(words[0], dir)
      }
    } else if (nextIdx < 0) {
      // Before the start — switch to the other orientation and start from its last word
      const otherDir: Direction = dir === 'across' ? 'down' : 'across'
      const otherWords = getOrderedWords(otherDir)
      if (otherWords.length > 0) {
        navigateToWord(otherWords[otherWords.length - 1], otherDir)
      } else {
        navigateToWord(words[words.length - 1], dir)
      }
    } else {
      navigateToWord(words[nextIdx], dir)
    }
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
    const currentWordId = getWordId(fromCell, dir)
    if (!currentWordId) return
    const wordCells = sortCells(getCellsInWord(currentWordId, dir), dir)
    const currentIdx = wordCells.indexOf(fromCell)
    if (currentIdx === -1) return

    // Find next empty cell after current position in this word
    for (let i = currentIdx + 1; i < wordCells.length; i++) {
      if (!puzzle.cells[wordCells[i]]?.value) {
        cursorRef.current = wordCells[i]
        setSelectedCell(wordCells[i])
        return
      }
    }

    // Wrap: look for empty cell from the beginning up to current position
    for (let i = 0; i < currentIdx; i++) {
      if (!puzzle.cells[wordCells[i]]?.value) {
        cursorRef.current = wordCells[i]
        setSelectedCell(wordCells[i])
        return
      }
    }

    // Word is fully filled — move to next word
    navigateWord(1)
  }

  async function handleLetterInput(letter: string) {
    const cell = cursorRef.current
    if (!cell) return
    const cellAtWrite = cell
    advanceCursor(cellAtWrite)
    await writeCell(cellAtWrite, letter)
  }

  async function handleDelete() {
    const cell = cursorRef.current
    if (!cell) return
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
  }

  // Physical keyboard support (desktop) via document listener
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (!cursorRef.current) return
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
    const key = e.key

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault()
      const m = cursorRef.current.match(/r(\d+)c(\d+)/)
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
        cursorRef.current = nextKey
        setSelectedCell(nextKey)
        setDirection(key === 'ArrowLeft' || key === 'ArrowRight' ? 'across' : 'down')
      }
      return
    }

    if (key === 'Tab') {
      e.preventDefault()
      navigateWord(e.shiftKey ? -1 : 1)
      return
    }

    if (key === 'Backspace') {
      e.preventDefault()
      void handleDelete()
      return
    }

    if (/^[A-Za-z]$/.test(key)) {
      e.preventDefault()
      void handleLetterInput(key.toUpperCase())
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current(e)
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Write presence (selected cell + direction) to Firestore so other members can see it
  useEffect(() => {
    if (!selectedCell) return
    updateDoc(doc(db, 'shelves', shelfId), {
      [`members.${userId}.currentCell`]: selectedCell,
      [`members.${userId}.currentDirection`]: direction,
    }).catch(() => {})
  }, [selectedCell, direction, shelfId, userId])

  // Clear presence on unmount
  useEffect(() => {
    return () => {
      updateDoc(doc(db, 'shelves', shelfId), {
        [`members.${userId}.currentCell`]: deleteField(),
        [`members.${userId}.currentDirection`]: deleteField(),
      }).catch(() => {})
    }
  }, [shelfId, userId])

  // Compute other members' active word cells for presence highlighting
  const memberPresence: Record<string, { wordCells: string[], color: string }> = {}
  for (const [id, member] of Object.entries(shelf.members)) {
    if (id === userId) continue
    if (member.currentPuzzle !== puzzle.id) continue
    if (!member.currentCell || !member.currentDirection) continue
    const wordId = getWordId(member.currentCell, member.currentDirection)
    if (!wordId) continue
    memberPresence[id] = {
      wordCells: getCellsInWord(wordId, member.currentDirection),
      color: member.color,
    }
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
        {coPresent.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {coPresent.map(([id, m]) => (
              <div key={id} title={m.displayName} style={{
                width: 24, height: 24, borderRadius: '50%',
                background: m.color, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', flexShrink: 0,
              }}>
                {m.displayName[0]}
              </div>
            ))}
          </div>
        )}
        <button style={iconBtnStyle} onClick={() => setShowChat(c => !c)}>💬</button>
        <button style={iconBtnStyle} onClick={toggleTheme} title={dark ? 'Light mode' : 'Dark mode'}>
          {dark ? '☀️' : '🌙'}
        </button>
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

      {/* Grid or Clue List */}
      {showClueList ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {(['across', 'down'] as Direction[]).map(dir => (
            <div key={dir}>
              <div style={{
                padding: '10px 16px 4px',
                fontSize: 11, fontWeight: 700,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: 'var(--color-bg)',
                position: 'sticky', top: 0,
              }}>
                {dir === 'across' ? 'Across' : 'Down'}
              </div>
              {getOrderedWords(dir).map(wordId => {
                const num = wordId.replace(/[AD]$/, '')
                const text = (dir === 'across' ? puzzle.clues?.across : puzzle.clues?.down)?.[num]
                const isActive = wordId === activeWord && direction === dir
                return (
                  <button
                    key={wordId}
                    onClick={() => { navigateToWord(wordId, dir); setShowClueList(false) }}
                    style={{
                      display: 'flex', width: '100%', padding: '10px 16px',
                      background: isActive
                        ? 'color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))'
                        : 'var(--color-surface)',
                      border: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      textAlign: 'left', cursor: 'pointer', gap: 10, alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--color-accent)', minWidth: 24, fontSize: 14, flexShrink: 0 }}>
                      {num}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.4 }}>
                      {text}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8px 0' }}>
          <CrosswordGrid
            puzzle={puzzle}
            shelf={shelf}
            selectedCell={selectedCell}
            activeWordCells={activeWordCells}
            memberPresence={memberPresence}
            myColor={myColor}
            onCellSelect={handleCellSelect}
          />
        </div>
      )}

      {/* Clue bar with prev/next navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        flexShrink: 0,
        minHeight: 52,
      }}>
        <button onClick={() => navigateWord(-1)} style={navBtnStyle}>‹</button>
        <div
          onClick={() => selectedCell && toggleDirection()}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 4px',
            cursor: selectedCell ? 'pointer' : 'default',
            userSelect: 'none',
            overflow: 'hidden',
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
              <span style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--color-text)', overflow: 'hidden' }}>
                {clueText}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 4px' }}>Tap a cell to begin</span>
          )}
        </div>
        <button onClick={() => navigateWord(1)} style={navBtnStyle}>›</button>
        <button
          onClick={() => setShowClueList(s => !s)}
          style={{ ...navBtnStyle, fontSize: 18, color: showClueList ? 'var(--color-accent)' : 'var(--color-text-muted)', borderLeft: '1px solid var(--color-border)' }}
        >
          ☰
        </button>
      </div>

      {/* Custom keyboard — hidden when browsing clue list */}
      {!showClueList && (
        <CrosswordKeyboard onLetter={l => void handleLetterInput(l)} onDelete={() => void handleDelete()} />
      )}

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
  fontSize: 22, padding: '12px 18px',
  color: 'var(--color-text)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}
