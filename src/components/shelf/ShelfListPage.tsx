import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { db, auth } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useMemberNames } from '../../hooks/useMemberNames'
import { USER_COLORS, getAvailableColors } from '../../utils/colors'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import type { Shelf } from '../../types'

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function ShelfListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'shelves'),
      where(`members.${user.uid}.joinedAt`, '!=', null)
    )
    return onSnapshot(q, snap => {
      setShelves(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Shelf))
      setLoading(false)
    })
  }, [user])

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Puzzle Shelf</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
            {user?.displayName ?? user?.email}
          </p>
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13 }}
        >
          Sign out
        </button>
      </div>

      {/* Shelf list */}
      {shelves.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="surface" style={{ padding: '28px 24px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: 22 }}>🧩</p>
            <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>Welcome to Puzzle Shelf!</p>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5 }}>
              A shelf is a shared space where you and your group track your puzzle collection. Get started below.
            </p>
          </div>
          <button
            className="surface"
            onClick={() => setShowCreate(true)}
            style={{ padding: '20px 24px', textAlign: 'left', border: 'none', cursor: 'pointer', width: '100%' }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Create a shelf</p>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Start fresh — set up a shelf for your household or group.
            </p>
          </button>
          <button
            className="surface"
            onClick={() => setShowJoin(true)}
            style={{ padding: '20px 24px', textAlign: 'left', border: 'none', cursor: 'pointer', width: '100%' }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Join a shelf</p>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Got an invite code? Join a shelf someone shared with you.
            </p>
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shelves.map(shelf => (
              <ShelfCard key={shelf.id} shelf={shelf} userId={user!.uid} onClick={() => navigate(`/shelf/${shelf.id}`)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => setShowCreate(true)}>
              New shelf
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowJoin(true)}>
              Join shelf
            </button>
          </div>
        </>
      )}

      {showCreate && user && (
        <CreateShelfModal userId={user.uid} displayName={user.displayName ?? 'You'} onClose={() => setShowCreate(false)} onCreated={id => navigate(`/shelf/${id}`)} />
      )}
      {showJoin && user && (
        <JoinShelfModal userId={user.uid} displayName={user.displayName ?? 'You'} onClose={() => setShowJoin(false)} onJoined={id => navigate(`/shelf/${id}`)} />
      )}
    </div>
  )
}

function ShelfCard({ shelf, userId, onClick }: { shelf: Shelf; userId: string; onClick: () => void }) {
  const memberList = Object.entries(shelf.members)
  const myMember = shelf.members[userId]
  const memberNames = useMemberNames(shelf)

  return (
    <button
      onClick={onClick}
      className="surface"
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: 20, cursor: 'pointer', border: '1px solid var(--color-border)',
        borderRadius: 12, background: 'var(--color-surface)',
        transition: 'opacity 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{shelf.name}</span>
        {myMember && (
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: myMember.color, display: 'inline-block',
          }} />
        )}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
        {memberList.map(([uid, m]) => (
          <span key={uid} style={{
            fontSize: 12, padding: '2px 8px', borderRadius: 20,
            background: m.color + '22', color: m.color, fontWeight: 600,
          }}>
            {memberNames[uid] ?? m.displayName}
          </span>
        ))}
      </div>
    </button>
  )
}

