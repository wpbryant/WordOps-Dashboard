import { useState } from 'react'
import { Shield, X } from 'lucide-react'
import type { FirewallRuleCreate } from '../../types'
import { cn } from '../../lib/utils'

interface FirewallRuleFormProps {
  onSubmit: (rule: FirewallRuleCreate) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function FirewallRuleForm({ onSubmit, onCancel, isSubmitting = false }: FirewallRuleFormProps) {
  const [action, setAction] = useState<'allow' | 'deny'>('allow')
  const [port, setPort] = useState('')
  const [protocol, setProtocol] = useState<'tcp' | 'udp' | 'any'>('tcp')
  const [fromAddr, setFromAddr] = useState('Anywhere')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!port.trim()) {
      newErrors.port = 'Port is required'
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
      action,
      port: port.trim(),
      protocol,
      from_addr: fromAddr.trim() || 'Anywhere',
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
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Add Firewall Rule
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure UFW firewall access rule
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
          {/* Action */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Action <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAction('allow')}
                className={cn(
                  'px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all',
                  action === 'allow'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-400'
                )}
              >
                Allow
              </button>
              <button
                type="button"
                onClick={() => setAction('deny')}
                className={cn(
                  'px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all',
                  action === 'deny'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-400'
                )}
              >
                Deny
              </button>
            </div>
          </div>

          {/* Port */}
          <div>
            <label htmlFor="port" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Port <span className="text-red-500">*</span>
            </label>
            <input
              id="port"
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="e.g., 22, 80, 443, 8080-8090"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-zinc-800 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                errors.port ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'
              )}
              disabled={isSubmitting}
            />
            {errors.port && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.port}</p>
            )}
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Single port, range, or service name
            </p>
          </div>

          {/* Protocol */}
          <div>
            <label htmlFor="protocol" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Protocol
            </label>
            <select
              id="protocol"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as 'tcp' | 'udp' | 'any')}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-zinc-800 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'border-zinc-200 dark:border-zinc-700'
              )}
              disabled={isSubmitting}
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="any">Any</option>
            </select>
          </div>

          {/* From */}
          <div>
            <label htmlFor="from" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              From Address
            </label>
            <input
              id="from"
              type="text"
              value={fromAddr}
              onChange={(e) => setFromAddr(e.target.value)}
              placeholder="e.g., 192.168.1.0/24 or leave blank for Anywhere"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-zinc-800 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                'border-zinc-200 dark:border-zinc-700'
              )}
              disabled={isSubmitting}
            />
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              IP address or CIDR (leave blank for "Anywhere")
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
            {isSubmitting ? 'Adding...' : 'Add Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}
