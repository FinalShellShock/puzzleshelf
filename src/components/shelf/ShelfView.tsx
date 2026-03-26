import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useShelf } from '../../hooks/useShelf'
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
  const [tab, setTab] = useState<Tab>('puzzles')

  // Subscribe to puzzles
  useEffect(() => {
    if (!shelfId) return
    const q = query(collection(db, 'shelves', shelfId, 'puzzles'), orderBy('addedAt', 'desc'))
    return onSnapshot(q, snap => {
      setPuzzles(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Puzzle))
      setPuzzlesLoading(false)
    })
  }, [shelfId])

  // Update presence: currentPuzzle = null when on shelf view
  useEffect(() => {
    if (!shelfId || !user) return
    updateDoc(doc(db, 'shelves', shelfId), {
      [`members.${user.uid}.currentPuzzle`]: null,
      [`members.${user.uid}.lastSeen`]: serverTimestamp(),
    }).catch(() => {})
  }, [shelfId, user])

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
          {/* Member presence dots */}
          <div style={{ display: 'flex', gap: 4 }}>
            {members.map(([uid, m]) => (
              <div key={uid} title={m.displayName} style={{ position: 'relative' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: m.color + '33',
                  border: `2px solid ${m.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: m.color,
                }}>
                  {m.displayName[0].toUpperCase()}
                </div>
              </div>
            ))}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {puzzles.map(puzzle => (
                  <PuzzleCard
                    key={puzzle.id}
                    puzzle={puzzle}
                    shelf={shelf}
                    userId={user!.uid}
                    onClick={() => navigate(`/shelf/${shelfId}/puzzle/${puzzle.id}`)}
                  />
                ))}
              </div>
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
          <ShelfStats shelf={shelf} puzzles={puzzles} />
        )}
      </div>

      {showAddPuzzle && shelfId && (
        <AddPuzzleModal
          shelfId={shelfId}
          userId={user!.uid}
          onClose={() => setShowAddPuzzle(false)}
          onAdded={puzzleId => navigate(`/shelf/${shelfId}/puzzle/${puzzleId}`)}
        />
      )}
    </div>
  )
}
