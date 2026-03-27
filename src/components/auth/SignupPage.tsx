import { useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { auth, db } from '../../lib/firebase'
import { Spinner } from '../ui/Spinner'

export function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTos, setAgreedToTos] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (!agreedToTos) { setError('You must agree to the Terms of Service to continue'); return }
    setError('')
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name.trim() })
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: name.trim(),
        email: email.toLowerCase(),
        createdAt: serverTimestamp(),
        tosAcceptedAt: serverTimestamp(),
      })
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? friendlyError(err.message) : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle} className="surface">
        <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800 }}>Puzzle Shelf</h1>
        <p style={{ margin: '0 0 28px', color: 'var(--color-text-muted)', fontSize: 15 }}>
          Create your account
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Display name</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Johnny"
              required
              autoComplete="name"
            />
          </div>
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
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6+ characters"
              required
              autoComplete="new-password"
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14, lineHeight: 1.5 }}>
            <input
              type="checkbox"
              checked={agreedToTos}
              onChange={e => setAgreedToTos(e.target.checked)}
              style={{ marginTop: 3, accentColor: 'var(--color-accent)', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
            />
            <span>
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>
            </span>
          </label>

          {error && (
            <p style={{ margin: 0, color: 'var(--color-incorrect)', fontSize: 14 }}>{error}</p>
          )}

          <button className="btn-primary" type="submit" disabled={loading || !agreedToTos} style={{ marginTop: 4 }}>
            {loading ? <Spinner size={18} /> : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function friendlyError(msg: string): string {
  if (msg.includes('email-already-in-use')) return 'An account with this email already exists'
  if (msg.includes('invalid-email')) return 'Invalid email address'
  if (msg.includes('weak-password')) return 'Password must be at least 6 characters'
  return 'Sign up failed. Please try again.'
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
