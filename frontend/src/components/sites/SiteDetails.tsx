import { useState } from 'react'
import {
  ExternalLink,
  Shield,
  Activity,
  FileText,
  Settings,
  Database,
  RefreshCw,
  Power,
  HardDrive,
  Network,
  Clock,
  FileStack,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
  Eye,
  EyeOff,
  Copy,
  Bell,
  Folder,
} from 'lucide-react'
import { FaWordpress, FaHtml5, FaPhp } from 'react-icons/fa'
import type { SiteDetailsProps, Site } from '../../types'
import { cn } from '../../lib/utils'

// Map nginx templates to display names
const nginxTemplateNames: Record<string, string> = {
  wp: 'WordPress (standard)',
  wpfc: 'WordPress + FastCGI Cache',
  wprocket: 'WordPress + WP Rocket',
  wpsc: 'WordPress + Super Cache',
  wpredis: 'WordPress + Redis Cache',
  woocommerce: 'WooCommerce',
  php: 'PHP',
  static: 'Static HTML',
  alias: 'Alias',
  default: 'Default',
}

type TabKey = 'overview' | 'configuration' | 'monitoring' | 'audit'

const tabs = [
  { key: 'overview' as const, label: 'Overview', icon: FileText },
  { key: 'configuration' as const, label: 'Configuration', icon: Settings },
  { key: 'monitoring' as const, label: 'Monitoring', icon: Activity },
  { key: 'audit' as const, label: 'Audit Log', icon: Clock },
]

