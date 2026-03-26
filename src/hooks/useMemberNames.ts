import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Shelf } from '../types'

/**
 * Fetches authoritative display names from /users/{uid} for all current
 * and former shelf members. Falls back to the cached value in the shelf
 * document if the Firestore read fails.
 */
export function useMemberNames(shelf: Shelf | null | undefined): Record<string, string> {
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!shelf) return
    const uids = [
      ...Object.keys(shelf.members),
      ...Object.keys(shelf.formerMembers ?? {}),
    ]
    Promise.all(
      uids.map(uid =>
        getDoc(doc(db, 'users', uid)).then(snap => ({ uid, name: snap.data()?.displayName as string | undefined }))
      )
    ).then(results => {
      const names: Record<string, string> = {}
      results.forEach(({ uid, name }) => { if (name) names[uid] = name })
      setMemberNames(names)
    }).catch(() => {})
  }, [shelf?.id])

  return memberNames
}
