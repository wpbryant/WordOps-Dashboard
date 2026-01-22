import type { Updates } from './types'
import { Package, Wrench, Puzzle, Image } from 'lucide-react'

interface UpdatesTileProps {
  updates: Updates
  onClick?: () => void
  onViewDetails?: () => void
}

export function UpdatesTile({ updates, onClick, onViewDetails }: UpdatesTileProps) {
  const { systemPackages, siteUpdates, totalSiteUpdates } = updates
  const totalUpdates = systemPackages + totalSiteUpdates

  const hasUpdates = totalUpdates > 0

  return (
    <button
      onClick={onClick}
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          hasUpdates
            ? 'bg-gradient-to-br from-amber-500 to-orange-500'
            : 'bg-gradient-to-br from-emerald-500 to-teal-500'
        }`}>
          <Package className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Updates Required
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {hasUpdates ? 'Available now' : 'All up to date'}
          </p>
        </div>
      </div>

      {/* Total Count */}
      <div className="mb-4">
        <p className={`text-3xl font-semibold ${
          hasUpdates
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-emerald-600 dark:text-emerald-400'
        }`}>
          {totalUpdates}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          {totalUpdates === 1 ? 'update' : 'updates'} available
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        {/* System Updates */}
        <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-zinc-600 dark:text-zinc-400">System</span>
          </div>
          <span className={`font-medium ${
            systemPackages > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {systemPackages}
          </span>
        </div>

        {/* Site Updates */}
        <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Puzzle className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-zinc-600 dark:text-zinc-400">Plugins</span>
          </div>
          <span className={`font-medium ${
            siteUpdates.plugins > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {siteUpdates.plugins}
          </span>
        </div>

        {/* WordPress Core */}
        <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Image className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-zinc-600 dark:text-zinc-400">WP Core</span>
          </div>
          <span className={`font-medium ${
            siteUpdates.wordpressCore > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {siteUpdates.wordpressCore}
          </span>
        </div>

        {/* Themes */}
        <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-pink-500" />
            <span className="text-zinc-600 dark:text-zinc-400">Themes</span>
          </div>
          <span className={`font-medium ${
            siteUpdates.themes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {siteUpdates.themes}
          </span>
        </div>
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
