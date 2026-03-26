import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Shelf } from '../types'

export function useShelf(shelfId: string | undefined) {
  const [shelf, setShelf] = useState<Shelf | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shelfId) { setLoading(false); return }
    return onSnapshot(doc(db, 'shelves', shelfId), snap => {
      if (snap.exists()) {
        setShelf({ id: snap.id, ...snap.data() } as Shelf)
      } else {
        setShelf(null)
      }
      setLoading(false)
    })
  }, [shelfId])

  return { shelf, loading }
}
