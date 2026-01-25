import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Server,
  Terminal,
  Cpu,
  Clock,
  Shield,
  RefreshCw,
  Download,
  Archive,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { useServerOverview, updatePackages } from '../../lib/server-config-api'
import { cn } from '../../lib/utils'

/**
 * Format uptime from seconds to human-readable string
 */
function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

/**
 * Format ISO date string to readable date
 */
function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'Never'
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return 'Unknown'
  }
}

/**
 * OverviewTab component displays server overview information
 */
export function OverviewTab() {
  const queryClient = useQueryClient()
  const { data: overview, isLoading, error, refetch } = useServerOverview()

  // Modal state
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [updateType, setUpdateType] = useState<'all' | 'security'>('all')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'confirming' | 'updating' | 'success' | 'error'>('idle')
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateMessage, setUpdateMessage] = useState('')
  const [updatedCount, setUpdatedCount] = useState(0)

  // Package update mutation
  const updateMutation = useMutation({
    mutationFn: (type: 'all' | 'security') => updatePackages(type),
    onMutate: () => {
      setUpdateStatus('updating')
      setUpdateProgress(0)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUpdateProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            return 100
          }
          // Increment in steps: 0 -> 25 -> 50 -> 75 -> 100
          const nextValue = Math.min(100, prev + 25)
          return nextValue
        })
      }, 2000)

      return () => clearInterval(progressInterval)
    },
    onSuccess: (data) => {
      setUpdateStatus('success')
      setUpdatedCount(data.updated_count)
      setUpdateMessage(data.message)
      setUpdateProgress(100)

      // Invalidate overview query to refresh update counts
      queryClient.invalidateQueries({ queryKey: ['server', 'overview'] })

      // Auto-close after 5 seconds
      setTimeout(() => {
        setUpdateModalOpen(false)
        setUpdateStatus('idle')
        setUpdateProgress(0)
      }, 5000)
    },
    onError: (err: Error) => {
      setUpdateStatus('error')
      setUpdateMessage(err.message || 'Package update failed')
    },
  })

  const handleUpdateClick = (type: 'all' | 'security') => {
    setUpdateType(type)
    setUpdateStatus('confirming')
    setUpdateModalOpen(true)
  }

  const handleConfirmUpdate = () => {
    updateMutation.mutate(updateType)
  }

  const handleCloseModal = () => {
    setUpdateModalOpen(false)
    setUpdateStatus('idle')
    setUpdateProgress(0)
  }

  const totalUpdates = (overview?.security_updates || 0) + (overview?.other_updates || 0)
  const isOnline = (overview?.uptime_seconds || 0) > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Failed to load server overview</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Server Header Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
              <Server className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {overview?.hostname || 'Unknown'}
                </h1>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                    isOnline
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isOnline ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-zinc-400 dark:bg-zinc-500'
                    )}
                  />
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {overview?.public_ip || 'Unknown IP'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* OS Version */}
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <Terminal className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>OS Version</span>
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {overview?.os_version || 'Unknown'}
          </p>
        </div>

        {/* Kernel Version */}
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <Cpu className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            <span>Kernel</span>
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
            {overview?.kernel_version || 'Unknown'}
          </p>
        </div>

        {/* Uptime */}
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Uptime</span>
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {overview ? formatUptime(overview.uptime_seconds) : 'Unknown'}
          </p>
        </div>

        {/* WordOps Version */}
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <Server className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            <span>WordOps</span>
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {overview?.wordops_version ? `v${overview.wordops_version}` : 'Not detected'}
          </p>
        </div>
      </div>

      {/* Package Updates Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Package Updates</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {totalUpdates > 0
                  ? `${totalUpdates} package${totalUpdates > 1 ? 's' : ''} available`
                  : 'System is up to date'}
              </p>
            </div>
          </div>
          {(overview?.security_updates || 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
              <Shield className="w-3.5 h-3.5" />
              {overview?.security_updates} security
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleUpdateClick('all')}
            disabled={totalUpdates === 0 || updateMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              totalUpdates > 0 && !updateMutation.isPending
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', updateMutation.isPending && 'animate-spin')} />
            Update All Packages
          </button>
          <button
            onClick={() => handleUpdateClick('security')}
            disabled={(overview?.security_updates || 0) === 0 || updateMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              (overview?.security_updates || 0) > 0 && !updateMutation.isPending
                ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            )}
          >
            <Shield className="w-4 h-4" />
            Update Security Only
          </button>
        </div>
      </div>

      {/* Last Backup Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <Archive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Last Backup</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {formatDate(overview?.last_backup_date || null)}
            </p>
          </div>
        </div>
      </div>

      {/* Package Update Modal */}
      {updateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={updateStatus === 'updating' ? undefined : handleCloseModal}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Confirmation State */}
              {updateStatus === 'confirming' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                      <Download className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Update System Packages
                      </h3>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {updateType === 'all'
                        ? `This will update ${totalUpdates} system packages. This may take a few minutes.`
                        : `This will update ${overview?.security_updates || 0} security updates. This may take a few minutes.`}
                    </p>
                  </div>

                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                    <p className="mb-2">
                      <span className="font-medium">{totalUpdates}</span> total packages
                    </p>
                    {(overview?.security_updates || 0) > 0 && (
                      <p>
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {overview?.security_updates}
                        </span>{' '}
                        security updates
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmUpdate}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Update
                    </button>
                  </div>
                </>
              )}

              {/* Progress State */}
              {updateStatus === 'updating' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Updating Packages...
                      </h3>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                      <span>Progress</span>
                      <span>{updateProgress}%</span>
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500"
                        style={{ width: `${updateProgress}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Please wait while the system updates packages. This may take a few minutes.
                  </p>
                </>
              )}

              {/* Success State */}
              {updateStatus === 'success' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Update Complete
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                    Successfully updated {updatedCount} packages.
                  </p>

                  <button
                    onClick={handleCloseModal}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}

              {/* Error State */}
              {updateStatus === 'error' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Update Failed
                      </h3>
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-800 dark:text-red-200">{updateMessage}</p>
                  </div>

                  <button
                    onClick={handleCloseModal}
                    className="w-full px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
