import { useState } from 'react'
import { Shield, AlertTriangle, Play, Pause, Settings, Loader2, CheckCircle } from 'lucide-react'
import { useFail2banConfig, useUpdateFail2banConfig, useStartFail2ban, useStopFail2ban } from '../../lib/server-config-api'
import type { Fail2banConfigUpdate } from '../../types'
import { cn } from '../../lib/utils'

/**
 * Format seconds to human readable duration
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function Fail2banSection() {
  const { data: fail2banConfig, isLoading, error, refetch } = useFail2banConfig()
  const updateMutation = useUpdateFail2banConfig()
  const startMutation = useStartFail2ban()
  const stopMutation = useStopFail2ban()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [formData, setFormData] = useState<Fail2banConfigUpdate>({
    bantime: 3600,
    findtime: 600,
    maxretry: 5,
    destemail: 'root@localhost',
  })

  const handleEditClick = () => {
    if (fail2banConfig) {
      setFormData({
        bantime: fail2banConfig.bantime,
        findtime: fail2banConfig.findtime,
        maxretry: fail2banConfig.maxretry,
        destemail: fail2banConfig.destemail,
      })
      setEditModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setEditModalOpen(false)
  }

  const handleSave = () => {
    updateMutation.mutate(formData, {
      onSuccess: () => {
        setEditModalOpen(false)
        refetch()
      },
    })
  }

  const handleStart = () => {
    startMutation.mutate(undefined, {
      onSuccess: () => {
        refetch()
      },
    })
  }

  const handleStop = () => {
    stopMutation.mutate(undefined, {
      onSuccess: () => {
        refetch()
      },
    })
  }

  const isPending = startMutation.isPending || stopMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">Failed to load fail2ban status</p>
          </div>
        </div>
      </div>
    )
  }

  const isEnabled = fail2banConfig?.enabled ?? false

  return (
    <>
      {/* Fail2ban Configuration Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                isEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              )}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Fail2ban
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isEnabled ? 'bg-emerald-500' : 'bg-red-500'
                  )} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isEnabled ? 'Active' : 'Stopped'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Start/Stop Button */}
              {!isEnabled && (
                <button
                  onClick={handleStart}
                  disabled={isPending}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
                    'hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  title="Start fail2ban service"
                >
                  {startMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Start
                </button>
              )}
              {isEnabled && (
                <button
                  onClick={handleStop}
                  disabled={isPending}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
                    'hover:bg-red-100 dark:hover:bg-red-900/50',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  title="Stop fail2ban service"
                >
                  {stopMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                  Stop
                </button>
              )}
              <button
                onClick={handleEditClick}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {/* Ban Time */}
            <div className="space-y-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Ban Time</span>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {formatDuration(fail2banConfig?.bantime ?? 3600)}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {fail2banConfig?.bantime ?? 3600} seconds
              </p>
            </div>

            {/* Find Time */}
            <div className="space-y-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Find Time</span>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {formatDuration(fail2banConfig?.findtime ?? 600)}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {fail2banConfig?.findtime ?? 600} seconds
              </p>
            </div>

            {/* Max Retry */}
            <div className="space-y-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Max Retry</span>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {fail2banConfig?.maxretry ?? 5}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                attempts before ban
              </p>
            </div>

            {/* Banned Total */}
            <div className="space-y-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Total Banned</span>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {fail2banConfig?.banned_total ?? 0}
                </p>
                {isEnabled && (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                IP addresses banned
              </p>
            </div>
          </div>

          {/* Active Jails */}
          {fail2banConfig?.jails && fail2banConfig.jails.length > 0 && (
            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Active Jails ({fail2banConfig.jails.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {fail2banConfig.jails.map((jail) => (
                  <span
                    key={jail}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                  >
                    <Shield className="w-3 h-3" />
                    {jail}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Destination Email */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Notification Email</span>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-0.5 font-mono">
                  {fail2banConfig?.destemail ?? 'root@localhost'}
                </p>
              </div>
              {isEnabled && (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseModal}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Edit Fail2ban Configuration
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Changes will be applied immediately
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Ban Time */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Ban Time (seconds)
                </label>
                <input
                  type="number"
                  min="60"
                  max="86400"
                  value={formData.bantime}
                  onChange={(e) => setFormData({ ...formData, bantime: parseInt(e.target.value) || 3600 })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  How long IPs are banned. Default: 3600 (1 hour)
                </p>
              </div>

              {/* Find Time */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Find Time (seconds)
                </label>
                <input
                  type="number"
                  min="60"
                  max="86400"
                  value={formData.findtime}
                  onChange={(e) => setFormData({ ...formData, findtime: parseInt(e.target.value) || 600 })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Time window for detecting failures. Default: 600 (10 min)
                </p>
              </div>

              {/* Max Retry */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Max Retry
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.maxretry}
                  onChange={(e) => setFormData({ ...formData, maxretry: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Failures before ban. Default: 5
                </p>
              </div>

              {/* Destination Email */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Destination Email
                </label>
                <input
                  type="email"
                  value={formData.destemail}
                  onChange={(e) => setFormData({ ...formData, destemail: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Email address for ban notifications
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
