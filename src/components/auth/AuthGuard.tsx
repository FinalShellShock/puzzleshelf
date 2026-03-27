import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../ui/Spinner'
import { TosModal } from './TosModal'
import type { ReactNode } from 'react'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [tosAccepted, setTosAccepted] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) { setTosAccepted(null); return }
    setTosAccepted(null)
    getDoc(doc(db, 'users', user.uid))
      .then(snap => setTosAccepted(!!snap.data()?.tosAcceptedAt))
      .catch(() => setTosAccepted(false))
  }, [user?.uid])

  if (loading || (user && tosAccepted === null)) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (tosAccepted === false) {
    return <TosModal userId={user.uid} onAccepted={() => setTosAccepted(true)} />
  }

  return <>{children}</>
}