function CreateShelfModal({ userId, displayName, onClose, onCreated }: {
  userId: string
  displayName: string
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(USER_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Give your shelf a name'); return }
    setLoading(true)
    try {
      const ref = await addDoc(collection(db, 'shelves'), {
        name: name.trim(),
        inviteCode: generateInviteCode(),
        createdBy: userId,
        createdAt: serverTimestamp(),
        members: {
          [userId]: {
            displayName,
            color: color.hex,
            colorName: color.name,
            joinedAt: serverTimestamp(),
            currentPuzzle: null,
            lastSeen: serverTimestamp(),
          }
        }
      })
      onCreated(ref.id)
    } catch {
      setError('Failed to create shelf')
      setLoading(false)
    }
  }

  return (
    <Modal title="New shelf" onClose={onClose} footer={
      <button className="btn-primary" style={{ width: '100%' }} onClick={handleCreate} disabled={loading}>
        {loading ? <Spinner size={18} /> : 'Create shelf'}
      </button>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="label">Shelf name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Johnny & Kelly's Shelf" autoFocus />
        </div>
        <div>
          <label className="label">Your color</label>
          <ColorPicker selected={color} available={USER_COLORS} onSelect={setColor} />
        </div>
        {error && <p style={{ margin: 0, color: 'var(--color-incorrect)', fontSize: 14 }}>{error}</p>}
      </div>
    </Modal>
  )
}

function JoinShelfModal({ userId, displayName, onClose, onJoined }: {
  userId: string
  displayName: string
  onClose: () => void
  onJoined: (id: string) => void
}) {
  const [code, setCode] = useState('')
  const [shelf, setShelf] = useState<Shelf | null>(null)
  const [color, setColor] = useState(USER_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isRejoining = !!(shelf && shelf.formerMembers?.[userId])

  async function lookupCode() {
    setError('')
    setLoading(true)
    try {
      const q = query(collection(db, 'shelves'), where('inviteCode', '==', code.toUpperCase()))
      const snap = await getDocs(q)
      if (snap.empty) { setError('No shelf found with that code'); setLoading(false); return }
      const found = { id: snap.docs[0].id, ...snap.docs[0].data() } as Shelf
      if (found.members[userId]) { setError('You are already on this shelf'); setLoading(false); return }
      if (Object.keys(found.members).length >= 4) { setError('This shelf is full (max 4 members)'); setLoading(false); return }
      setShelf(found)
    } catch {
      setError('Failed to look up code')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!shelf) return
    setLoading(true)
    try {
      const update: Record<string, unknown> = {
        [`members.${userId}`]: {
          displayName,
          color: color.hex,
          colorName: color.name,
          joinedAt: serverTimestamp(),
          currentPuzzle: null,
          lastSeen: serverTimestamp(),
        }
      }
      // Remove from formerMembers if rejoining
      if (isRejoining) {
        const { deleteField } = await import('firebase/firestore')
        update[`formerMembers.${userId}`] = deleteField()
      }
      await updateDoc(doc(db, 'shelves', shelf.id), update)
      onJoined(shelf.id)
    } catch {
      setError('Failed to join shelf')
      setLoading(false)
    }
  }

  const takenColors = shelf ? Object.values(shelf.members).map(m => m.color) : []
  const available = getAvailableColors(takenColors)

  return (
    <Modal title="Join a shelf" onClose={onClose} footer={
      shelf ? (
        <button className="btn-primary" style={{ width: '100%' }} onClick={handleJoin} disabled={loading}>
          {loading ? <Spinner size={18} /> : isRejoining ? `Rejoin "${shelf.name}"` : `Join "${shelf.name}"`}
        </button>
      ) : null
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!shelf ? (
          <>
            <div>
              <label className="label">Invite code</label>
              <input
                className="input"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                autoFocus
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}
              />
            </div>
            <button className="btn-primary" onClick={lookupCode} disabled={loading || code.length < 4}>
              {loading ? <Spinner size={18} /> : 'Look up code'}
            </button>
          </>
        ) : (
          <>
            <div className="surface" style={{ padding: 14, borderRadius: 10 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{shelf.name}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                {Object.keys(shelf.members).length} member{Object.keys(shelf.members).length !== 1 ? 's' : ''}
              </p>
              {isRejoining && (
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-accent)', fontWeight: 600 }}>
                  Welcome back — your contributions are still here.
                </p>
              )}
            </div>
            <div>
              <label className="label">Choose your color</label>
              {available.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No colors available</p>
              ) : (
                <ColorPicker selected={color} available={available} onSelect={setColor} />
              )}
            </div>
          </>
        )}
        {error && <p style={{ margin: 0, color: 'var(--color-incorrect)', fontSize: 14 }}>{error}</p>}
      </div>
    </Modal>
  )
}

function ColorPicker({ selected, available, onSelect }: {
  selected: typeof USER_COLORS[0]
  available: typeof USER_COLORS
  onSelect: (c: typeof USER_COLORS[0]) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {available.map(c => (
        <button
          key={c.hex}
          onClick={() => onSelect(c)}
          title={c.name}
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            background: c.hex,
            border: selected.hex === c.hex ? '3px solid var(--color-text)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'border 100ms',
            padding: 0,
          }}
        />
      ))}
    </div>
  )
}
