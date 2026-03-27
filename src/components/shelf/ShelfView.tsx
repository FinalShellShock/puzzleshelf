import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, deleteField } from 'firebase/firestore'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useShelf } from '../../hooks/useShelf'
import { useMemberNames } from '../../hooks/useMemberNames'
import { PuzzleCard } from '../library/PuzzleCard'
import { AddPuzzleModal } from '../library/AddPuzzleModal'
import { ChatPanel } from '../chat/ChatPanel'
import { ShelfStats } from '../stats/ShelfStats'
import { Spinner } from '../ui/Spinner'
import type { Puzzle } from '../../types'

type Tab = 'puzzles' | 'chat' | 'stats'

export function ShelfView() {
  const { shelfId } = useParams<{ shelfId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { shelf, loading: shelfLoading } = useShelf(shelfId)
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const [puzzlesLoading, setPuzzlesLoading] = useState(true)
  const [showAddPuzzle, setShowAddPuzzle] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('puzzles')
  const memberNames = useMemberNames(shelf)

  // Subscribe to puzzles
  useEffect(() => {
    if (!shelfId) return
    const q = query(collection(db, 'shelves', shelfId, 'puzzles'), orderBy('addedAt', 'desc'))
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Puzzle)
      setPuzzles(all.filter(p => p.status !== 'deleted'))
      setPuzzlesLoading(false)
    })
  }, [shelfId])

  // Update presence: currentPuzzle = null when on shelf view; also refresh displayName in case it was stored incorrectly
  useEffect(() => {
    if (!shelfId || !user || !user.displayName) return
    updateDoc(doc(db, 'shelves', shelfId), {
      [`members.${user.uid}.currentPuzzle`]: null,
      [`members.${user.uid}.lastSeen`]: serverTimestamp(),
      [`members.${user.uid}.displayName`]: user.displayName,
    }).catch(() => {})
  }, [shelfId, user])

  async function handleLeave() {
    if (!shelfId || !user || !shelf) return
    setActionLoading(true)
    const me = shelf.members[user.uid]
    try {
      await updateDoc(doc(db, 'shelves', shelfId), {
        [`members.${user.uid}`]: deleteField(),
        [`formerMembers.${user.uid}`]: { ...me, leftAt: serverTimestamp() },
      })
      navigate('/')
    } catch {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!shelfId) return
    setActionLoading(true)
    try {
      await deleteDoc(doc(db, 'shelves', shelfId))
      navigate('/')
    } catch {
      setActionLoading(false)
    }
  }

  if (shelfLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (!shelf) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Shelf not found.</p>
        <button className="btn-secondary" onClick={() => navigate('/')}>Back home</button>
      </div>
    )
  }

  const members = Object.entries(shelf.members)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px 0',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--color-bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 20, padding: '4px 0', lineHeight: 1 }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{shelf.name}</h1>
          </div>
          {/* Member presence dots — tap to open members sheet */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              onClick={() => setShowMembers(true)}
              style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {members.map(([uid, m]) => {
                const name = memberNames[uid] ?? m.displayName
                return (
                  <div key={uid} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: m.color + '33',
                    border: `2px solid ${m.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: m.color,
                  }}>
                    {name[0].toUpperCase()}
                  </div>
                )
              })}
            </button>
            {members.length < 4 && (
              <button
                onClick={() => setShowInvite(true)}
                title="Invite someone"
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'none',
                  border: '2px dashed var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1,
                  padding: 0,
                }}
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          {(['puzzles', 'chat', 'stats'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: tab === t ? 700 : 400,
                color: tab === t ? 'var(--color-text)' : 'var(--color-text-muted)',
                borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1, transition: 'color 150ms',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {tab === 'puzzles' && (
          <>
            {puzzlesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
            ) : puzzles.length === 0 ? (
              <div className="surface" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600 }}>Empty shelf</p>
                <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 14 }}>
                  Add your first puzzle to get started.
                </p>
                <button className="btn-primary" onClick={() => setShowAddPuzzle(true)}>
                  Add puzzle
                </button>
              </div>
            ) : (
              (() => {
                const activePuzzles = puzzles.filter(p => p.status !== 'completed')
                const completedPuzzles = puzzles.filter(p => p.status === 'completed')
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {activePuzzles.map(puzzle => (
                      <PuzzleCard
                        key={puzzle.id}
                        puzzle={puzzle}
                        shelf={shelf}
                        userId={user!.uid}
                        onClick={() => navigate(`/shelf/${shelfId}/puzzle/${puzzle.id}`)}
                      />
                    ))}
                    {completedPuzzles.length > 0 && (
                      <>
                        <div style={{
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.08em', color: 'var(--color-text-muted)',
                          padding: activePuzzles.length > 0 ? '8px 4px 0' : '0 4px',
                        }}>
                          Completed
                        </div>
                        {completedPuzzles.map(puzzle => (
                          <PuzzleCard
                            key={puzzle.id}
                            puzzle={puzzle}
                            shelf={shelf}
                            userId={user!.uid}
                            onClick={() => navigate(`/shelf/${shelfId}/puzzle/${puzzle.id}`)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )
              })()
            )}

            {puzzles.length > 0 && (
              <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => setShowAddPuzzle(true)}>
                + Add puzzle
              </button>
            )}
          </>
        )}

        {tab === 'chat' && (
          <ChatPanel
            chatPath={`shelves/${shelfId}/chat`}
            shelf={shelf}
            userId={user!.uid}
          />
        )}

        {tab === 'stats' && (
          <ShelfStats shelf={shelf} puzzles={puzzles} memberNames={memberNames} />
        )}
      </div>

      {showMembers && shelf && user && (
        <div
          onClick={() => { setShowMembers(false); setConfirmDelete(false); setConfirmLeave(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--color-surface)', borderRadius: '16px 16px 0 0', padding: '24px 20px 40px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Members</h2>
              <button onClick={() => { setShowMembers(false); setConfirmDelete(false); setConfirmLeave(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', lineHeight: 1 }}>×</button>
            </div>

            {/* Current members */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {members.map(([uid, m]) => {
                const name = memberNames[uid] ?? m.displayName
                return (
                  <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color + '33', border: `2px solid ${m.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: m.color, flexShrink: 0 }}>
                      {name[0].toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{name}</span>
                    {uid === shelf.createdBy && (
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderRadius: 4, padding: '2px 6px' }}>creator</span>
                    )}
                    {uid === user.uid && (
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>you</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Former members */}
            {Object.keys(shelf.formerMembers ?? {}).length > 0 && (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Former members</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {Object.entries(shelf.formerMembers!).map(([uid, m]) => {
                    const name = memberNames[uid] ?? m.displayName
                    return (
                      <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.6 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#A0989033', border: '2px solid #A09890', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#A09890', flexShrink: 0 }}>
                          {name[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>{name}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Actions */}
            {shelf.createdBy === user.uid ? (
              confirmDelete ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--color-text-muted)' }}>
                    Permanently delete <strong style={{ color: 'var(--color-text)' }}>{shelf.name}</strong> and all its puzzles?
                  </p>
                  <button className="btn-primary" onClick={handleDelete} disabled={actionLoading}
                    style={{ background: 'var(--color-incorrect)', border: 'none' }}>
                    {actionLoading ? 'Deleting…' : 'Yes, delete shelf'}
                  </button>
                  <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={actionLoading}>Cancel</button>
                </div>
              ) : (
                <button className="btn-secondary" onClick={() => setConfirmDelete(true)}
                  style={{ width: '100%', color: 'var(--color-incorrect)', borderColor: 'var(--color-incorrect)' }}>
                  Delete shelf
                </button>
              )
            ) : (
              confirmLeave ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--color-text-muted)' }}>
                    Leave <strong style={{ color: 'var(--color-text)' }}>{shelf.name}</strong>? Your contributions will stay.
                  </p>
                  <button className="btn-primary" onClick={handleLeave} disabled={actionLoading}
                    style={{ background: 'var(--color-incorrect)', border: 'none' }}>
                    {actionLoading ? 'Leaving…' : 'Yes, leave shelf'}
                  </button>
                  <button className="btn-secondary" onClick={() => setConfirmLeave(false)} disabled={actionLoading}>Cancel</button>
                </div>
              ) : (
                <button className="btn-secondary" onClick={() => setConfirmLeave(true)}
                  style={{ width: '100%', color: 'var(--color-incorrect)', borderColor: 'var(--color-incorrect)' }}>
                  Leave shelf
                </button>
              )
            )}
          </div>
        </div>
      )}

      {showInvite && shelf && (
        <div
          onClick={() => setShowInvite(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, margin: '0 auto',
              background: 'var(--color-surface)',
              borderRadius: '16px 16px 0 0',
              padding: '24px 20px 40px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Invite to shelf</h2>
              <button
                onClick={() => setShowInvite(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)', fontSize: 14 }}>
              Share this code with someone to invite them to <strong style={{ color: 'var(--color-text)' }}>{shelf.name}</strong>.
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 10, padding: '12px 16px',
              marginBottom: 16,
            }}>
              <span style={{ flex: 1, fontSize: 28, fontWeight: 800, letterSpacing: 6, fontVariantNumeric: 'tabular-nums' }}>
                {shelf.inviteCode}
              </span>
              <button
                className="btn-secondary"
                style={{ flexShrink: 0, minWidth: 80 }}
                onClick={() => {
                  navigator.clipboard.writeText(shelf.inviteCode).catch(() => {})
                  setCodeCopied(true)
                  setTimeout(() => setCodeCopied(false), 2000)
                }}
              >
                {codeCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
              {4 - members.length} spot{4 - members.length !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
      )}

      {showAddPuzzle && shelfId && (
        <AddPuzzleModal
          shelfId={shelfId}
          userId={user!.uid}
          puzzles={puzzles}
          onClose={() => setShowAddPuzzle(false)}
          onAdded={puzzleId => { setShowAddPuzzle(false); navigate(`/shelf/${shelfId}/puzzle/${puzzleId}`) }}
        />
      )}
    </div>
  )
}
