import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useShelf } from '../../hooks/useShelf'
import { usePuzzle } from '../../hooks/usePuzzle'
import { CrosswordRenderer } from '../crossword/CrosswordRenderer'
import { SudokuRenderer } from '../sudoku/SudokuRenderer'
import { Spinner } from '../ui/Spinner'

export function PuzzleView() {
  const { shelfId, puzzleId } = useParams<{ shelfId: string; puzzleId: string }>()
  const { user } = useAuth()
  const { shelf, loading: shelfLoading } = useShelf(shelfId)
  const { puzzle, loading: puzzleLoading } = usePuzzle(shelfId, puzzleId)

  // Update presence: mark user as in this puzzle
  useEffect(() => {
    if (!shelfId || !puzzleId || !user) return
    updateDoc(doc(db, 'shelves', shelfId), {
      [`members.${user.uid}.currentPuzzle`]: puzzleId,
      [`members.${user.uid}.lastSeen`]: serverTimestamp(),
    }).catch(() => {})
    // Clear presence when leaving
    return () => {
      updateDoc(doc(db, 'shelves', shelfId), {
        [`members.${user.uid}.currentPuzzle`]: null,
      }).catch(() => {})
    }
  }, [shelfId, puzzleId, user])

  // Heartbeat: keep lastSeen fresh so stale presence is detectable
  useEffect(() => {
    if (!shelfId || !user) return
    const interval = setInterval(() => {
      updateDoc(doc(db, 'shelves', shelfId), {
        [`members.${user.uid}.lastSeen`]: serverTimestamp(),
      }).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [shelfId, user])

  if (shelfLoading || puzzleLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (!shelf || !puzzle || !user) {
    return <div style={{ padding: 24 }}>Puzzle not found.</div>
  }

  if (puzzle.type === 'crossword') {
    return <CrosswordRenderer puzzle={puzzle} shelf={shelf} userId={user.uid} shelfId={shelfId!} />
  }

  if (puzzle.type === 'sudoku') {
    return <SudokuRenderer puzzle={puzzle} shelf={shelf} userId={user.uid} shelfId={shelfId!} />
  }

  return <div style={{ padding: 24 }}>Unknown puzzle type.</div>
}
