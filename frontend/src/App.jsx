// HashRouter used instead of BrowserRouter for GitHub Pages compatibility
import { HashRouter as BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTheme } from './hooks/useTheme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // data stays fresh for 2 minutes
      gcTime: 1000 * 60 * 5,      // cache kept for 5 minutes
      refetchOnWindowFocus: false, // don't refetch when switching tabs
    },
  },
})
import ThemeToggle from './components/ThemeToggle'
import Dashboard from './pages/Dashboard'
import DomainDetail from './pages/DomainDetail'
import TopicDetail from './pages/TopicDetail'
import Projects from './pages/Projects'

/**
 * Navbar — sticky top bar with app name, nav links, and theme toggle.
 * Highlights the active link.
 */
function Navbar({ isDark, toggle }) {
  const location = useLocation()

  const linkClass = (path) =>
    `text-base font-medium transition-colors hover:text-brand-500 ${
      location.pathname === path ? 'text-brand-500' : ''
    }`

  return (
    <nav
      className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm"
      style={{ backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}
    >
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span className="font-bold text-brand-500 text-xl">GilsLearn</span>
      </Link>

      <div className="flex items-center gap-6">
        <Link to="/" className={linkClass('/')} style={{ textDecoration: 'none', color: 'var(--text)' }}>
          Study
        </Link>
        <Link to="/projects" className={linkClass('/projects')} style={{ textDecoration: 'none', color: 'var(--text)' }}>
          Projects
        </Link>
        <ThemeToggle isDark={isDark} toggle={toggle} />
      </div>
    </nav>
  )
}

/**
 * App — root component with router setup.
 */
export default function App() {
  const { isDark, toggle } = useTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
          <Navbar isDark={isDark} toggle={toggle} />
          <main>
            <Routes>
              <Route path="/"              element={<Dashboard />} />
              <Route path="/domain/:id"    element={<DomainDetail />} />
              <Route path="/topic/:id"     element={<TopicDetail />} />
              <Route path="/projects"      element={<Projects />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
