import type React from 'react'

interface Props {
  onLetter: (letter: string) => void
  onDelete: () => void
}

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

export function CrosswordKeyboard({ onLetter, onDelete }: Props) {
  function tap(fn: () => void) {
    return (e: React.PointerEvent) => {
      e.preventDefault()
      fn()
    }
  }

  return (
    <div style={{
      background: 'var(--color-bg)',
      borderTop: '1px solid var(--color-border)',
      padding: '8px 3px',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      userSelect: 'none',
      flexShrink: 0,
    }}>
      {ROWS.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
          {i === 2 && <div style={{ flex: 1.5 }} />}
          {row.split('').map(letter => (
            <button
              key={letter}
              style={keyStyle}
              onPointerDown={tap(() => onLetter(letter))}
            >
              {letter}
            </button>
          ))}
          {i === 2 && (
            <button style={{ ...keyStyle, flex: 1.5, fontSize: 18 }} onPointerDown={tap(onDelete)}>
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

const keyStyle: React.CSSProperties = {
  flex: 1,
  height: 42,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-text)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  padding: 0,
  minWidth: 0,
  boxShadow: '0 2px 0 var(--color-border)',
}
