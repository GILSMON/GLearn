import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react'
import API from '../api/client'

// ─── Inline renderer ────────────────────────────────────────────────────────
// Handles: **bold**, *italic*, `code`, O(N) badges
function renderInline(text, key = 0) {
  // Token patterns in priority order
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|O\([^)]+\)|(?:Time|Space|Average|Worst|Best):\s*O\([^)]+\)|(?:Time|Space|Average|Worst|Best):)/g

  const parts = []
  let last = 0
  let match
  let idx = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={`${key}-t-${idx}`}>{text.slice(last, match.index)}</span>)
    }

    const full = match[0]

    if (full.startsWith('**')) {
      // Bold
      parts.push(<strong key={`${key}-b-${idx}`} className="font-semibold" style={{ color: 'var(--text)' }}>{match[2]}</strong>)
    } else if (full.startsWith('*')) {
      // Italic
      parts.push(<em key={`${key}-i-${idx}`}>{match[3]}</em>)
    } else if (full.startsWith('`')) {
      // Inline code
      parts.push(
        <code
          key={`${key}-c-${idx}`}
          className="px-1.5 py-0.5 rounded font-mono text-[0.85em] font-medium"
          style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}
        >
          {match[4]}
        </code>
      )
    } else {
      // Complexity / label badge (O(N), Time:, Space:, etc.)
      parts.push(
        <code
          key={`${key}-badge-${idx}`}
          className="px-1.5 py-0.5 rounded font-mono text-[0.8em] font-semibold"
          style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}
        >
          {full}
        </code>
      )
    }

    last = match.index + full.length
    idx++
  }

  if (last < text.length) {
    parts.push(<span key={`${key}-end`}>{text.slice(last)}</span>)
  }

  return parts.length > 0 ? parts : text
}

// ─── Block parser ────────────────────────────────────────────────────────────
function parseContent(raw) {
  if (!raw) return []

  const lines = raw.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip blank lines
    if (trimmed === '') { i++; continue }

    // ━━━ HEADING ━━━ (original format)
    if (trimmed.includes('━━━')) {
      const title = trimmed.replace(/━/g, '').trim()
      if (title) blocks.push({ type: 'heading', level: 2, text: title })
      i++; continue
    }

    // **ENTIRE LINE BOLD** → section heading
    if (/^\*\*(.+)\*\*$/.test(trimmed)) {
      blocks.push({ type: 'heading', level: 2, text: trimmed.replace(/^\*\*|\*\*$/g, '') })
      i++; continue
    }

    // --- → divider
    if (/^-{3,}$/.test(trimmed)) {
      blocks.push({ type: 'divider' })
      i++; continue
    }

    // Fenced code block ```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'python'
      i++
      const codeLines = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // consume closing ```
      blocks.push({ type: 'code', lang, text: codeLines.join('\n') })
      continue
    }

    // Auto-detected code block (Python patterns)
    if (isCodeLine(line)) {
      const codeLines = []
      while (i < lines.length && (isCodeLine(lines[i]) || lines[i].trim() === '')) {
        if (lines[i].includes('━━━') || /^\*\*(.+)\*\*$/.test(lines[i].trim()) || /^-{3,}$/.test(lines[i].trim())) break
        codeLines.push(lines[i])
        i++
      }
      while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === '') codeLines.pop()
      if (codeLines.length > 0) blocks.push({ type: 'code', lang: 'python', text: codeLines.join('\n') })
      continue
    }

    // Bullet list: lines starting with - or * (not --- divider)
    if (/^[-*]\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'list', items })
      continue
    }

    // Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'olist', items })
      continue
    }

    // Regular paragraph — collect until a block boundary
    const paraLines = []
    while (i < lines.length) {
      const l = lines[i]
      const t = l.trim()
      if (t === '') { i++; break }
      if (
        t.includes('━━━') ||
        /^\*\*(.+)\*\*$/.test(t) ||
        /^-{3,}$/.test(t) ||
        t.startsWith('```') ||
        /^[-*]\s+/.test(t) ||
        /^\d+\.\s+/.test(t) ||
        isCodeLine(l)
      ) break
      paraLines.push(l)
      i++
    }
    if (paraLines.length > 0) blocks.push({ type: 'paragraph', lines: paraLines })
  }

  return blocks
}

