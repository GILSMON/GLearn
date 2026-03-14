/**
 * ProgressBar — shows done/total as a filled bar.
 */
export default function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1.5" style={{ color: 'var(--subtext)' }}>
        <span>{done}/{total} done</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-brand-100 dark:bg-brand-900/30">
        <div
          className="h-2.5 rounded-full bg-brand-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
