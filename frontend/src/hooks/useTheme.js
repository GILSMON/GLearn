import { useState, useEffect } from 'react'

/**
 * useTheme — manages dark/light mode.
 *
 * On first load: reads system preference (prefers-color-scheme).
 * Stores the user's choice in localStorage so it persists across refreshes.
 * Applies 'dark' class to <html> element — Tailwind picks this up.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then fall back to system preference
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = () => setIsDark(prev => !prev)

  return { isDark, toggle }
}
