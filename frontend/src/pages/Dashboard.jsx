import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, X } from 'lucide-react'
import API from '../api/client'
import DomainCard from '../components/DomainCard'

export default function Dashboard() {
  const [domains, setDomains] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNewDomain, setShowNewDomain] = useState(false)
  const [newDomain, setNewDomain] = useState({ name: '', icon: '', color: '#3B82F6' })
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([API.get('/domains'), API.get('/stats')]).then(([dRes, sRes]) => {
      setDomains(dRes.data)
      setStats(sRes.data)
      setLoading(false)
    })
  }, [])

  async function handleCreateDomain(e) {
    e.preventDefault()
    if (!newDomain.name.trim()) return
    const res = await API.post('/domains', newDomain)
    setDomains(prev => [...prev, res.data])
    setNewDomain({ name: '', icon: '', color: '#3B82F6' })
    setShowNewDomain(false)
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setConfirmingDelete(false)
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setConfirmingDelete(false)
  }

  async function handleBulkDelete() {
    await Promise.all([...selectedIds].map(id => API.delete(`/domains/${id}`)))
    setDomains(prev => prev.filter(d => !selectedIds.has(d.id)))
    exitSelectMode()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--subtext)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Stats bar */}
      {stats && (
        <div className="rounded-2xl p-6 mb-8 flex flex-wrap gap-8 items-center"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-500">{stats.total_cards}</div>
            <div className="text-sm mt-1" style={{ color: 'var(--subtext)' }}>Total Cards</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">{stats.done_count}</div>
            <div className="text-sm mt-1" style={{ color: 'var(--subtext)' }}>Done</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-400">{stats.percent_done}%</div>
            <div className="text-sm mt-1" style={{ color: 'var(--subtext)' }}>Complete</div>
          </div>
          {/* Overall progress bar */}
          <div className="flex-1 min-w-[160px]">
            <div className="w-full h-4 rounded-full bg-brand-100 dark:bg-brand-900/30">
              <div
                className="h-4 rounded-full bg-brand-400 transition-all duration-300"
                style={{ width: `${stats.percent_done}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Domain grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {domains.map(domain => (
          <DomainCard
            key={domain.id}
            domain={domain}
            selectMode={selectMode}
            isSelected={selectedIds.has(domain.id)}
            onSelect={toggleSelect}
          />
        ))}
      </div>

      {/* New domain form */}
      {showNewDomain ? (
        <form onSubmit={handleCreateDomain}
          className="rounded-xl p-4 mb-3"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              placeholder="Domain name (e.g. Docker)"
              value={newDomain.name}
              onChange={e => setNewDomain(p => ({ ...p, name: e.target.value }))}
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-brand-300"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              autoFocus
            />
            <input
              placeholder="Icon emoji (e.g. 🐳)"
              value={newDomain.icon}
              onChange={e => setNewDomain(p => ({ ...p, icon: e.target.value }))}
              className="w-28 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-brand-300"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <input
              type="color"
              value={newDomain.color}
              onChange={e => setNewDomain(p => ({ ...p, color: e.target.value }))}
              className="h-10 w-10 rounded-lg cursor-pointer border"
              style={{ borderColor: 'var(--border)' }}
              title="Pick accent color"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit"
              className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
              Create
            </button>
            <button type="button" onClick={() => setShowNewDomain(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}>
              Cancel
            </button>
          </div>
        </form>
      ) : selectMode ? (
        /* Select mode action bar */
        <div className="flex items-center gap-3">
          <button
            onClick={exitSelectMode}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}
          >
            <X size={15} /> Cancel
          </button>
          <span className="text-sm" style={{ color: 'var(--subtext)' }}>
            {selectedIds.size} selected
          </span>
          {selectedIds.size > 0 && (
            confirmingDelete ? (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-rose-500 font-medium">
                  Delete {selectedIds.size} domain{selectedIds.size > 1 ? 's' : ''}?
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="text-xs px-3 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors font-medium"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}
                >
                  Back
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="ml-auto flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 font-medium transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            )
          )}
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewDomain(true)}
            className="flex-1 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors hover:border-brand-400 hover:text-brand-500"
            style={{ borderColor: 'var(--border)', color: 'var(--subtext)' }}
          >
            + New Domain
          </button>
          <button
            onClick={() => setSelectMode(true)}
            className="px-4 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors hover:border-brand-400 hover:text-brand-500"
            style={{ borderColor: 'var(--border)', color: 'var(--subtext)' }}
          >
            Select
          </button>
        </div>
      )}
    </div>
  )
}
