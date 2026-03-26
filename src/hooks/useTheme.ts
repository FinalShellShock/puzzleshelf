import { useState } from 'react'

export function useTheme() {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains('dark')
  )

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    setDark(next)
  }

  return { dark, toggle }
}
