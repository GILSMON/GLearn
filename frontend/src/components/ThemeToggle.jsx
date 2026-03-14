/**
 * ThemeToggle — sun/moon button for switching dark/light mode.
 * Props:
 *   isDark — current theme state
 *   toggle — function to flip it
 */
export default function ThemeToggle({ isDark, toggle }) {
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-xl hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