function isCodeLine(line) {
  if (!line) return false
  const t = line.trim()
  if (/^(class |def |import |from |elif |else:|try:|except |with |raise |assert )/.test(t)) return true
  if (/^(self\.|print\(|#\s|@\w)/.test(t)) return true
  if (/^[a-z_]+\s*=\s/.test(t) && (t.includes('(') || t.includes('['))) return true
  if (/^(\s{4,}|\t)/.test(line) && !/^[A-Z][a-z].{10,}[.!?]$/.test(t)) return true
  return false
}

// ─── CodeBlock ───────────────────────────────────────────────────────────────
function CodeBlock({ code, lang = 'python' }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-5 rounded-xl overflow-hidden">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#aaa' }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '12px',
          fontSize: '13px',
          lineHeight: '1.65',
          padding: '20px 20px 20px 16px',
        }}
        showLineNumbers
        lineNumberStyle={{ color: '#4a4a4a', fontSize: '11px', paddingRight: '16px', userSelect: 'none' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

// ─── Block renderer ──────────────────────────────────────────────────────────
function renderBlock(block, i) {
  switch (block.type) {

    case 'heading':
      return (
        <h2
          key={i}
          className="font-bold mt-8 mb-3 pb-2 border-b"
          style={{
            fontSize: '1.15em',
            color: 'var(--text)',
            borderColor: 'var(--border)',
            letterSpacing: '-0.01em',
          }}
        >
          {renderInline(block.text, i)}
        </h2>
      )

    case 'divider':
      return (
        <hr
          key={i}
          className="my-6"
          style={{ borderColor: 'var(--border)', borderTopWidth: '1px' }}
        />
      )

    case 'code':
      return <CodeBlock key={i} code={block.text} lang={block.lang} />

    case 'list':
      return (
        <ul key={i} className="my-3 space-y-1.5 pl-1">
          {block.items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 leading-relaxed" style={{ color: 'var(--text)' }}>
              <span className="mt-[0.45em] w-1.5 h-1.5 rounded-full shrink-0 bg-brand-500" />
              <span>{renderInline(item, `${i}-${j}`)}</span>
            </li>
          ))}
        </ul>
      )

    case 'olist':
      return (
        <ol key={i} className="my-3 space-y-1.5 pl-1">
          {block.items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 leading-relaxed" style={{ color: 'var(--text)' }}>
              <span
                className="shrink-0 font-mono text-xs font-bold mt-0.5 w-5 text-center"
                style={{ color: 'var(--subtext)' }}
              >
                {j + 1}.
              </span>
              <span>{renderInline(item, `${i}-${j}`)}</span>
            </li>
          ))}
        </ol>
      )

    case 'paragraph':
      return (
        <div key={i} className="my-3 space-y-1 leading-relaxed" style={{ color: 'var(--text)' }}>
          {block.lines.map((line, j) => (
            <p key={j}>{renderInline(line, `${i}-${j}`)}</p>
          ))}
        </div>
      )

    default:
      return null
  }
}

