import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, X, ChevronLeft, Plus, FileText, CheckCircle2, Circle, Menu, Minus } from 'lucide-react'
import API from '../api/client'
import ArticleView from '../components/ArticleView'

export default function TopicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [cards, setCards] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCardId, setActiveCardId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('article-font-size') || '15', 10)
  })

  // Forms
  const [showCardForm, setShowCardForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [cardForm, setCardForm] = useState({
    type: 'qa',
    question: '', answer: '', code_example: '',
    title: '', explanation: '', code: '',
    tags: '', difficulty: 'medium',
  })

  useEffect(() => {
    async function load() {
      const [cRes, nRes] = await Promise.all([
        API.get(`/cards?topic_id=${id}`),
        API.get(`/notes?topic_id=${id}`),
      ])
      setCards(cRes.data)
      setNotes(nRes.data)
      if (cRes.data.length > 0) {
        setActiveCardId(cRes.data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [id])

  function adjustFontSize(delta) {
    setFontSize(prev => {
      const next = Math.min(22, Math.max(12, prev + delta))
      localStorage.setItem('article-font-size', next)
      return next
    })
  }

  function handleToggleDone(cardId, newDone) {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, done: newDone } : c))
  }

  function handleCardUpdate(cardId, updatedCard) {
    setCards(prev => prev.map(c => c.id === cardId ? updatedCard : c))
  }

  const activeIndex = cards.findIndex(c => c.id === activeCardId)
  const activeCard = activeIndex >= 0 ? cards[activeIndex] : null

  function goTo(idx) {
    if (idx >= 0 && idx < cards.length) {
      setActiveCardId(cards[idx].id)
    }
  }

  async function handleAddCard(e) {
    e.preventDefault()
    const tags = cardForm.tags.split(',').map(t => t.trim()).filter(Boolean)
    let content = { type: cardForm.type, tags, difficulty: cardForm.difficulty }
    if (cardForm.type === 'qa') {
      content = { ...content, question: cardForm.question, answer: cardForm.answer, code_example: cardForm.code_example }
    } else if (cardForm.type === 'concept') {
      content = { ...content, title: cardForm.title, explanation: cardForm.explanation }
    } else if (cardForm.type === 'code_snippet') {
      content = { ...content, title: cardForm.title, code: cardForm.code, explanation: cardForm.explanation }
    }
    const res = await API.post('/cards', { topic_id: parseInt(id), content })
    setCards(prev => [res.data, ...prev])
    setActiveCardId(res.data.id)
    setCardForm({ type: 'qa', question: '', answer: '', code_example: '', title: '', explanation: '', code: '', tags: '', difficulty: 'medium' })
    setShowCardForm(false)
  }

  async function handleDeleteCard(cardId) {
    await API.delete(`/cards/${cardId}`)
    setCards(prev => {
      const next = prev.filter(c => c.id !== cardId)
      if (activeCardId === cardId) {
        setActiveCardId(next.length > 0 ? next[0].id : null)
      }
      return next
    })
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    const res = await API.post('/notes', { topic_id: parseInt(id), content: noteText.trim() })
    setNotes(prev => [...prev, res.data])
    setNoteText('')
    setShowNoteForm(false)
  }

  async function handleDeleteNote(noteId) {
    await API.delete(`/notes/${noteId}`)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-brand-300"
  const inputStyle = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--subtext)' }}>Loading...</div>
  }

  const doneCount = cards.filter(c => c.done).length
  const diffDot = {
    easy: 'bg-emerald-500',
    medium: 'bg-amber-500',
    hard: 'bg-rose-500',
  }

  return (
    <div className="flex h-[calc(100vh-65px)]">

      {/* ─── Sidebar ─── */}
      <aside
        className={`shrink-0 overflow-y-auto border-r transition-all duration-200 ${
          sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
        }`}
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="p-4">
          {/* Back + stats */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm mb-4 hover:underline"
            style={{ color: 'var(--subtext)' }}
          >
            <ChevronLeft size={15} /> Back
          </button>

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium" style={{ color: 'var(--subtext)' }}>
              {doneCount}/{cards.length} completed
            </span>
            <button
              onClick={() => { setShowCardForm(prev => !prev) }}
              className="p-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full mb-5" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: cards.length > 0 ? `${(doneCount / cards.length) * 100}%` : '0%' }}
            />
          </div>

          {/* Questions list */}
          <div className="space-y-1">
            {cards.map((card, idx) => {
              const c = card.content
              const isActive = card.id === activeCardId
              const title = c.type === 'qa' ? c.question : c.title
              return (
                <button
                  key={card.id}
                  onClick={() => setActiveCardId(card.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-100 group relative ${
                    isActive
                      ? 'shadow-sm'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--bg)' : 'transparent',
                    borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Done indicator */}
                    <div className="mt-0.5 shrink-0">
                      {card.done ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <Circle size={16} style={{ color: 'var(--border)' }} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Title */}
                      <p
                        className={`text-sm font-medium leading-snug line-clamp-2 ${card.done ? 'line-through opacity-60' : ''}`}
                        style={{ color: 'var(--text)' }}
                      >
                        {title}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`w-2 h-2 rounded-full ${diffDot[c.difficulty] || 'bg-gray-400'}`} />
                        <span className="text-xs" style={{ color: 'var(--subtext)' }}>
                          {c.difficulty}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--subtext)' }}>
                          #{idx + 1}
                        </span>
                      </div>
                    </div>

                    {/* Delete on hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 shrink-0"
                      style={{ color: 'var(--subtext)' }}
                    >
                      <Trash2 size={13} className="text-rose-500" />
                    </button>
                  </div>
                </button>
              )
            })}
          </div>

          {cards.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--subtext)' }}>
              No questions yet.
            </p>
          )}
        </div>
      </aside>

      {/* ─── Main content area ─── */}
      <main className="flex-1 overflow-y-auto">
        {/* Toggle sidebar + breadcrumb */}
        <div
          className="sticky top-0 z-30 px-6 py-3 flex items-center gap-3 border-b"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ color: 'var(--subtext)' }}
          >
            <Menu size={18} />
          </button>
          {activeCard && (
            <span className="text-xs font-medium" style={{ color: 'var(--subtext)' }}>
              Question {activeIndex + 1} of {cards.length}
            </span>
          )}

          {/* Font size controls */}
          <div className="ml-auto flex items-center gap-1 rounded-lg px-1 py-0.5" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => adjustFontSize(-1)}
              disabled={fontSize <= 12}
              className="p-1.5 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              style={{ color: 'var(--subtext)' }}
              title="Decrease font size"
            >
              <Minus size={13} />
            </button>
            <span className="text-xs font-mono w-7 text-center select-none" style={{ color: 'var(--subtext)' }}>
              {fontSize}
            </span>
            <button
              onClick={() => adjustFontSize(1)}
              disabled={fontSize >= 22}
              className="p-1.5 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              style={{ color: 'var(--subtext)' }}
              title="Increase font size"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-8">
          {/* Add card form */}
          {showCardForm && (
            <form
              onSubmit={handleAddCard}
              className="rounded-xl p-5 mb-8 space-y-3"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>New Card</h3>
                <button type="button" onClick={() => setShowCardForm(false)} style={{ color: 'var(--subtext)' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="flex gap-2">
                {['qa', 'concept', 'code_snippet'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setCardForm(p => ({ ...p, type: t }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      cardForm.type === t ? 'bg-brand-500 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    style={cardForm.type !== t ? { border: '1px solid var(--border)', color: 'var(--text)' } : {}}
                  >
                    {t === 'qa' ? 'Q&A' : t === 'concept' ? 'Concept' : 'Code Snippet'}
                  </button>
                ))}
              </div>

              {cardForm.type === 'qa' && (
                <>
                  <input placeholder="Question" value={cardForm.question} onChange={e => setCardForm(p => ({ ...p, question: e.target.value }))} className={inputClass} style={inputStyle} required />
                  <textarea placeholder="Answer" value={cardForm.answer} onChange={e => setCardForm(p => ({ ...p, answer: e.target.value }))} className={inputClass} style={inputStyle} rows={4} required />
                  <textarea placeholder="Code example (optional)" value={cardForm.code_example} onChange={e => setCardForm(p => ({ ...p, code_example: e.target.value }))} className={`${inputClass} font-mono text-xs`} style={inputStyle} rows={3} />
                </>
              )}

              {cardForm.type === 'concept' && (
                <>
                  <input placeholder="Title" value={cardForm.title} onChange={e => setCardForm(p => ({ ...p, title: e.target.value }))} className={inputClass} style={inputStyle} required />
                  <textarea placeholder="Explanation" value={cardForm.explanation} onChange={e => setCardForm(p => ({ ...p, explanation: e.target.value }))} className={inputClass} style={inputStyle} rows={5} required />
                </>
              )}

              {cardForm.type === 'code_snippet' && (
                <>
                  <input placeholder="Title" value={cardForm.title} onChange={e => setCardForm(p => ({ ...p, title: e.target.value }))} className={inputClass} style={inputStyle} required />
                  <textarea placeholder="Code" value={cardForm.code} onChange={e => setCardForm(p => ({ ...p, code: e.target.value }))} className={`${inputClass} font-mono text-xs`} style={inputStyle} rows={5} required />
                  <textarea placeholder="Explanation (optional)" value={cardForm.explanation} onChange={e => setCardForm(p => ({ ...p, explanation: e.target.value }))} className={inputClass} style={inputStyle} rows={2} />
                </>
              )}

              <div className="flex gap-2">
                <input placeholder="Tags (comma separated)" value={cardForm.tags} onChange={e => setCardForm(p => ({ ...p, tags: e.target.value }))} className={`${inputClass} flex-1`} style={inputStyle} />
                <select value={cardForm.difficulty} onChange={e => setCardForm(p => ({ ...p, difficulty: e.target.value }))}
                  className="px-3 py-2 rounded-lg text-sm border focus:outline-none"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <button type="submit" className="w-full py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
                Save Card
              </button>
            </form>
          )}

          {/* Article view */}
          {activeCard ? (
            <ArticleView
              key={activeCard.id}
              card={activeCard}
              fontSize={fontSize}
              onToggleDone={handleToggleDone}
              onCardUpdate={handleCardUpdate}
              onPrev={() => goTo(activeIndex - 1)}
              onNext={() => goTo(activeIndex + 1)}
              hasPrev={activeIndex > 0}
              hasNext={activeIndex < cards.length - 1}
            />
          ) : !showCardForm && (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--subtext)' }}>
              <FileText size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium mb-2">No questions yet</p>
              <p className="text-sm mb-4">Add your first study card to get started.</p>
              <button
                onClick={() => setShowCardForm(true)}
                className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                + Add Card
              </button>
            </div>
          )}

          {/* Notes section */}
          <div className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--subtext)' }}>
                Notes
              </h2>
              <button
                onClick={() => setShowNoteForm(p => !p)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}
              >
                {showNoteForm ? 'Cancel' : '+ Note'}
              </button>
            </div>

            {showNoteForm && (
              <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
                <textarea
                  autoFocus
                  placeholder="Write a note..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className={`${inputClass} flex-1`}
                  style={inputStyle}
                  rows={2}
                />
                <button type="submit" className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
                  Save
                </button>
              </form>
            )}

            <div className="space-y-2">
              {notes.map(note => (
                <div
                  key={note.id}
                  className="rounded-lg px-4 py-3 relative group"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ color: 'var(--subtext)' }}
                  >
                    <X size={14} />
                  </button>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed pr-6" style={{ color: 'var(--text)' }}>
                    {note.content}
                  </p>
                </div>
              ))}
              {notes.length === 0 && !showNoteForm && (
                <p className="text-sm" style={{ color: 'var(--subtext)' }}>No notes yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
