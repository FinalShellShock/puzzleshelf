import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from './components/auth/AuthGuard'
import { LoginPage } from './components/auth/LoginPage'
import { SignupPage } from './components/auth/SignupPage'
import { ShelfListPage } from './components/shelf/ShelfListPage'
import { ShelfView } from './components/shelf/ShelfView'
import { PuzzleView } from './components/library/PuzzleView'
import { TermsPage } from './components/legal/TermsPage'
import { PrivacyPage } from './components/legal/PrivacyPage'
import { Footer } from './components/ui/Footer'

export default function App() {
  // Initialize theme from localStorage / system preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  }, [])

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/" element={<AuthGuard><ShelfListPage /></AuthGuard>} />
          <Route path="/shelf/:shelfId" element={<AuthGuard><ShelfView /></AuthGuard>} />
          <Route path="/shelf/:shelfId/puzzle/:puzzleId" element={<AuthGuard><PuzzleView /></AuthGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
