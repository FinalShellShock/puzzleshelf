import type { Timestamp } from 'firebase/firestore'

export function relativeTime(ts: Timestamp): string {
  const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return ts.toDate().toLocaleDateString()
}

export function fullTime(ts: Timestamp): string {
  return ts.toDate().toLocaleString()
}
