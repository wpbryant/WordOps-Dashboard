import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Server,
  Play,
  Pause,
  RotateCw,
  Settings,
  HardDrive,
  Activity,
  Database,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStackServices, startService, stopService, restartService } from '../../lib/server-config-api'
import type { StackServiceInfo } from '../../types'
import { cn } from '../../lib/utils'

export function StackServicesTab() {
  const queryClient = useQueryClient()
  const { data: services, isLoading, error } = useStackServices()

  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<StackServiceInfo | null>(null)

  // Start service mutation
  const startMutation = useMutation({
    mutationFn: startService,
    onSuccess: (_data, serviceName) => {
      toast.success(`${serviceName} started successfully`)
      queryClient.invalidateQueries({ queryKey: ['server', 'stack-services'] })
    },
    onError: (error: Error, serviceName) => {
      toast.error(`Failed to start ${serviceName}: ${error.message}`)
    },
  })

  // Stop service mutation
  const stopMutation = useMutation({
    mutationFn: stopService,
    onSuccess: (_data, serviceName) => {
      toast.success(`${serviceName} stopped successfully`)
      queryClient.invalidateQueries({ queryKey: ['server', 'stack-services'] })
    },
    onError: (error: Error, serviceName) => {
      toast.error(`Failed to stop ${serviceName}: ${error.message}`)
    },
  })

  // Restart service mutation
  const restartMutation = useMutation({
    mutationFn: restartService,
    onSuccess: (_data, serviceName) => {
      toast.success(`${serviceName} restarted successfully`)
      queryClient.invalidateQueries({ queryKey: ['server', 'stack-services'] })
    },
    onError: (error: Error, serviceName) => {
      toast.error(`Failed to restart ${serviceName}: ${error.message}`)
    },
  })

  const handleStart = (serviceName: string) => {
    startMutation.mutate(serviceName)
  }

  const handleStop = (serviceName: string) => {
    stopMutation.mutate(serviceName)
  }

  const handleRestart = (serviceName: string) => {
    restartMutation.mutate(serviceName)
  }

  const handleEditConfig = (service: StackServiceInfo) => {
    setSelectedService(service)
    setConfigModalOpen(true)
  }

  const handleCloseConfigModal = () => {
    setConfigModalOpen(false)
    setSelectedService(null)
  }

  const getServiceIcon = (serviceName: string) => {
    if (serviceName === 'nginx') return Server
    if (serviceName.startsWith('php') && serviceName.includes('-fpm')) return Activity
    if (serviceName === 'mariadb' || serviceName === 'mysql') return Database
    if (serviceName === 'redis-server') return Zap
    return Server
  }

  const getServiceIconColor = (serviceName: string) => {
    if (serviceName === 'nginx') return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
    if (serviceName.startsWith('php') && serviceName.includes('-fpm')) return 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
    if (serviceName === 'mariadb' || serviceName === 'mysql') return 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400'
    if (serviceName === 'redis-server') return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
    return 'bg-zinc-50 dark:bg-zinc-950/30 text-zinc-600 dark:text-zinc-400'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-emerald-500 dark:bg-emerald-400'
      case 'stopped':
        return 'bg-red-500 dark:bg-red-400'
      case 'restarting':
      case 'error':
        return 'bg-amber-500 dark:bg-amber-400'
      default:
        return 'bg-zinc-400 dark:bg-zinc-500'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
      case 'stopped':
        return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
      case 'restarting':
      case 'error':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 dark:text-zinc-400">Loading stack services...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400">Failed to load stack services</div>
      </div>
    )
  }

  if (!services || services.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 dark:text-zinc-400">No stack services found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          const Icon = getServiceIcon(service.name)
          const isRunning = service.status === 'running'
          const isPending = startMutation.isPending || stopMutation.isPending || restartMutation.isPending

          return (
            <div
              key={service.name}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', getServiceIconColor(service.name))}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {service.display_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('w-1.5 h-1.5 rounded-full', getStatusColor(service.status))} />
                        <span className={cn('text-xs font-medium', getStatusBadge(service.status))}>
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Version */}
                {service.version && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Version</span>
                    <span className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {service.version}
                    </span>
                  </div>
                )}

                {/* Memory Usage */}
                {service.memory_display && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Memory</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {service.memory_display}
                    </span>
                  </div>
                )}

                {/* PHP-FPM specific stats */}
                {service.php_fpm_connections !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Connections</span>
                    <span className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {service.php_fpm_connections}
                      {service.php_fpm_max_children && ` / ${service.php_fpm_max_children}`}
                    </span>
                  </div>
                )}

                {/* MySQL specific stats */}
                {service.mysql_connections !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Connections</span>
                    <span className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {service.mysql_connections}
                    </span>
                  </div>
                )}

                {/* Redis specific stats */}
                {service.redis_connected_clients !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Connected Clients</span>
                    <span className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {service.redis_connected_clients}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer - Action Buttons */}
              <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                {!isRunning && (
                  <button
                    onClick={() => handleStart(service.name)}
                    disabled={isPending}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
                      'hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    title="Start service"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </button>
                )}
                {isRunning && (
                  <button
                    onClick={() => handleStop(service.name)}
                    disabled={isPending}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
                      'hover:bg-red-100 dark:hover:bg-red-900/50',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    title="Stop service"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Stop
                  </button>
                )}
                <button
                  onClick={() => handleRestart(service.name)}
                  disabled={isPending}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                    'hover:bg-zinc-200 dark:hover:bg-zinc-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  title="Restart service"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Restart
                </button>
                <button
                  onClick={() => handleEditConfig(service)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ml-auto',
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                    'hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  )}
                  title="Edit configuration"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Config
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Config Edit Modal */}
      {configModalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseConfigModal}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Edit Configuration - {selectedService.display_name}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                  {selectedService.config_file}
                </p>
              </div>
              <button
                onClick={handleCloseConfigModal}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">✕</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center">
                <Settings className="w-12 h-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Configuration Editing
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Configuration file viewing and editing will be available in a future update.
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2 font-mono">
                  {selectedService.config_file}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={handleCloseConfigModal}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
