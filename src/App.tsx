import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from './components/auth/AuthGuard'
import { LoginPage } from './components/auth/LoginPage'
import { SignupPage } from './components/auth/SignupPage'
import { ShelfListPage } from './components/shelf/ShelfListPage'
import { ShelfView } from './components/shelf/ShelfView'
import { PuzzleView } from './components/library/PuzzleView'

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <BrowserRouter>
      {/* Dark mode toggle — fixed in corner */}
      <button
        onClick={() => setDark(d => !d)}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 100,
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<AuthGuard><ShelfListPage /></AuthGuard>} />
        <Route path="/shelf/:shelfId" element={<AuthGuard><ShelfView /></AuthGuard>} />
        <Route path="/shelf/:shelfId/puzzle/:puzzleId" element={<AuthGuard><PuzzleView /></AuthGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
