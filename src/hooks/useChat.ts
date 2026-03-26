import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { ChatMessage } from '../types'

export function useChat(path: string, messageLimit = 100) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!path) return
    const q = query(
      collection(db, path),
      orderBy('sentAt', 'asc'),
      limit(messageLimit)
    )
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ChatMessage))
      setLoading(false)
    })
  }, [path, messageLimit])

  return { messages, loading }
}
