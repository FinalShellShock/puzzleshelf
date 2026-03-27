import { useState, useEffect } from 'react'
import { onAuthStateChanged, updateProfile, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u && !u.displayName) {
        // Auth profile missing displayName — try to restore it from Firestore
        try {
          const snap = await getDoc(doc(db, 'users', u.uid))
          const name = snap.data()?.displayName as string | undefined
          if (name) {
            await updateProfile(u, { displayName: name })
            // onAuthStateChanged will fire again with the updated profile
            return
          }
        } catch {
          // Fall through and return user as-is
        }
      }
      setUser(u)
      setLoading(false)
    })
  }, [])

  return { user, loading }
}
