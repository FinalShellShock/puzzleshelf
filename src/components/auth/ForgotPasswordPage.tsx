import { useState, type FormEvent } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { auth } from '../../lib/firebase'
import { Spinner } from '../ui/Spinner'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('user-not-found') || msg.includes('invalid-email')) {
        setError('No account found with that email address.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle} className="surface">
        <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800 }}>Puzzle Shelf</h1>
        <p style={{ margin: '0 0 28px', color: 'var(--color-text-muted)', fontSize: 15 }}>
          Reset your password
        </p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 24, lineHeight: 1.5 }}>
              Check your email — we sent a reset link to <strong>{email}</strong>.
            </p>
            <Link
              to="/login"
              style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {error && (
              <p style={{ margin: 0, color: 'var(--color-incorrect)', fontSize: 14 }}>{error}</p>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <Spinner size={18} /> : 'Send reset link'}
            </button>

            <p style={{ marginTop: 4, textAlign: 'center', fontSize: 14, color: 'var(--color-text-muted)' }}>
              <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  padding: 32,
}
