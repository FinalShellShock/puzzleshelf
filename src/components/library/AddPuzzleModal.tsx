import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { fetchCrossword, generateSudoku } from '../../lib/functions'

type PuzzleType = 'crossword' | 'sudoku'
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

interface Props {
  shelfId: string
  userId: string
  onClose: () => void
  onAdded: (puzzleId: string) => void
}

export function AddPuzzleModal({ shelfId, onClose, onAdded }: Props) {
  const [type, setType] = useState<PuzzleType | null>(null)

  return (
    <Modal title="Add a puzzle" onClose={onClose}>
      {type === null && <TypePicker onSelect={setType} />}
      {type === 'crossword' && <CrosswordPicker shelfId={shelfId} onAdded={onAdded} onBack={() => setType(null)} />}
      {type === 'sudoku' && <SudokuPicker shelfId={shelfId} onAdded={onAdded} onBack={() => setType(null)} />}
    </Modal>
  )
}

function TypePicker({ onSelect }: { onSelect: (t: PuzzleType) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TypeButton
        icon="✏️"
        title="Crossword"
        description="LA Times daily crossword"
        onClick={() => onSelect('crossword')}
      />
      <TypeButton
        icon="🔢"
        title="Sudoku"
        description="Classic 9×9, algorithmically generated"
        onClick={() => onSelect('sudoku')}
      />
    </div>
  )
}

function TypeButton({ icon, title, description, onClick }: {
  icon: string; title: string; description: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: 16, borderRadius: 12, cursor: 'pointer',
        background: 'var(--color-bg)',
        border: '1.5px solid var(--color-border)',
        textAlign: 'left', transition: 'border-color 150ms',
        width: '100%',
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

function CrosswordPicker({ shelfId, onAdded, onBack }: { shelfId: string; onAdded: (id: string) => void; onBack: () => void }) {
  // Default to today
  const today = new Date()
  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  const [date, setDate] = useState(formatDate(today))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFetch() {
    setError('')
    setLoading(true)
    try {
      const result = await fetchCrossword({ shelfId, date })
      onAdded(result.data.puzzleId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch crossword'
      setError(msg.includes('not available') ? `No crossword available for ${date}` : msg)
    } finally {
      setLoading(false)
    }
  }

  // Max date = today, min date = 90 days ago (roughly)
  const minDate = formatDate(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'left', padding: 0 }}>
        ← Back
      </button>
      <div>
        <label className="label">Select date</label>
        <input
          className="input"
          type="date"
          value={date}
          min={minDate}
          max={formatDate(today)}
          onChange={e => setDate(e.target.value)}
        />
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
          LA Times crossword for this date
        </p>
      </div>
      {error && <p style={{ margin: 0, color: 'var(--color-incorrect)', fontSize: 14 }}>{error}</p>}
      <button className="btn-primary" onClick={handleFetch} disabled={loading}>
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Spinner size={16} /> Fetching puzzle...
          </span>
        ) : 'Add crossword'}
      </button>
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
                fontWeight: difficulty === d ? 700 : 400,
                fontSize: 13,
                background: difficulty === d ? 'var(--color-accent)' : 'var(--color-bg)',
                color: difficulty === d ? 'var(--color-surface)' : 'var(--color-text)',
                border: `1.5px solid ${difficulty === d ? 'var(--color-accent)' : 'var(--color-border)'}`,
                transition: 'all 150ms',
                textTransform: 'capitalize',
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
