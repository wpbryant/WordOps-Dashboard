import { useEffect } from 'react'
import { X, Cpu, Activity, HardDrive, Clock, Shield, Package, Globe } from 'lucide-react'
import type { Server, SiteCounts, UfwIntrusions, Updates } from './types'

interface DetailsModalProps {
  isOpen: boolean
  onClose: () => void
  tile: string
  server?: Server
  siteCounts?: SiteCounts
  ufwIntrusions?: UfwIntrusions
  updates?: Updates
}

export function DetailsModal({
  isOpen,
  onClose,
  tile,
  server,
  siteCounts,
  ufwIntrusions,
  updates,
}: DetailsModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const renderContent = () => {
    switch (tile) {
      case 'server':
        return server ? <ServerDetails server={server} /> : null

      case 'wordpress':
      case 'html':
      case 'alias':
      case 'php':
      case 'phpmysql':
      case 'proxy':
        return siteCounts ? <SiteTypeDetails tile={tile} siteCounts={siteCounts} /> : null

      case 'ufw':
        return ufwIntrusions ? <UfwDetails intrusions={ufwIntrusions} /> : null

      case 'updates':
        return updates ? <UpdatesDetails updates={updates} /> : null

      default:
        return <p>Unknown tile type</p>
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {getTileTitle(tile)}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

function getTileTitle(tile: string): string {
  switch (tile) {
    case 'server':
      return 'Server Details'
    case 'wordpress':
      return 'WordPress Sites Details'
    case 'html':
      return 'HTML Sites Details'
    case 'alias':
      return 'Alias Sites Details'
    case 'php':
      return 'PHP Sites Details'
    case 'phpmysql':
      return 'PHP+MySQL Sites Details'
    case 'proxy':
      return 'Proxy Sites Details'
    case 'ufw':
      return 'UFW Firewall Details'
    case 'updates':
      return 'System Updates Details'
    default:
      return 'Details'
  }
}

function ServerDetails({ server }: { server: Server }) {
  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            server.status === 'online'
              ? 'bg-emerald-500 animate-pulse'
              : server.status === 'offline'
                ? 'bg-red-500'
                : 'bg-amber-500'
          }`}
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {server.status === 'online' ? 'Online' : server.status === 'offline' ? 'Offline' : 'Error'}
        </span>
      </div>

      {/* Hostname */}
      <div>
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Hostname</h3>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{server.hostname}</p>
      </div>

      {/* Uptime */}
      <div>
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Uptime</h3>
        <p className="text-zinc-900 dark:text-zinc-100">{server.uptime}</p>
      </div>

      {/* Boot Time */}
      <div>
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Last Boot</h3>
        <p className="text-zinc-900 dark:text-zinc-100">
          {new Date(server.lastBootTime).toLocaleString()}
        </p>
      </div>

      {/* Resource Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="CPU" value={server.cpuUsage} unit="%" icon={<Cpu className="w-4 h-4" />} color="blue" />
        <MetricCard label="Memory" value={server.memoryUsage} unit="%" icon={<Activity className="w-4 h-4" />} color="teal" />
        <MetricCard label="Disk" value={server.diskUsage} unit="%" icon={<HardDrive className="w-4 h-4" />} color="amber" />
        <MetricCard
          label="Load Avg"
          value={server.loadAverage[0]}
          unit=""
          icon={<Clock className="w-4 h-4" />}
          color="zinc"
        />
      </div>

      {/* Load Averages Detail */}
      <div>
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Load Averages</h3>
        <div className="flex gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            1 min: <span className="font-mono font-medium">{server.loadAverage[0]}</span>
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            5 min: <span className="font-mono font-medium">{server.loadAverage[1]}</span>
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            15 min: <span className="font-mono font-medium">{server.loadAverage[2]}</span>
          </span>
        </div>
      </div>

      {/* Inodes */}
      {server.inodesTotal !== null && server.inodesTotal !== undefined && (
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Inodes Usage</h3>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {server.inodesUsed?.toLocaleString()} / {server.inodesTotal.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {server.inodesPercent}%
              </span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${server.inodesPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  color,
}: {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
  color: 'blue' | 'teal' | 'amber' | 'zinc'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    zinc: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }

  return (
    <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold">{value}{unit}</p>
      <p className="text-xs opacity-75">{label}</p>
    </div>
  )
}

function SiteTypeDetails({ tile, siteCounts }: { tile: string; siteCounts: SiteCounts }) {
  const config = {
    wordpress: { label: 'WordPress Sites', count: siteCounts.wordpress },
    html: { label: 'HTML Sites', count: siteCounts.html },
    alias: { label: 'Alias Sites', count: siteCounts.alias },
    php: { label: 'PHP Sites', count: siteCounts.php },
    phpmysql: { label: 'PHP+MySQL Sites', count: siteCounts.phpmysql },
    proxy: { label: 'Proxy Sites', count: siteCounts.proxy },
  }

  const { label, count } = config[tile as keyof typeof config]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{count}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Click the tile to view all {label.toLowerCase()} with detailed information.
        </p>
      </div>
    </div>
  )
}

function UfwDetails({ intrusions }: { intrusions: UfwIntrusions }) {
  const hasIntrusions = intrusions.blockedAttemptsLast24h > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            hasIntrusions
              ? 'bg-gradient-to-br from-rose-500 to-red-500'
              : 'bg-gradient-to-br from-emerald-500 to-teal-500'
          }`}
        >
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {intrusions.blockedAttemptsLast24h}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Blocked attempts (24h)
          </p>
        </div>
      </div>

      {hasIntrusions && intrusions.topBlockedIPs.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Top Blocked IPs</h3>
          <div className="space-y-2">
            {intrusions.topBlockedIPs.map((blocked) => (
              <div
                key={blocked.ip}
                className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {blocked.ip}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ports: {blocked.ports.join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    {blocked.attempts}x
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(blocked.lastAttempt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            No intrusion attempts detected in the last 24 hours. Your firewall is protecting your server.
          </p>
        </div>
      )}
    </div>
  )
}

function UpdatesDetails({ updates }: { updates: Updates }) {
  const hasUpdates = updates.systemPackages > 0 || updates.totalSiteUpdates > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            hasUpdates
              ? 'bg-gradient-to-br from-amber-500 to-orange-500'
              : 'bg-gradient-to-br from-emerald-500 to-teal-500'
          }`}
        >
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {updates.systemPackages + updates.totalSiteUpdates}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {hasUpdates ? 'Updates available' : 'All up to date'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <UpdateItem label="System Packages" count={updates.systemPackages} />
        <UpdateItem label="WordPress Core" count={updates.siteUpdates.wordpressCore} />
        <UpdateItem label="Plugins" count={updates.siteUpdates.plugins} />
        <UpdateItem label="Themes" count={updates.siteUpdates.themes} />
      </div>

      {!hasUpdates && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Everything is up to date! No updates are currently available.
          </p>
        </div>
      )}
    </div>
  )
}

function UpdateItem({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <span
        className={`text-sm font-medium ${
          count > 0
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-emerald-600 dark:text-emerald-400'
        }`}
      >
        {count > 0 ? `${count} update${count > 1 ? 's' : ''}` : 'Up to date'}
      </span>
    </div>
  )
}
