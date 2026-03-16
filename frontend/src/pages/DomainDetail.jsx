import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, ChevronLeft, FolderInput, X, Check } from 'lucide-react'
import API from '../api/client'
import ProgressBar from '../components/ProgressBar'

/**
 * DomainDetail — shows all topics inside a domain.
 * URL: /domain/:id
 *
 * Features:
 *   - View topics with progress
 *   - Add/delete topics
 *   - Google Drive-style "Move to" — select topics, pick destination domain
 */
export default function DomainDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newTopicName, setNewTopicName] = useState('')
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Move feature state
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moving, setMoving] = useState(false)

  const { data: allDomains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => API.get('/domains').then(r => r.data),
  })
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['topics', id],
    queryFn: () => API.get(`/topics?domain_id=${id}`).then(r => r.data),
  })
  const loading = domainsLoading || topicsLoading
  const domain = allDomains.find(d => d.id === parseInt(id)) || null

  async function handleDeleteTopic(topicId) {
    await API.delete(`/topics/${topicId}`)
    queryClient.invalidateQueries({ queryKey: ['topics', id] })
    queryClient.invalidateQueries({ queryKey: ['domains'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    setSelectedIds(prev => { const next = new Set(prev); next.delete(topicId); return next })
    setConfirmDeleteId(null)
  }

  async function handleAddTopic(e) {
    e.preventDefault()
    if (!newTopicName.trim()) return
    await API.post('/topics', { domain_id: parseInt(id), name: newTopicName.trim() })
    queryClient.invalidateQueries({ queryKey: ['topics', id] })
    setNewTopicName('')
    setShowNewTopic(false)
  }

  function toggleSelect(topicId) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(topicId)) {
        next.delete(topicId)
      } else {
        next.add(topicId)
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setShowMoveModal(false)
  }

  async function handleMove(targetDomainId) {
    setMoving(true)
    try {
      await API.post('/topics/move', {
        topic_ids: [...selectedIds],
        target_domain_id: targetDomainId,
      })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      clearSelection()
    } finally {
      setMoving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64" style={{ color: 'var(--subtext)' }}>Loading...</div>
  }

  if (!domain) {
    return <div className="p-6 text-center" style={{ color: 'var(--subtext)' }}>Domain not found.</div>
  }

  const totalCards = topics.reduce((s, t) => s + t.card_count, 0)
  const doneCards  = topics.reduce((s, t) => s + t.done_count, 0)
  const otherDomains = allDomains.filter(d => d.id !== parseInt(id))
  const hasSelection = selectedIds.size > 0

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back link */}
      <button onClick={() => navigate('/')}
        className="flex items-center gap-1 text-sm mb-5 hover:underline"
        style={{ color: 'var(--subtext)' }}>
        <ChevronLeft size={15} /> Dashboard
      </button>

      {/* Domain header */}
      <div className="rounded-xl p-5 mb-6"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div
          className="h-0.5 rounded-full mb-4"
          style={{ backgroundColor: domain.color || '#3B82F6' }}
        />
        <div className="mb-3">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{domain.name}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--subtext)' }}>{topics.length} topic{topics.length !== 1 ? 's' : ''}</p>
        </div>
        <ProgressBar done={doneCards} total={totalCards} />
      </div>

      {/* Topics list */}
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--subtext)' }}>
        Topics
      </h2>

      {topics.length === 0 && (
        <p className="text-sm mb-4" style={{ color: 'var(--subtext)' }}>
          No topics yet. Add one below.
        </p>
      )}

      <div className="space-y-2 mb-4">
        {topics.map(topic => (
          <div key={topic.id}>
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 transition-all hover:shadow-md"
              style={{
                backgroundColor: 'var(--card)',
                border: `1px solid ${confirmDeleteId === topic.id ? '#FCA5A5' : selectedIds.has(topic.id) ? (domain.color || '#3B82F6') : 'var(--border)'}`,
                boxShadow: selectedIds.has(topic.id) ? `0 0 0 1px ${domain.color || '#3B82F6'}` : undefined,
              }}
            >
              {/* Checkbox for move selection */}
              <button
                onClick={() => toggleSelect(topic.id)}
                className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: selectedIds.has(topic.id) ? (domain.color || '#3B82F6') : 'var(--border)',
                  backgroundColor: selectedIds.has(topic.id) ? (domain.color || '#3B82F6') : 'transparent',
                }}
                title="Select to move"
              >
                {selectedIds.has(topic.id) && <Check size={12} color="white" strokeWidth={3} />}
              </button>

              {/* Clickable area → navigate to topic */}
              <Link
                to={`/topic/${topic.id}`}
                className="flex-1 flex items-center justify-between"
                style={{ textDecoration: 'none' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{topic.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--subtext)' }}>
                    {topic.done_count}/{topic.card_count} done
                  </span>
                  <span style={{ color: 'var(--subtext)' }}>›</span>
                </div>
              </Link>
              {/* Trash icon */}
              <button
                onClick={() => setConfirmDeleteId(confirmDeleteId === topic.id ? null : topic.id)}
                className="ml-1 p-1.5 rounded hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20 transition-colors"
                style={{ color: 'var(--subtext)' }}
                title="Delete topic"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* Inline confirm — appears below the row when trash is clicked */}
            {confirmDeleteId === topic.id && (
              <div
                className="flex items-center justify-between gap-2 px-4 py-2 rounded-b-xl -mt-1"
                style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderTop: 'none' }}
              >
                <span className="text-xs text-red-600 font-medium">
                  Do you want to delete "{topic.name}"? This removes all its cards and notes.
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleDeleteTopic(topic.id)}
                    className="text-xs px-3 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs px-3 py-1 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New topic */}
      {showNewTopic ? (
        <form onSubmit={handleAddTopic} className="flex gap-2">
          <input
            autoFocus
            placeholder="Topic name (e.g. Binary Search)"
            value={newTopicName}
            onChange={e => setNewTopicName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-brand-300"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <button type="submit"
            className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
            Add
          </button>
          <button type="button" onClick={() => setShowNewTopic(false)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}>
            ✕
          </button>
        </form>
      ) : (
        <button onClick={() => setShowNewTopic(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors hover:border-brand-400 hover:text-brand-500"
          style={{ borderColor: 'var(--border)', color: 'var(--subtext)' }}>
          + Add Topic
        </button>
      )}

      {/* ─── Floating action bar (Google Drive style) ─── */}
      {hasSelection && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl z-50"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {selectedIds.size} selected
          </span>

          <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />

          <button
            onClick={() => setShowMoveModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: domain.color || '#3B82F6' }}
          >
            <FolderInput size={15} />
            Move to...
          </button>

          <button
            onClick={clearSelection}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--subtext)' }}
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── Move modal (Google Drive style) ─── */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMoveModal(false)}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-sm rounded-2xl p-0 overflow-hidden shadow-2xl"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Move {selectedIds.size} topic{selectedIds.size > 1 ? 's' : ''} to...
              </h3>
              <button
                onClick={() => setShowMoveModal(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                style={{ color: 'var(--subtext)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Domain list */}
            <div className="py-2 max-h-72 overflow-y-auto">
              {otherDomains.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--subtext)' }}>
                  No other domains to move to.
                </p>
              ) : (
                otherDomains.map(d => (
                  <button
                    key={d.id}
                    onClick={() => handleMove(d.id)}
                    disabled={moving}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    {/* Color dot */}
                    <span
                      className="shrink-0 w-3 h-3 rounded-full"
                      style={{ backgroundColor: d.color || '#888' }}
                    />
                    {/* Icon + name */}
                    <span className="text-sm" style={{ color: 'var(--text)' }}>
                      {d.icon && <span className="mr-1.5">{d.icon}</span>}
                      {d.name}
                    </span>
                    {/* Card count */}
                    <span className="ml-auto text-xs" style={{ color: 'var(--subtext)' }}>
                      {d.card_count} card{d.card_count !== 1 ? 's' : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