// ─── ArticleView ─────────────────────────────────────────────────────────────
export default function ArticleView({ card, fontSize = 15, onToggleDone, onCardUpdate, onPrev, onNext, hasPrev, hasNext }) {
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({})
  const c = card.content

  function startEdit() {
    // Pre-fill form from current card content
    if (c.type === 'qa') {
      setEditForm({
        question: c.question || '',
        answer: c.answer || '',
        code_example: c.code_example || '',
        tags: (c.tags || []).join(', '),
        difficulty: c.difficulty || 'medium',
      })
    } else if (c.type === 'concept') {
      setEditForm({
        title: c.title || '',
        explanation: c.explanation || '',
        tags: (c.tags || []).join(', '),
        difficulty: c.difficulty || 'medium',
      })
    } else if (c.type === 'code_snippet') {
      setEditForm({
        title: c.title || '',
        code: c.code || '',
        explanation: c.explanation || '',
        tags: (c.tags || []).join(', '),
        difficulty: c.difficulty || 'medium',
      })
    }
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditForm({})
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const tags = editForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      let content = { type: c.type, tags, difficulty: editForm.difficulty }
      if (c.type === 'qa') {
        content = { ...content, question: editForm.question, answer: editForm.answer, code_example: editForm.code_example }
      } else if (c.type === 'concept') {
        content = { ...content, title: editForm.title, explanation: editForm.explanation }
      } else if (c.type === 'code_snippet') {
        content = { ...content, title: editForm.title, code: editForm.code, explanation: editForm.explanation }
      }
      const res = await API.patch(`/cards/${card.id}`, { content })
      if (onCardUpdate) onCardUpdate(card.id, res.data)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleDone() {
    setLoading(true)
    try {
      const res = await API.patch(`/cards/${card.id}`, { done: !card.done })
      onToggleDone(card.id, res.data.done)
    } finally {
      setLoading(false)
    }
  }

  const difficultyColor = {
    easy:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    hard:   'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  }[c.difficulty] || ''

  const typeLabel = { qa: 'Q&A', concept: 'Concept', code_snippet: 'Code Snippet' }[c.type] || c.type

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-brand-300"
  const inputStyle = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }

  // ─── Edit mode ───
  if (editing) {
    return (
      <article className="min-h-[60vh]" style={{ fontSize: `${fontSize}px` }}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Pencil size={16} style={{ color: 'var(--subtext)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Edit {typeLabel}
              </h3>
            </div>
            <button type="button" onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" style={{ color: 'var(--subtext)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Type-specific fields */}
          {c.type === 'qa' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Question</label>
                <input
                  value={editForm.question}
                  onChange={e => setEditForm(p => ({ ...p, question: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Answer</label>
                <textarea
                  value={editForm.answer}
                  onChange={e => setEditForm(p => ({ ...p, answer: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                  rows={8}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Code Example (optional)</label>
                <textarea
                  value={editForm.code_example}
                  onChange={e => setEditForm(p => ({ ...p, code_example: e.target.value }))}
                  className={`${inputClass} font-mono text-xs`}
                  style={inputStyle}
                  rows={5}
                />
              </div>
            </>
          )}

          {c.type === 'concept' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Title</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Explanation</label>
                <textarea
                  value={editForm.explanation}
                  onChange={e => setEditForm(p => ({ ...p, explanation: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                  rows={10}
                  required
                />
              </div>
            </>
          )}

          {c.type === 'code_snippet' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Title</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Code</label>
                <textarea
                  value={editForm.code}
                  onChange={e => setEditForm(p => ({ ...p, code: e.target.value }))}
                  className={`${inputClass} font-mono text-xs`}
                  style={inputStyle}
                  rows={8}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Explanation (optional)</label>
                <textarea
                  value={editForm.explanation}
                  onChange={e => setEditForm(p => ({ ...p, explanation: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                  rows={4}
                />
              </div>
            </>
          )}

          {/* Tags + Difficulty */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Tags (comma separated)</label>
              <input
                value={editForm.tags}
                onChange={e => setEditForm(p => ({ ...p, tags: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--subtext)' }}>Difficulty</label>
              <select
                value={editForm.difficulty}
                onChange={e => setEditForm(p => ({ ...p, difficulty: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </article>
    )
  }

  // ─── Read mode (original) ───
  let mainContent = ''
  let codeContent = ''
  if (c.type === 'qa') {
    mainContent = c.answer || ''
    codeContent = c.code_example || ''
  } else if (c.type === 'concept') {
    mainContent = c.explanation || ''
  } else if (c.type === 'code_snippet') {
    mainContent = c.explanation || ''
    codeContent = c.code || ''
  }

  const blocks = parseContent(mainContent)
  const hasCodeInContent = blocks.some(b => b.type === 'code')

  return (
    <article className="min-h-[60vh]" style={{ fontSize: `${fontSize}px` }}>

      {/* Badges + Edit + Mark Done */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="text-xs px-3 py-1 rounded-full font-semibold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          {typeLabel}
        </span>
        {c.difficulty && (
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${difficultyColor}`}>
            {c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)}
          </span>
        )}
        {/* Edit pencil icon */}
        <button
          onClick={startEdit}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{ color: 'var(--subtext)' }}
          title="Edit card"
        >
          <Pencil size={14} />
        </button>
        <div className="flex-1" />
        <button
          onClick={handleToggleDone}
          disabled={loading}
          className={`text-sm px-4 py-2 rounded-lg font-semibold transition-colors ${
            card.done
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20'
          }`}
          style={!card.done ? { backgroundColor: 'var(--border)', color: 'var(--text)' } : {}}
        >
          {card.done ? '✓ Completed' : 'Mark Done'}
        </button>
      </div>

      {/* Question / Title */}
      <h1
        className="font-bold leading-tight mb-5"
        style={{ color: 'var(--text)', fontSize: '1.5em', letterSpacing: '-0.02em' }}
      >
        {renderInline(c.type === 'qa' ? (c.question || '') : (c.title || ''))}
      </h1>

      {/* Tags */}
      {c.tags && c.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-7 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          {c.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-md font-mono"
              style={{ backgroundColor: 'var(--border)', color: 'var(--subtext)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Article body */}
      <div className="article-body">
        {blocks.map((block, i) => renderBlock(block, i))}

        {/* Standalone code (code_example / code field) if none already in body */}
        {codeContent && !hasCodeInContent && (
          <CodeBlock code={codeContent} lang="python" />
        )}
      </div>

      {/* Prev / Next */}
      <div
        className="flex items-center justify-between mt-12 pt-6 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            hasPrev ? 'hover:bg-brand-50 dark:hover:bg-brand-900/20' : 'opacity-30 cursor-not-allowed'
          }`}
          style={{ color: 'var(--text)' }}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            hasNext ? 'hover:bg-brand-50 dark:hover:bg-brand-900/20' : 'opacity-30 cursor-not-allowed'
          }`}
          style={{ color: 'var(--text)' }}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </article>
  )
}
