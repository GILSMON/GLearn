import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import ProgressBar from './ProgressBar'

export default function DomainCard({ domain, selectMode, isSelected, onSelect }) {
  const navigate = useNavigate()

  const initials = domain.name
    .split(/[\s/]+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('')

  function handleClick() {
    if (selectMode) {
      onSelect(domain.id)
    } else {
      navigate(`/domain/${domain.id}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`rounded-2xl p-6 cursor-pointer transition-all duration-150 relative ${
        selectMode
          ? isSelected
            ? 'ring-2 ring-brand-500 shadow-md'
            : 'hover:opacity-80'
          : 'hover:shadow-md hover:-translate-y-0.5'
      }`}
      style={{
        backgroundColor: 'var(--card)',
        border: `1px solid ${isSelected ? '#3B82F6' : 'var(--border)'}`,
      }}
    >
      {/* Selection checkbox — top-right corner, only in select mode */}
      {selectMode && (
        <div className="absolute top-3 right-3">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
            isSelected
              ? 'bg-brand-500 border-brand-500'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          }`}>
            {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
          </div>
        </div>
      )}

      {/* Color accent bar */}
      <div className="h-1 rounded-full mb-5" style={{ backgroundColor: domain.color || '#3B82F6' }} />

      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: domain.color || '#3B82F6' }}
        >
          {initials}
        </div>
        <h3 className="font-semibold text-base leading-tight" style={{ color: 'var(--text)' }}>
          {domain.name}
        </h3>
      </div>

      <ProgressBar done={domain.done_count} total={domain.card_count} />
    </div>
  )
}
