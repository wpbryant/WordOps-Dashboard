import { useState } from 'react'
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react'
import {
  useMonitoringAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useToggleAlert,
} from '../../lib/server-config-api'
import type { MonitoringAlert, MonitoringAlertCreate, MonitoringAlertUpdate, AlertMetric, AlertOperator } from '../../types'
import { cn } from '../../lib/utils'

// Helper functions for display
const getMetricLabel = (metric: AlertMetric): string => {
  const labels: Record<AlertMetric, string> = {
    cpu: 'CPU',
    memory: 'Memory',
    disk: 'Disk',
    mysql_connections: 'MySQL Connections',
    network: 'Network',
    custom: 'Custom',
  }
  return labels[metric] || metric
}

const getOperatorSymbol = (operator: AlertOperator): string => {
  const symbols: Record<AlertOperator, string> = {
    greater: '>',
    less: '<',
    equal: '=',
  }
  return symbols[operator] || operator
}

const formatAlertCondition = (alert: MonitoringAlert): string => {
  const metric = getMetricLabel(alert.metric)
  const operator = getOperatorSymbol(alert.operator)
  const threshold = alert.threshold
  const duration = alert.duration
  return `${metric} ${operator} ${threshold}${alert.metric === 'cpu' || alert.metric === 'memory' || alert.metric === 'disk' ? '%' : ''} for ${duration}`
}

const METRIC_OPTIONS: { value: AlertMetric; label: string }[] = [
  { value: 'cpu', label: 'CPU' },
  { value: 'memory', label: 'Memory' },
  { value: 'disk', label: 'Disk' },
  { value: 'mysql_connections', label: 'MySQL Connections' },
  { value: 'network', label: 'Network' },
  { value: 'custom', label: 'Custom' },
]

const OPERATOR_OPTIONS: { value: AlertOperator; label: string }[] = [
  { value: 'greater', label: 'Greater than (>)' },
  { value: 'less', label: 'Less than (<)' },
  { value: 'equal', label: 'Equal to (=)' },
]

const DURATION_OPTIONS = [
  '5m',
  '15m',
  '30m',
  '1h',
  '6h',
  '24h',
]

interface AlertFormModalProps {
  mode: 'create' | 'edit'
  alert?: MonitoringAlert
  onSubmit: (data: MonitoringAlertCreate | MonitoringAlertUpdate) => void
  onCancel: () => void
  isSubmitting?: boolean
}

