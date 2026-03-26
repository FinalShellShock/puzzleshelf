import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Sheet slides up from bottom on mobile */}
      <div
        className="surface"
        style={{
          width: '100%', maxWidth: 480,
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: '24px 24px 40px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: 'none',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--color-border)',
          margin: '-8px auto 20px',
        }} />

        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{title}</h2>
        {children}
        {footer && (
          <div style={{ marginTop: 20 }}>{footer}</div>
        )}
      </div>
    </div>
  )
}
