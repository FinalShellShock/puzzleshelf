import { useState, useRef, useEffect, type FormEvent } from 'react'
import { addDoc, collection, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useChat } from '../../hooks/useChat'
import { relativeTime, fullTime } from '../../utils/time'
import type { Shelf, ChatMessage } from '../../types'

const REACTIONS = ['👍', '😂', '🤔', '🔥', '😢', '😡']

interface Props {
  chatPath: string
  shelf: Shelf
  userId: string
}

export function ChatPanel({ chatPath, shelf, userId }: Props) {
  const { messages, loading } = useChat(chatPath)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [reactionTarget, setReactionTarget] = useState<string | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, chatPath), {
        text: text.trim(),
        sentBy: userId,
        sentAt: serverTimestamp(),
        reactions: {},
      })
      setText('')
    } finally {
      setSending(false)
    }
  }

  async function toggleReaction(msgId: string, emoji: string, currentReactions: string[]) {
    setReactionTarget(null)
    const msgRef = doc(db, chatPath, msgId)
    const hasReacted = currentReactions.includes(userId)
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: hasReacted ? arrayRemove(userId) : arrayUnion(userId),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 200 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <p style={{ color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center' }}>Loading...</p>}
        {!loading && messages.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center' }}>No messages yet</p>
        )}
        {messages.map(msg => (
          <MessageRow
            key={msg.id}
            msg={msg}
            shelf={shelf}
            userId={userId}
            isReactionOpen={reactionTarget === msg.id}
            onLongPress={() => setReactionTarget(reactionTarget === msg.id ? null : msg.id)}
            onReact={(emoji) => toggleReaction(msg.id, emoji, msg.reactions[emoji] ?? [])}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: '8px 12px', display: 'flex', gap: 8,
        borderTop: '1px solid var(--color-border)',
      }}>
        <input
          className="input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message..."
          style={{ flex: 1, minHeight: 40, padding: '8px 12px' }}
        />
        <button
          className="btn-primary"
          type="submit"
          disabled={!text.trim() || sending}
          style={{ padding: '8px 16px', minHeight: 40 }}
        >
          Send
        </button>
      </form>
    </div>
  )
}

function MessageRow({ msg, shelf, userId, isReactionOpen, onLongPress, onReact }: {
  msg: ChatMessage
  shelf: Shelf
  userId: string
  isReactionOpen: boolean
  onLongPress: () => void
  onReact: (emoji: string) => void
}) {
  const isMe = msg.sentBy === userId
  const sender = shelf.members[msg.sentBy]
  const senderColor = sender?.color ?? 'var(--color-text-muted)'
  const senderName = sender?.displayName ?? 'Unknown'
  const [showFullTime, setShowFullTime] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
      {!isMe && (
        <span style={{ fontSize: 11, fontWeight: 700, color: senderColor, marginBottom: 2, paddingLeft: 4 }}>
          {senderName}
        </span>
      )}
      <div style={{ position: 'relative' }}>
        <div
          onContextMenu={e => { e.preventDefault(); onLongPress() }}
          onClick={onLongPress}
          style={{
            padding: '8px 12px',
            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: isMe
              ? `color-mix(in srgb, ${senderColor} 15%, var(--color-surface))`
              : 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            maxWidth: 280,
            fontSize: 14, lineHeight: 1.5,
            cursor: 'pointer',
          }}
        >
          {msg.text}
        </div>

        {/* Reactions display */}
        {Object.entries(msg.reactions).some(([, users]) => users.length > 0) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {Object.entries(msg.reactions)
              .filter(([, users]) => users.length > 0)
              .map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  style={{
                    fontSize: 13, padding: '2px 8px', borderRadius: 12,
                    background: users.includes(userId)
                      ? 'color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))'
                      : 'var(--color-surface)',
                    border: `1px solid ${users.includes(userId) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {emoji} {users.length}
                </button>
              ))}
          </div>
        )}

        {/* Reaction picker */}
        {isReactionOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', [isMe ? 'right' : 'left']: 0,
            marginBottom: 4, background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 24, padding: '6px 10px',
            display: 'flex', gap: 4, zIndex: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}>
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span
        onClick={() => setShowFullTime(t => !t)}
        style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3, cursor: 'pointer', paddingLeft: 4, paddingRight: 4 }}
      >
        {showFullTime ? fullTime(msg.sentAt) : relativeTime(msg.sentAt)}
      </span>
    </div>
  )
}
