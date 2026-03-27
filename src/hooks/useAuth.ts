import { useState, useEffect } from 'react'
import { onAuthStateChanged, updateProfile, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tosAccepted, setTosAccepted] = useState<boolean | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid))
          const data = snap.data()
          const name = data?.displayName as string | undefined
          if (name && !u.displayName) {
            await updateProfile(u, { displayName: name })
            // onAuthStateChanged will fire again with the updated profile
            return
          }
          setTosAccepted(!!data?.tosAcceptedAt)
        } catch {
          setTosAccepted(false)
        }
      } else {
        setTosAccepted(null)
      }
      setUser(u)
      setLoading(false)
    })
  }, [])

  return { user, loading, tosAccepted }
}