// Helper functions - defined at module level to be shared across components
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SiteDetails({
  site,
  activeTab = 'overview',
  onTabChange,
  onVisitSite,
  onOpenPhpMyAdmin,
  onWpAdminLogin,
  onEditConfig,
  onClearCache,
  onRestartServices,
}: SiteDetailsProps) {
  const [currentTab, setCurrentTab] = useState<TabKey>(activeTab)

  const handleTabChange = (tab: TabKey) => {
    setCurrentTab(tab)
    onTabChange?.(tab)
  }

  const getSiteTypeIcon = (siteType: Site['siteType']) => {
    switch (siteType) {
      case 'wordpress':
        return FaWordpress
      case 'html':
        return FaHtml5
      case 'php':
        return FaPhp
      default:
        return null
    }
  }

  const SiteTypeIcon = getSiteTypeIcon(site.siteType)

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl mb-4">
        <div className="px-6 py-6">
          {/* Site Title & Status */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex items-center justify-center w-14 h-14 rounded-xl',
                  site.siteType === 'wordpress' &&
                    'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
                  site.siteType === 'alias' &&
                    'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
                  site.siteType === 'html' &&
                    'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400',
                  site.siteType === 'php' &&
                    'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400'
                )}
              >
                {SiteTypeIcon && <SiteTypeIcon className="w-7 h-7" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {site.domain}
                  </h1>
                  <button
                    onClick={onVisitSite}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Open site"
                  >
                    <ExternalLink className="w-5 h-5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                      site.status === 'online'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        site.status === 'online'
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : 'bg-zinc-400 dark:bg-zinc-500'
                      )}
                    />
                    {site.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {site.siteType.charAt(0).toUpperCase() + site.siteType.slice(1)}
                  </span>
                  {site.phpVersion && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      PHP {site.phpVersion}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => console.log('Open file manager for:', site.domain)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
              >
                <Folder className="w-4 h-4" />
                <span className="hidden sm:inline">File Manager</span>
              </button>
              <button
                onClick={onOpenPhpMyAdmin}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
              >
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">phpMyAdmin</span>
              </button>
              {site.siteType === 'wordpress' && (
                <button
                  onClick={onWpAdminLogin}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
                >
                  <FaWordpress className="w-4 h-4" />
                  <span className="hidden sm:inline">WP Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Disk Usage</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {site.monitoring.diskUsage}
              </p>
            </div>
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <Network className="w-3.5 h-3.5" />
                <span>Bandwidth</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {site.monitoring.bandwidthMonth}
              </p>
            </div>
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <FileStack className="w-3.5 h-3.5" />
                <span>Inodes Used</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {site.monitoring.inodesUsed}
              </p>
            </div>
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span>Response Time</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {site.monitoring.avgResponseTime}ms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl mb-4 overflow-x-auto">
        <nav className="flex gap-1 px-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  currentTab === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto px-6">
        <div className="max-w-6xl mx-auto py-6">
          {currentTab === 'overview' && (
            <OverviewTab site={site} onClearCache={onClearCache} onRestartServices={onRestartServices} />
          )}
          {currentTab === 'configuration' && (
            <ConfigurationTab site={site} onEditConfig={onEditConfig} />
          )}
          {currentTab === 'monitoring' && <MonitoringTab site={site} />}
          {currentTab === 'audit' && <AuditTab site={site} />}
        </div>
      </div>
    </div>
  )
}

// Overview Tab
function OverviewTab({
  site,
  onClearCache,
  onRestartServices,
}: {
  site: Site
  onClearCache?: () => void
  onRestartServices?: () => void
}) {
  const hasPluginUpdates = site.siteType === 'wordpress' && site.plugins.some((p) => p.updateAvailable)
  const [showDbPassword, setShowDbPassword] = useState(false)

  const getNginxTemplateName = (template: string) => {
    return nginxTemplateNames[template] || template
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Basic Information
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Domain</dt>
              <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{site.domain}</dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Site Type</dt>
              <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {site.siteType.charAt(0).toUpperCase() + site.siteType.slice(1)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Install Path</dt>
              <dd className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{site.installPath}</dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">PHP Version</dt>
              <dd className="text-sm font-mono text-zinc-900 dark:text-zinc-100">
                {site.phpVersion || 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Created</dt>
              <dd className="text-sm text-zinc-900 dark:text-zinc-100">
                {new Date(site.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Last Backup</dt>
              <dd className="text-sm text-zinc-900 dark:text-zinc-100">
                {site.lastBackup
                  ? new Date(site.lastBackup).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Never'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Nginx Configuration */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Nginx Configuration
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {getNginxTemplateName(site.nginxTemplate)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Template: <code className="font-mono">{site.nginxTemplate}</code>
                </p>
              </div>
            </div>
            {site.cacheEnabled && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                Cache Enabled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Database Information */}
      {site.database && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Database Information
            </h2>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Database Name</dt>
                <dd className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{site.database.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Host</dt>
                <dd className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{site.database.host}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">User</dt>
                <dd className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{site.database.user}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Password</dt>
                <dd className="flex items-center gap-2">
                  <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100">
                    {showDbPassword ? site.database.password : '••••••••••••'}
                  </span>
                  <button
                    onClick={() => setShowDbPassword(!showDbPassword)}
                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title={showDbPassword ? 'Hide password' : 'Show password'}
                  >
                    {showDbPassword ? (
                      <EyeOff className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-zinc-500" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(site.database!.password)
                      console.log('Password copied to clipboard')
                    }}
                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Copy password"
                  >
                    <Copy className="w-4 h-4 text-zinc-500" />
                  </button>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* SSL Certificate */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            SSL Certificate
          </h2>
        </div>
        <div className="p-6">
          {!site.sslEnabled || !site.sslCertificate ? (
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">SSL not enabled</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield
                    className={cn(
                      'w-5 h-5',
                      site.sslCertificate.status === 'active' && 'text-emerald-500 dark:text-emerald-400',
                      site.sslCertificate.status === 'expiring' && 'text-amber-500 dark:text-amber-400',
                      site.sslCertificate.status === 'expired' && 'text-red-500 dark:text-red-400'
                    )}
                  />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {site.sslCertificate.provider}
                  </span>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                    site.sslCertificate.status === 'active' &&
                      'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
                    site.sslCertificate.status === 'expiring' &&
                      'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
                    site.sslCertificate.status === 'expired' &&
                      'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                  )}
                >
                  {site.sslCertificate.status.charAt(0).toUpperCase() + site.sslCertificate.status.slice(1)}
                </span>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Issued</dt>
                  <dd className="text-sm text-zinc-900 dark:text-zinc-100">
                    {formatDate(site.sslCertificate.issuedDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Expires</dt>
                  <dd className="text-sm text-zinc-900 dark:text-zinc-100">
                    {formatDate(site.sslCertificate.expiresDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Auto-Renew</dt>
                  <dd className="text-sm text-zinc-900 dark:text-zinc-100">
                    {site.sslCertificate.autoRenew ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        <XCircle className="w-4 h-4" />
                        Disabled
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* WordPress Plugins */}
      {site.siteType === 'wordpress' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Plugins
            </h2>
            {hasPluginUpdates && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                <RefreshCw className="w-3.5 h-3.5" />
                {site.plugins.filter((p) => p.updateAvailable).length} update
                {site.plugins.filter((p) => p.updateAvailable).length > 1 ? 's' : ''} available
              </span>
            )}
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {site.plugins.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No plugins installed
              </div>
            ) : (
              site.plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <FaWordpress className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {plugin.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">v{plugin.version}</p>
                    </div>
                  </div>
                  {plugin.updateAvailable && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400">
                      <RefreshCw className="w-3 h-3" />
                      Update
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Quick Actions
          </h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onClearCache}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Clear Cache
            </button>
            <button
              onClick={onRestartServices}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              <Power className="w-4 h-4" />
              Restart Services
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Configuration Tab
function ConfigurationTab({
  site,
  onEditConfig,
}: {
  site: Site
  onEditConfig?: (config: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Configuration Settings
          </h2>
          <button
            onClick={() =>
              onEditConfig?.({
                phpVersion: site.phpVersion,
                nginxTemplate: site.nginxTemplate,
                cacheEnabled: site.cacheEnabled,
                sslEnabled: site.sslEnabled,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-600/20"
          >
            <Settings className="w-4 h-4" />
            Edit Configuration
          </button>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">PHP Version</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                PHP version for this site
              </p>
            </div>
            <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
              {site.phpVersion || 'N/A'}
            </span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Nginx Template</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Nginx configuration template
              </p>
            </div>
            <span className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
              {site.nginxTemplate}
            </span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Cache</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                FastCGI cache status
              </p>
            </div>
            {site.cacheEnabled ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                <XCircle className="w-3.5 h-3.5" />
                Disabled
              </span>
            )}
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">SSL</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                HTTPS certificate status
              </p>
            </div>
            {site.sslEnabled ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                <Shield className="w-3.5 h-3.5" />
                Disabled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PHP Configuration */}
      {(site.siteType === 'wordpress' || site.siteType === 'php') && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              PHP Configuration
            </h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Memory Limit</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Maximum memory PHP can allocate
                </p>
              </div>
              <select
                className="text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                onChange={(e) => onEditConfig?.({ ...site, phpMemoryLimit: e.target.value })}
              >
                <option value="128M">128 MB</option>
                <option value="256M" selected>256 MB</option>
                <option value="512M">512 MB</option>
                <option value="1G">1 GB</option>
                <option value="2G">2 GB</option>
              </select>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Max Upload Size</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Maximum file upload size
                </p>
              </div>
              <select
                className="text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                onChange={(e) => onEditConfig?.({ ...site, maxUploadSize: e.target.value })}
              >
                <option value="32M">32 MB</option>
                <option value="64M" selected>64 MB</option>
                <option value="128M">128 MB</option>
                <option value="256M">256 MB</option>
                <option value="512M">512 MB</option>
              </select>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Execution Time</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Maximum script execution time
                </p>
              </div>
              <select
                className="text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                onChange={(e) => onEditConfig?.({ ...site, maxExecutionTime: e.target.value })}
              >
                <option value="30">30 seconds</option>
                <option value="60" selected>60 seconds</option>
                <option value="120">120 seconds</option>
                <option value="300">300 seconds</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Configuration changes require service restart
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Some configuration changes may require restarting nginx or PHP-FPM services to take effect.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Monitoring Tab
function MonitoringTab({ site }: { site: Site }) {
  const stats = site.monitoring

  return (
    <div className="space-y-6">
      {/* Uptime & Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Uptime</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.uptimePercent}%
                </p>
              </div>
            </div>
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all"
              style={{ width: `${stats.uptimePercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Avg Response</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.avgResponseTime}ms
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {stats.avgResponseTime < 200
              ? 'Excellent performance'
              : stats.avgResponseTime < 500
                ? 'Good performance'
                : 'Slow response'}
          </p>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Resource Usage
          </h2>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Disk Usage</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Total storage used</p>
              </div>
            </div>
            <span className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
              {stats.diskUsage}
            </span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Bandwidth</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">This month</p>
              </div>
            </div>
            <span className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
              {stats.bandwidthMonth}
            </span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileStack className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Inodes Used</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">File system inodes</p>
              </div>
            </div>
            <span className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
              {stats.inodesUsed}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts Configuration */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Alert Configuration
          </h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600" />
            <span className="ms-3 text-sm font-medium text-zinc-900 dark:text-zinc-300">
              Enabled
            </span>
          </label>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Alert Email
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              defaultValue="admin@example.com"
              className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Uptime Alert</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Notify when uptime falls below</p>
              </div>
            </div>
            <select className="text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500">
              <option>95%</option>
              <option selected>99%</option>
              <option>99.5%</option>
              <option>99.9%</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Response Time Alert</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Notify when response time exceeds</p>
              </div>
            </div>
            <select className="text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500">
              <option>200ms</option>
              <option>300ms</option>
              <option selected>500ms</option>
              <option>1000ms</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Disk Usage Alert</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Notify when disk usage exceeds</p>
              </div>
            </div>
            <select className="text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500">
              <option>75%</option>
              <option>80%</option>
              <option selected>85%</option>
              <option>90%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Performance Status
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.uptimePercent >= 99 && (
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Excellent uptime reliability</span>
              </div>
            )}
            {stats.avgResponseTime < 300 && (
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Fast response times</span>
              </div>
            )}
            {stats.avgResponseTime >= 500 && (
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Consider optimizing for faster response</span>
              </div>
            )}
            {stats.uptimePercent < 95 && (
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Uptime below recommended threshold</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Audit Log Tab
function AuditTab({ site }: { site: Site }) {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Audit Log
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            History of changes and actions for this site
          </p>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {site.auditLog.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No audit log entries
            </div>
          ) : (
            site.auditLog.map((entry, index) => (
              <div
                key={entry.id}
                className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        entry.user === 'System'
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      {entry.user === 'System' ? (
                        <Activity className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {entry.action}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {entry.user}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">•</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                  {index === 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                      Latest
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