function AlertFormModal({ mode, alert, onSubmit, onCancel, isSubmitting = false }: AlertFormModalProps) {
  const [name, setName] = useState(alert?.name || '')
  const [metric, setMetric] = useState<AlertMetric>(alert?.metric || 'cpu')
  const [threshold, setThreshold] = useState(alert?.threshold?.toString() || '')
  const [operator, setOperator] = useState<AlertOperator>(alert?.operator || 'greater')
  const [duration, setDuration] = useState(alert?.duration || '5m')
  const [notificationEmail, setNotificationEmail] = useState(alert?.notificationEmail || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!threshold.trim()) {
      newErrors.threshold = 'Threshold is required'
    } else {
      const num = parseFloat(threshold)
      if (isNaN(num) || num < 0) {
        newErrors.threshold = 'Threshold must be a positive number'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    onSubmit({
      name: name.trim(),
      metric,
      threshold: parseFloat(threshold),
      operator,
      duration,
      notificationEmail: notificationEmail.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {mode === 'create' ? 'Create Alert' : 'Edit Alert'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {mode === 'create' ? 'Configure a new monitoring alert' : 'Update monitoring alert settings'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Alert Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High CPU Alert"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-zinc-800 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                errors.name ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'
              )}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Metric */}
          <div>
            <label htmlFor="metric" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Metric <span className="text-red-500">*</span>
            </label>
            <select
              id="metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value as AlertMetric)}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-zinc-800 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'border-zinc-200 dark:border-zinc-700'
              )}
              disabled={isSubmitting}
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Threshold */}
          <div>
            <label htmlFor="threshold" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Threshold <span className="text-red-500">*</span>
            </label>
            <input
              id="threshold"
              type="number"
              step="0.01"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g., 80"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-zinc-800 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                errors.threshold ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'
              )}
              disabled={isSubmitting}
            />
            {errors.threshold && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.threshold}</p>
            )}
            {(metric === 'cpu' || metric === 'memory' || metric === 'disk') && (
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                Value in percentage
              </p>
            )}
          </div>

          {/* Operator */}
          <div>
            <label htmlFor="operator" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              id="operator"
              value={operator}
              onChange={(e) => setOperator(e.target.value as AlertOperator)}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-zinc-800 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'border-zinc-200 dark:border-zinc-700'
              )}
              disabled={isSubmitting}
            >
              {OPERATOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Duration <span className="text-red-500">*</span>
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-zinc-800 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'border-zinc-200 dark:border-zinc-700'
              )}
              disabled={isSubmitting}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              How long the condition must persist before triggering
            </p>
          </div>

          {/* Notification Email (Optional) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Notification Email <span className="text-zinc-500 dark:text-zinc-400">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="admin@example.com"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-zinc-800 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                'border-zinc-200 dark:border-zinc-700'
              )}
              disabled={isSubmitting}
            />
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Email notifications (not yet implemented)
            </p>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              'text-zinc-700 dark:text-zinc-300',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              'bg-blue-600 hover:bg-blue-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create Alert' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface DeleteConfirmModalProps {
  alert: MonitoringAlert
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean
}

function DeleteConfirmModal({ alert, onConfirm, onCancel, isDeleting = false }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Delete Alert
          </h2>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to delete the alert <span className="font-semibold text-zinc-900 dark:text-zinc-100">"{alert.name}"</span>?
          </p>
          <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-950/30 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
              {formatAlertCondition(alert)}
            </p>
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            This action cannot be undone.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              'text-zinc-700 dark:text-zinc-300',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              'bg-red-600 hover:bg-red-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isDeleting ? 'Deleting...' : 'Delete Alert'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MonitoringTab() {
  const { data: alerts, isLoading, error, refetch } = useMonitoringAlerts()
  const createMutation = useCreateAlert()
  const updateMutation = useUpdateAlert()
  const deleteMutation = useDeleteAlert()
  const toggleMutation = useToggleAlert()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingAlert, setEditingAlert] = useState<MonitoringAlert | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<MonitoringAlert | null>(null)

  const handleCreateAlert = (data: MonitoringAlertCreate) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setModalOpen(false)
      },
    })
  }

  const handleUpdateAlert = (data: MonitoringAlertUpdate) => {
    if (editingAlert) {
      updateMutation.mutate({ id: editingAlert.id, alert: data }, {
        onSuccess: () => {
          setModalOpen(false)
          setEditingAlert(null)
        },
      })
    }
  }

  const handleDeleteAlert = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id, {
        onSuccess: () => {
          setDeleteConfirm(null)
        },
      })
    }
  }

  const handleToggleAlert = (id: string) => {
    toggleMutation.mutate(id)
  }

  const openCreateModal = () => {
    setModalMode('create')
    setEditingAlert(null)
    setModalOpen(true)
  }

  const openEditModal = (alert: MonitoringAlert) => {
    setModalMode('edit')
    setEditingAlert(alert)
    setModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
        <div className="flex items-center justify-center">
          <div className="text-zinc-500 dark:text-zinc-400">Loading monitoring alerts...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Failed to load monitoring alerts</p>
            <p className="text-sm text-red-500 dark:text-red-500 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      {/* Section Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Monitoring Alerts
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure threshold-based alerts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'hover:bg-zinc-100 dark:hover:bg-zinc-800',
              'text-zinc-500 dark:text-zinc-400',
              'disabled:opacity-50'
            )}
            title="Refresh alerts"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={openCreateModal}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors',
              'bg-blue-600 hover:bg-blue-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Plus className="w-4 h-4" />
            Create Alert
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {!alerts || alerts.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400">No monitoring alerts configured</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Create an alert to get started
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isToggling = toggleMutation.isPending

            return (
              <div
                key={alert.id}
                className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggleAlert(alert.id)}
                      disabled={isToggling}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        alert.enabled
                          ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                        'disabled:opacity-50'
                      )}
                      title={alert.enabled ? 'Disable alert' : 'Enable alert'}
                    >
                      {alert.enabled ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>

                    {/* Alert Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {alert.name}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium border',
                            alert.enabled
                              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 text-zinc-600 dark:text-zinc-400'
                          )}
                        >
                          {alert.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {formatAlertCondition(alert)}
                      </p>
                      {alert.notificationEmail && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                          Notifications: {alert.notificationEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(alert)}
                      disabled={isToggling || updateMutation.isPending}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                        'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      title="Edit alert"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(alert)}
                      disabled={isToggling || deleteMutation.isPending}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        'hover:bg-red-50 dark:hover:bg-red-950/30',
                        'text-zinc-400 hover:text-red-600 dark:hover:text-red-400',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      title="Delete alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Alert Form Modal */}
      {modalOpen && (
        <AlertFormModal
          mode={modalMode}
          alert={editingAlert || undefined}
          onSubmit={modalMode === 'create' ? handleCreateAlert : handleUpdateAlert}
          onCancel={() => {
            setModalOpen(false)
            setEditingAlert(null)
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          alert={deleteConfirm}
          onConfirm={handleDeleteAlert}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
