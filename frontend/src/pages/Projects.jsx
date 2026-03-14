import { useEffect, useState } from 'react'
import API from '../api/client'
import ProjectCard from '../components/ProjectCard'

/**
 * Projects — shows all portfolio projects.
 * URL: /projects
 */
export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', tech_stack: '', github: '', resume_bullets: '',
  })

  useEffect(() => {
    API.get('/projects').then(res => {
      setProjects(res.data)
      setLoading(false)
    })
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    const payload = {
      name: form.name,
      description: form.description || null,
      tech_stack: form.tech_stack.split(',').map(t => t.trim()).filter(Boolean),
      links: form.github ? { github: form.github } : null,
      resume_bullets: form.resume_bullets.split('\n').map(b => b.trim()).filter(Boolean),
    }
    const res = await API.post('/projects', payload)
    setProjects(prev => [res.data, ...prev])
    setForm({ name: '', description: '', tech_stack: '', github: '', resume_bullets: '' })
    setShowForm(false)
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-brand-300"
  const inputStyle = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }

  if (loading) {
    return <div className="flex items-center justify-center h-64" style={{ color: 'var(--subtext)' }}>Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>My Projects</h1>
        <button onClick={() => setShowForm(p => !p)}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
          {showForm ? 'Cancel' : '+ Add Project'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate}
          className="rounded-xl p-4 mb-5 space-y-3"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <input placeholder="Project name *" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className={inputClass} style={inputStyle} required />
          <textarea placeholder="Description" value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className={inputClass} style={inputStyle} rows={2} />
          <input placeholder="Tech stack (comma separated, e.g. FastAPI, React, pgvector)" value={form.tech_stack}
            onChange={e => setForm(p => ({ ...p, tech_stack: e.target.value }))}
            className={inputClass} style={inputStyle} />
          <input placeholder="GitHub URL (optional)" value={form.github}
            onChange={e => setForm(p => ({ ...p, github: e.target.value }))}
            className={inputClass} style={inputStyle} />
          <textarea
            placeholder={"Resume bullets (one per line)\ne.g. Architected event-driven pipeline using Kafka..."}
            value={form.resume_bullets}
            onChange={e => setForm(p => ({ ...p, resume_bullets: e.target.value }))}
            className={inputClass} style={inputStyle} rows={4} />
          <button type="submit"
            className="w-full py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
            Save Project
          </button>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--subtext)' }}>
          No projects yet. Add your first one.
        </p>
      ) : (
        projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))
      )}
    </div>
  )
}
