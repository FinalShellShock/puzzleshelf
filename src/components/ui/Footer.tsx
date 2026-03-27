import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer style={footerStyle}>
      <span>© 2026 Puzzle Shelf. All rights reserved.</span>
      <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
      <Link to="/terms" style={linkStyle}>Terms of Service</Link>
      <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
      <Link to="/privacy" style={linkStyle}>Privacy Policy</Link>
    </footer>
  )
}

const footerStyle: React.CSSProperties = {
  marginTop: 'auto',
  padding: '14px 24px',
  textAlign: 'center',
  fontSize: 12,
  color: 'var(--color-text-muted)',
  borderTop: '1px solid var(--color-border)',
  opacity: 0.75,
}

const linkStyle: React.CSSProperties = {
  color: 'var(--color-text-muted)',
  textDecoration: 'none',
  fontWeight: 500,
}
