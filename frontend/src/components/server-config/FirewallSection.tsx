import { useState } from 'react'
import {
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useFirewallRules, useAddFirewallRule, useDeleteFirewallRule } from '../../lib/server-config-api'
import type { UfwFirewallRule as FirewallRule, UfwFirewallRuleCreate } from '../../types'
import { FirewallRuleForm } from './FirewallRuleForm'
import { cn } from '../../lib/utils'

export function FirewallSection() {
  const { data: rules, isLoading, error, refetch } = useFirewallRules()
  const addMutation = useAddFirewallRule()
  const deleteMutation = useDeleteFirewallRule()

  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleAddRule = (rule: FirewallRuleCreate) => {
    addMutation.mutate(rule, {
      onSuccess: () => {
        setShowForm(false)
      },
    })
  }

  const handleDeleteRule = (ruleId: string) => {
    deleteMutation.mutate(ruleId, {
      onSuccess: () => {
        setDeleteConfirm(null)
      },
    })
  }

  const getActionIcon = (action: string) => {
    return action === 'allow' ? CheckCircle : XCircle
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'allow':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
      case 'deny':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
      default:
        return 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/30'
    }
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'allow':
        return 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
      case 'deny':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
      default:
        return 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 text-zinc-700 dark:text-zinc-400'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
        <div className="flex items-center justify-center">
          <div className="text-zinc-500 dark:text-zinc-400">Loading firewall rules...</div>
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
            <p className="font-medium">Failed to load firewall rules</p>
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
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Firewall Rules
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              UFW (Uncomplicated Firewall)
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
            title="Refresh rules"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors',
              'bg-blue-600 hover:bg-blue-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {!rules || rules.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400">No firewall rules configured</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Add a rule to get started
            </p>
          </div>
        ) : (
          rules.map((rule) => {
            const ActionIcon = getActionIcon(rule.action)
            const isDeleting = deleteMutation.isPending

            return (
              <div
                key={rule.id}
                className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Action Badge */}
                    <div className={cn(
                      'p-2 rounded-lg border',
                      getActionColor(rule.action)
                    )}>
                      <ActionIcon className="w-4 h-4" />
                    </div>

                    {/* Rule Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100">
                          {rule.port}
                        </span>
                        {rule.protocol && rule.protocol.toLowerCase() !== 'any' && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            /{rule.protocol}
                          </span>
                        )}
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium border',
                          getActionBadgeColor(rule.action)
                        )}>
                          {rule.action.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>From: {rule.from_addr || 'Anywhere'}</span>
                        <span className="text-zinc-300 dark:text-zinc-600">•</span>
                        <span className="font-mono">Rule #{rule.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {deleteConfirm === rule.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 mr-2">
                        Confirm delete?
                      </span>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        disabled={isDeleting}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                          'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                          'text-zinc-700 dark:text-zinc-300',
                          'disabled:opacity-50'
                        )}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={isDeleting}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                          'bg-red-600 hover:bg-red-700 text-white',
                          'disabled:opacity-50'
                        )}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(rule.id)}
                      disabled={isDeleting}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        'hover:bg-red-50 dark:hover:bg-red-950/30',
                        'text-zinc-400 hover:text-red-600 dark:hover:text-red-400',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Rule Form Modal */}
      {showForm && (
        <FirewallRuleForm
          onSubmit={handleAddRule}
          onCancel={() => setShowForm(false)}
          isSubmitting={addMutation.isPending}
        />
      )}
    </div>
  )
}
