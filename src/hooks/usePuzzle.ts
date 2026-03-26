import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Puzzle } from '../types'

export function usePuzzle(shelfId: string | undefined, puzzleId: string | undefined) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shelfId || !puzzleId) { setLoading(false); return }
    return onSnapshot(doc(db, 'shelves', shelfId, 'puzzles', puzzleId), snap => {
      if (snap.exists()) {
        setPuzzle({ id: snap.id, ...snap.data() } as Puzzle)
      } else {
        setPuzzle(null)
      }
      setLoading(false)
    })
  }, [shelfId, puzzleId])

  return { puzzle, loading }
}
