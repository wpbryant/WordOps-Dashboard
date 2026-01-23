import type { Server } from './types'
import { Activity, Clock, HardDrive, Cpu, MemoryStick, Files } from 'lucide-react'

interface ServerStatusTileProps {
  server: Server
  onClick?: () => void
  onViewDetails?: () => void
}

const statusConfig = {
  online: { label: 'Online', color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
  offline: { label: 'Offline', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
  error: { label: 'Error', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
}

export function ServerStatusTile({ server, onClick, onViewDetails }: ServerStatusTileProps) {
  const status = statusConfig[server.status]

  const formatLastBoot = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <button
      onClick={onClick}
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200"
    >
      {/* Status Indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-2.5 h-2.5 rounded-full ${status.color} animate-pulse`} />
        <span className={`text-sm font-semibold ${status.textColor}`}>
          {status.label}
        </span>
      </div>

      {/* Hostname */}
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1 font-sans">
        {server.hostname}
      </h3>

      {/* Uptime */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        <Clock className="w-3.5 h-3.5" />
        <span>{server.uptime}</span>
      </div>

      {/* Resource Metrics */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <Cpu className="w-4 h-4 mx-auto mb-1 text-blue-500" />
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {server.cpuUsage}%
          </span>
        </div>
        <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <MemoryStick className="w-4 h-4 mx-auto mb-1 text-teal-500" />
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {server.memoryUsage}%
          </span>
        </div>
        <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <HardDrive className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {server.diskUsage}%
          </span>
        </div>
        {server.inodesPercent !== null && server.inodesPercent !== undefined ? (
          <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <Files className="w-4 h-4 mx-auto mb-1 text-purple-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {server.inodesPercent}%
            </span>
          </div>
        ) : (
          <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <Files className="w-4 h-4 mx-auto mb-1 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-400">
              N/A
            </span>
          </div>
        )}
      </div>

      {/* Boot Time */}
      <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
        <span>Booted {formatLastBoot(server.lastBootTime)}</span>
        <Activity className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

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
