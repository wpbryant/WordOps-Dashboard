import { Globe, FileText, Link, Code } from 'lucide-react'

interface SiteCountTileProps {
  title: string
  count: number
  icon: 'wordpress' | 'html' | 'alias' | 'php'
  onClick?: () => void
  onViewDetails?: () => void
}

const iconConfig = {
  wordpress: { icon: Globe, gradient: 'from-blue-500 to-cyan-500' },
  html: { icon: FileText, gradient: 'from-zinc-500 to-zinc-600' },
  alias: { icon: Link, gradient: 'from-zinc-400 to-zinc-500' },
  php: { icon: Code, gradient: 'from-purple-500 to-violet-500' },
}

export function SiteCountTile({
  title,
  count,
  icon,
  onClick,
  onViewDetails,
}: SiteCountTileProps) {
  const config = iconConfig[icon]

  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200"
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
        {title}
      </h3>

      {/* Count */}
      <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {count}
      </p>

      {/* Sites Label */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        {count === 1 ? 'site' : 'sites'}
      </p>

      {/* View Details Link */}
      <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <span
          onClick={(e) => { e.stopPropagation(); onViewDetails?.() }}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Details
        </span>
      </div>
    </button>
  )
}
