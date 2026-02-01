import { useState } from 'react'
import { Shield, Lock, Settings, Loader2, AlertTriangle } from 'lucide-react'
import { useSshConfig, useUpdateSshConfig } from '../../lib/server-config-api'
import type { SSHConfig, SSHConfigUpdate } from '../../types'
import { cn } from '../../lib/utils'

export function SSHConfigSection() {
  const { data: sshConfig, isLoading, error, refetch } = useSshConfig()
  const updateMutation = useUpdateSshConfig()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [formData, setFormData] = useState<SSHConfigUpdate>({
    port: 22,
    permit_root_login: false,
    password_authentication: false,
  })

  const handleEditClick = () => {
    if (sshConfig) {
      setFormData({
        port: sshConfig.port,
        permit_root_login: sshConfig.permit_root_login,
        password_authentication: sshConfig.password_authentication,
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
            <p className="text-zinc-600 dark:text-zinc-400">Failed to load SSH configuration</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* SSH Configuration Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  SSH Configuration
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Secure Shell server settings
                </p>
              </div>
            </div>
            <button
              onClick={handleEditClick}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Port */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Port</span>
              </div>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                {sshConfig?.port ?? 22}
              </p>
            </div>

            {/* Root Login */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Root Login</span>
              </div>
              <div className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium',
                sshConfig?.permit_root_login
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  sshConfig?.permit_root_login ? 'bg-amber-500' : 'bg-emerald-500'
                )} />
                {sshConfig?.permit_root_login ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            {/* Password Authentication */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Password Auth</span>
              </div>
              <div className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium',
                sshConfig?.password_authentication
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  sshConfig?.password_authentication ? 'bg-amber-500' : 'bg-emerald-500'
                )} />
                {sshConfig?.password_authentication ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>

          {/* Warning about port change */}
          <div className="mt-6 flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Important Security Note</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Changing the SSH port may lock you out if firewall rules are not updated. Ensure your new port is allowed through the firewall before applying changes.
              </p>
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
                Edit SSH Configuration
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Changes will be validated and applied immediately
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  SSH Port
                </label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Default: 22. Recommended: 2222 or higher for security.
                </p>
              </div>

              {/* Permit Root Login */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Permit Root Login
                </label>
                <select
                  value={formData.permit_root_login ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, permit_root_login: e.target.value === 'yes' })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="no">No (Recommended)</option>
                  <option value="yes">Yes</option>
                </select>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Disabling root login improves security. Use sudo with regular users.
                </p>
              </div>

              {/* Password Authentication */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Password Authentication
                </label>
                <select
                  value={formData.password_authentication ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, password_authentication: e.target.value === 'yes' })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="no">No (Recommended - Key-based only)</option>
                  <option value="yes">Yes</option>
                </select>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Key-based authentication is more secure than passwords.
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
