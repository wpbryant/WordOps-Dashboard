import type { UfwIntrusions } from './types'
import { Shield, ShieldAlert } from 'lucide-react'

interface UfwTileProps {
  intrusions: UfwIntrusions
  onClick?: () => void
  onViewDetails?: () => void
}

export function UfwTile({ intrusions, onClick, onViewDetails }: UfwTileProps) {
  const { blockedAttemptsLast24h, topBlockedIPs } = intrusions

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <button
      onClick={onClick}
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            UFW Intrusions
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Last 24 hours
          </p>
        </div>
      </div>

      {/* Block Count */}
      <div className="mb-4">
        <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
          {blockedAttemptsLast24h}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          blocked attempts
        </p>
      </div>

      {/* Top Blocked IPs */}
      {topBlockedIPs.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Top blocked IPs
          </p>
          {topBlockedIPs.slice(0, 3).map((blocked) => (
            <div
              key={blocked.ip}
              className="flex items-center justify-between text-xs py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3 h-3 text-rose-500" />
                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                  {blocked.ip}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 dark:text-zinc-500">
                  {blocked.attempts}x
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">
                  {formatTime(blocked.lastAttempt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

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
