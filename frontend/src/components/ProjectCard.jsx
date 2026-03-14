/**
 * ProjectCard — shows a project with tech stack badges and resume bullets.
 * Props: project object { id, name, description, tech_stack, links, resume_bullets }
 */
export default function ProjectCard({ project }) {
  return (
    <div
      className="rounded-xl p-5 shadow-sm mb-4"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-base" style={{ color: 'var(--text)' }}>
          {project.name}
        </h3>
        {project.links?.github && (
          <a
            href={project.links.github}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs px-3 py-1 rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300 hover:bg-brand-200 transition-colors shrink-0"
          >
            GitHub →
          </a>
        )}
      </div>

      {project.description && (
        <p className="text-sm mb-3" style={{ color: 'var(--subtext)' }}>{project.description}</p>
      )}

      {/* Tech stack badges */}
      {project.tech_stack && project.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.tech_stack.map(tech => (
            <span key={tech}
              className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Resume bullets */}
      {project.resume_bullets && project.resume_bullets.length > 0 && (
        <ul className="space-y-1">
          {project.resume_bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text)' }}>
              <span className="text-brand-400 shrink-0">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
