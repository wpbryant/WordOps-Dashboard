import { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Activity,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useLogs } from '../../lib/server-config-api'
import type { LogSource, LogSeverity } from '../../types'

/**
 * Get severity color classes for log entries
 */
function getSeverityClasses(severity: LogSeverity) {
  switch (severity) {
    case 'debug':
      return {
        bg: 'bg-zinc-50 dark:bg-zinc-900/50',
        border: 'border-zinc-200 dark:border-zinc-800',
        text: 'text-zinc-700 dark:text-zinc-300',
        dot: 'bg-zinc-400',
        icon: Activity,
      }
    case 'info':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-900',
        text: 'text-blue-700 dark:text-blue-300',
        dot: 'bg-blue-500',
        icon: Info,
      }
    case 'warn':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-900',
        text: 'text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
        icon: AlertTriangle,
      }
    case 'error':
      return {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-900',
        text: 'text-red-700 dark:text-red-300',
        dot: 'bg-red-500',
        icon: XCircle,
      }
    case 'fatal':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        border: 'border-purple-200 dark:border-purple-900',
        text: 'text-purple-700 dark:text-purple-300',
        dot: 'bg-purple-500',
        icon: AlertCircle,
      }
    default:
      return {
        bg: 'bg-zinc-50 dark:bg-zinc-900/50',
        border: 'border-zinc-200 dark:border-zinc-800',
        text: 'text-zinc-700 dark:text-zinc-300',
        dot: 'bg-zinc-400',
        icon: Info,
      }
  }
}

/**
 * Get source display name and color
 */
function getSourceInfo(source: LogSource) {
  const sourceMap: Record<LogSource, { name: string; color: string }> = {
    nginx: { name: 'Nginx', color: 'bg-blue-500' },
    php: { name: 'PHP-FPM', color: 'bg-purple-500' },
    mysql: { name: 'MySQL', color: 'bg-teal-500' },
    system: { name: 'System', color: 'bg-zinc-500' },
    fail2ban: { name: 'Fail2ban', color: 'bg-red-500' },
    ufw: { name: 'UFW Firewall', color: 'bg-amber-500' },
  }
  return sourceMap[source] || { name: source, color: 'bg-zinc-500' }
}

/**
 * Single log entry component with timeline layout
 */
function LogEntry({ log }: { log: { id: string; source: LogSource; timestamp: string; severity: LogSeverity; message: string; clientIp?: string } }) {
  const severityClasses = getSeverityClasses(log.severity)
  const sourceInfo = getSourceInfo(log.source)
  const SeverityIcon = severityClasses.icon

  // Format timestamp
  let formattedTime = 'Unknown'
  try {
    const timestamp = new Date(log.timestamp)
    formattedTime = formatDistanceToNow(timestamp, { addSuffix: true })
  } catch {
    formattedTime = 'Invalid date'
  }

  return (
    <div className={`relative pl-6 pb-6 ${severityClasses.bg} ${severityClasses.border} border-l-2`}>
      {/* Timeline dot */}
      <div className={`absolute left-0 top-6 w-3 h-3 rounded-full ${severityClasses.dot} -translate-x-[7px]`} />

      <div className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        {/* Header: Source badge and timestamp */}
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-white ${sourceInfo.color}`}>
            <FileText className="w-3 h-3" />
            {sourceInfo.name}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <SeverityIcon className="w-3 h-3" />
            {formattedTime}
          </span>
        </div>

        {/* Message */}
        <p className={`text-sm ${severityClasses.text} font-mono break-all whitespace-pre-wrap`}>
          {log.message}
        </p>

        {/* Client IP if available */}
        {log.clientIp && (
          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Client IP:{' '}
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{log.clientIp}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * LogsTab component displays server logs with filtering and search
 */
export function LogsTab() {
  const [sourceFilter, setSourceFilter] = useState<LogSource | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch logs
  const { data: logs = [], isLoading, error, refetch } = useLogs(sourceFilter, searchQuery)

  const sourceOptions: { value: LogSource | 'all'; label: string }[] = [
    { value: 'all', label: 'All Sources' },
    { value: 'nginx', label: 'Nginx' },
    { value: 'php', label: 'PHP-FPM' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'system', label: 'System' },
    { value: 'fail2ban', label: 'Fail2ban' },
    { value: 'ufw', label: 'UFW Firewall' },
  ]

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">Failed to load logs</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (logs.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as LogSource | 'all')}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Empty state message */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No logs match your filters
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Try adjusting your source filter or search query
          </p>
          <button
            onClick={() => {
              setSourceFilter('all')
              setSearchInput('')
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Clear filters
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Source filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as LogSource | 'all')}
          className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Refresh button */}
        <button
          onClick={() => refetch()}
          className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          title="Refresh logs"
        >
          <RefreshCw className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      {/* Logs timeline */}
      <div className="py-4">
        {logs.map((log) => (
          <LogEntry key={log.id} log={log} />
        ))}
      </div>
    </div>
  )
}
