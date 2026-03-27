import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Spinner } from '../ui/Spinner'

interface TosModalProps {
  userId: string
  onAccepted: () => void
}

export function TosModal({ userId, onAccepted }: TosModalProps) {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    if (!agreed || loading) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', userId), { tosAcceptedAt: serverTimestamp() })
      onAccepted()
    } catch {
      setLoading(false)
    }
  }

  return (
    // No onClick on backdrop, no Escape handler — intentionally non-dismissible
    <div style={overlayStyle}>
      <div className="surface" style={panelStyle}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>
          Updated Terms of Service
        </h2>
        <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 15, lineHeight: 1.55 }}>
          We've added Terms of Service and a Privacy Policy. Please review and accept to continue using Puzzle Shelf.
        </p>

        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={docLinkStyle}>
            Read Terms of Service ↗
          </a>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={docLinkStyle}>
            Read Privacy Policy ↗
          </a>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 24 }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop: 3, accentColor: 'var(--color-accent)', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, lineHeight: 1.5 }}>
            I agree to the Terms of Service and Privacy Policy
          </span>
        </label>

        <button
          className="btn-primary"
          onClick={handleAccept}
          disabled={!agreed || loading}
          style={{ width: '100%' }}
        >
          {loading ? <Spinner size={18} /> : 'Continue'}
        </button>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}

const panelStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 440,
  padding: 32,
  borderRadius: 16,
}

const docLinkStyle: React.CSSProperties = {
  color: 'var(--color-accent)',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
}
