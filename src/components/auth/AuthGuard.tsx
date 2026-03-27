import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../ui/Spinner'
import { TosModal } from './TosModal'
import type { ReactNode } from 'react'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, tosAccepted } = useAuth()
  const [tosOverride, setTosOverride] = useState(false)

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!tosOverride && tosAccepted === false) {
    return <TosModal userId={user.uid} onAccepted={() => setTosOverride(true)} />
  }

  return <>{children}</>
}
