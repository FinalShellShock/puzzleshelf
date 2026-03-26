import { useState, useMemo } from 'react'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { fetchCrossword, generateSudoku } from '../../lib/functions'
import type { Puzzle } from '../../types'

type PuzzleType = 'crossword' | 'sudoku'
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

interface Props {
  shelfId: string
  userId: string
  puzzles: Puzzle[]
  onClose: () => void
  onAdded: (puzzleId: string) => void
}

function getLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export function AddPuzzleModal({ shelfId, puzzles, onClose, onAdded }: Props) {
  const [type, setType] = useState<PuzzleType | null>(null)

  return (
    <Modal title="Add a puzzle" onClose={onClose}>
      {type === null && <TypePicker onSelect={setType} />}
      {type === 'crossword' && (
        <CrosswordPicker shelfId={shelfId} puzzles={puzzles} onAdded={onAdded} onBack={() => setType(null)} />
      )}
      {type === 'sudoku' && (
        <SudokuPicker shelfId={shelfId} onAdded={onAdded} onBack={() => setType(null)} />
      )}
    </Modal>
  )
}

function TypePicker({ onSelect }: { onSelect: (t: PuzzleType) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TypeButton icon="✏️" title="Crossword" description="LA Times daily crossword" onClick={() => onSelect('crossword')} />
      <TypeButton icon="🔢" title="Sudoku" description="Classic 9×9, algorithmically generated" onClick={() => onSelect('sudoku')} />
    </div>
  )
}

function TypeButton({ icon, title, description, onClick }: { icon: string; title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: 16, borderRadius: 12, cursor: 'pointer',
        background: 'var(--color-bg)', border: '1.5px solid var(--color-border)',
        textAlign: 'left', transition: 'border-color 150ms', width: '100%',
      }}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</div>
      </div>
    </button>
  )
}

function CrosswordPicker({ shelfId, puzzles, onAdded, onBack }: {
  shelfId: string
  puzzles: Puzzle[]
  onAdded: (id: string) => void
  onBack: () => void
}) {
  const today = new Date()
  const todayStr = getLocalDateStr(today)
  const minDate = getLocalDateStr(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000))

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [loading, setLoading] = useState(false)
  const [loadingDate, setLoadingDate] = useState<string | null>(null)
  const [error, setError] = useState('')

  const crosswordsByDate = useMemo(() => {
    const map: Record<string, Puzzle> = {}
    for (const p of puzzles) {
      if (p.source === 'latimes' && p.sourceDate) {
        map[p.sourceDate] = p
      }
    }
    return map
  }, [puzzles])

  async function handleDateClick(dateStr: string) {
    setError('')
    // If already on shelf, just navigate to it
    if (crosswordsByDate[dateStr]) {
      onAdded(crosswordsByDate[dateStr].id)
      return
    }
    setLoadingDate(dateStr)
    setLoading(true)
    try {
      const result = await fetchCrossword({ shelfId, date: dateStr })
      onAdded(result.data.puzzleId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch crossword'
      setError(msg)
    } finally {
      setLoading(false)
      setLoadingDate(null)
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const lastDayOfPrevMonth = getLocalDateStr(new Date(viewYear, viewMonth, 0))
  const canGoPrev = lastDayOfPrevMonth >= minDate
  const canGoNext = viewYear < today.getFullYear() || (viewYear === today.getFullYear() && viewMonth < today.getMonth())

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'left', padding: 0 }}>
        ← Back
      </button>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          style={{ background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'default', fontSize: 18, padding: '4px 10px', color: 'var(--color-text-muted)', opacity: canGoPrev ? 1 : 0.3 }}
        >
          ←
        </button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{MONTHS[viewMonth]} {viewYear}</span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          style={{ background: 'none', border: 'none', cursor: canGoNext ? 'pointer' : 'default', fontSize: 18, padding: '4px 10px', color: 'var(--color-text-muted)', opacity: canGoNext ? 1 : 0.3 }}
        >
          →
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {/* Day headers */}
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', paddingBottom: 6 }}>
            {d}
          </div>
        ))}

        {/* Date cells */}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isFuture = dateStr > todayStr
          const isTooOld = dateStr < minDate
          const isDisabled = isFuture || isTooOld || loading
          const puzzle = crosswordsByDate[dateStr]
          const isToday = dateStr === todayStr
          const isSpinning = loadingDate === dateStr

          let bg = 'none'
          if (puzzle?.status === 'completed') bg = 'var(--color-correct-bg, #d4edda33)'
          else if (puzzle) bg = 'var(--color-accent)1a'

          return (
            <button
              key={day}
              onClick={() => !isDisabled && handleDateClick(dateStr)}
              disabled={isDisabled}
              title={puzzle ? (puzzle.status === 'completed' ? 'Completed — tap to open' : 'In progress — tap to open') : isFuture ? 'No puzzle yet' : ''}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '7px 2px 5px',
                borderRadius: 8,
                border: isToday ? '1.5px solid var(--color-accent)' : '1.5px solid transparent',
                background: bg,
                cursor: isDisabled ? 'default' : 'pointer',
                opacity: (isTooOld || isFuture) && !puzzle ? 0.25 : 1,
                transition: 'background 100ms',
                minHeight: 44,
              }}
            >
              {isSpinning ? (
                <Spinner size={14} />
              ) : (
                <>
                  <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, lineHeight: 1 }}>
                    {day}
                  </span>
                  {puzzle && (
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%', marginTop: 3,
                      background: puzzle.status === 'completed' ? 'var(--color-correct)' : 'var(--color-accent)',
                    }} />
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
          In progress
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-correct)', display: 'inline-block' }} />
          Completed
        </span>
      </div>

      {error && <p style={{ margin: 0, color: 'var(--color-incorrect)', fontSize: 14 }}>{error}</p>}
      {loading && !loadingDate && <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Fetching puzzle...</p>}
    </div>
  )
}

function SudokuPicker({ shelfId, onAdded, onBack }: { shelfId: string; onAdded: (id: string) => void; onBack: () => void }) {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert']
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setError('')
    setLoading(true)
    try {
      const result = await generateSudoku({ shelfId, difficulty })
      onAdded(result.data.puzzleId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate sudoku')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'left', padding: 0 }}>
        ← Back
      </button>
      <div>
        <label className="label">Difficulty</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {difficulties.map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                fontWeight: difficulty === d ? 700 : 400, fontSize: 13,
                background: difficulty === d ? 'var(--color-accent)' : 'var(--color-bg)',
                color: difficulty === d ? 'var(--color-surface)' : 'var(--color-text)',
                border: `1.5px solid ${difficulty === d ? 'var(--color-accent)' : 'var(--color-border)'}`,
                transition: 'all 150ms', textTransform: 'capitalize',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      {error && <p style={{ margin: 0, color: 'var(--color-incorrect)', fontSize: 14 }}>{error}</p>}
      <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Spinner size={16} /> Generating...
          </span>
        ) : 'Generate sudoku'}
      </button>
    </div>
  )
}
