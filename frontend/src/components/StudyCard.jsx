import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import API from '../api/client'

/**
 * StudyCard — larger, selectable, expandable flashcard.
 *
 * Interaction model:
 *   - Tap the CHECKBOX (top-left) → select/deselect the card
 *   - Tap the CARD BODY          → expand/collapse the answer
 *   - These two are independent — selecting doesn't expand, expanding doesn't select
 *
 * Props:
 *   card         — card object from API
 *   isSelected   — boolean, controlled by parent
 *   onSelect     — callback(cardId) — called when checkbox is tapped
 *   onToggleDone — callback(cardId, newDoneState)
 */
export default function StudyCard({ card, isSelected, onSelect, onToggleDone }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  const c = card.content
  const isDone = card.done

  async function handleToggleDone(e) {
    e.stopPropagation()
    setLoading(true)
    try {
      const res = await API.patch(`/cards/${card.id}`, { done: !isDone })
      onToggleDone(card.id, res.data.done)
    } finally {
      setLoading(false)
    }
  }

  function renderBack() {
    if (c.type === 'qa') {
      return (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text)' }}>{c.answer}</p>
          {c.code_example && (
            <div className="mt-4 rounded-xl overflow-hidden">
              <SyntaxHighlighter language="python" style={oneDark}
                customStyle={{ margin: 0, borderRadius: '10px', fontSize: '13px', padding: '16px' }}>
                {c.code_example}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      )
    }
    if (c.type === 'concept') {
      return (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text)' }}>{c.explanation}</p>
        </div>
      )
    }
    if (c.type === 'code_snippet') {
      return (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="rounded-xl overflow-hidden mb-3">
            <SyntaxHighlighter language="python" style={oneDark}
              customStyle={{ margin: 0, borderRadius: '10px', fontSize: '13px', padding: '16px' }}>
              {c.code}
            </SyntaxHighlighter>
          </div>
          {c.explanation && (
            <p className="text-base leading-relaxed" style={{ color: 'var(--subtext)' }}>{c.explanation}</p>
          )}
        </div>
      )
    }
    return null
  }

  const difficultyColor = {
    easy:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    hard:   'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
  }[c.difficulty] || ''

  const typeLabel = { qa: 'Q&A', concept: 'Concept', code_snippet: 'Code' }[c.type] || c.type

  return (
    <div
      className={`rounded-2xl mb-3 transition-all duration-150 ${
        isSelected ? 'ring-2 ring-brand-500 shadow-md' : 'shadow-sm'
      } ${isDone ? 'opacity-50' : ''}`}
      style={{
        backgroundColor: 'var(--card)',
        border: `1px solid ${isSelected ? '#3B82F6' : 'var(--border)'}`,
      }}
    >
      {/* ── Layout: [checkbox] | [card content] ── */}
      <div className="flex">

        {/* Checkbox column — dedicated tap area, does NOT expand card */}
        <button
          onClick={() => onSelect(card.id)}
          className="flex items-start justify-center pt-5 px-4 shrink-0 focus:outline-none"
          style={{ minWidth: '52px' }}
          aria-label={isSelected ? 'Deselect card' : 'Select card'}
        >
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
            isSelected
              ? 'bg-brand-500 border-brand-500'
              : 'border-gray-300 dark:border-gray-600 bg-transparent'
          }`}>
            {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
          </div>
        </button>

        {/* Card content column — tap here to expand/collapse */}
        <div
          className="flex-1 py-5 pr-5 cursor-pointer min-w-0"
          onClick={() => setExpanded(prev => !prev)}
        >
          {/* Top meta row: type badge + difficulty + mark done + chevron */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300 tracking-wide">
              {typeLabel}
            </span>
            {c.difficulty && (
              <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${difficultyColor}`}>
                {c.difficulty}
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={handleToggleDone}
              disabled={loading}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                isDone
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-brand-50 hover:text-brand-600'
              }`}
            >
              {isDone ? '✓ Done' : 'Mark done'}
            </button>
            <div className="shrink-0" style={{ color: 'var(--subtext)' }}>
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          {/* Question / Title — main readable text, larger */}
          <p className={`text-base font-medium leading-snug ${isDone ? 'line-through' : ''}`}
            style={{ color: 'var(--text)' }}>
            {c.type === 'qa' ? c.question : c.title}
          </p>

          {/* Expanded answer/content */}
          {expanded && renderBack()}

          {/* Tags */}
          {c.tags && c.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {c.tags.map(tag => (
                <span key={tag}
                  className="text-xs px-2 py-0.5 rounded font-mono"
                  style={{ backgroundColor: 'var(--border)', color: 'var(--subtext)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
