import { useTheme } from '../../hooks/useTheme'

export function DarkModeToggle() {
  const { dark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: dark ? 'rgba(20, 28, 88, 0.85)' : 'rgba(237, 252, 247, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1.5px solid ${dark ? 'rgba(160, 237, 216, 0.25)' : 'rgba(26, 36, 104, 0.15)'}`,
        boxShadow: dark
          ? '0 4px 20px rgba(0,0,0,0.4)'
          : '0 4px 20px rgba(26,36,104,0.12)',
        cursor: 'pointer',
        fontSize: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
        padding: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
