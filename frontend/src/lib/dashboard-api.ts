import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client'

// =============================================================================
// Types for API responses (may differ from UI types)
// =============================================================================

export interface SystemMetricsResponse {
  cpu: {
    current: number
    history: Array<{ timestamp: string; value: number }>
  }
  ram: {
    current: number
    history: Array<{ timestamp: string; value: number }>
  }
  disk: {
    current: number
    history: Array<{ timestamp: string; value: number }>
  }
  network_in: {
    current: number
    history: Array<{ timestamp: string; value: number }>
  }
  network_out: {
    current: number
    history: Array<{ timestamp: string; value: number }>
  }
}

export interface ServiceStatus {
  name: string
  active: boolean
  sub_state: string
}

export interface SystemInfoResponse {
  hostname: string
  uptime_seconds: number
  boot_time: number
  security_updates: number
  other_updates: number
  disk_usage_percent: number
  public_ip: string
  inodes_used?: number | null
  inodes_total?: number | null
  inodes_percent?: number | null
}

export interface Site {
  name: string
  type: 'wordpress' | 'php' | 'html' | 'proxy' | 'mysql'
  ssl: boolean
  cache: string
  php_version?: string
  created_at: string
}

// =============================================================================
// API Hooks
// =============================================================================

export function useServerMetrics(range: '5m' | '10m' | '1h' | '24h' = '10m') {
  return useQuery({
    queryKey: ['server', 'metrics', range],
    queryFn: () => apiClient.get<SystemMetricsResponse>(`/api/v1/server/metrics?range=${range}`),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
  })
}

export function useServerInfo() {
  return useQuery({
    queryKey: ['server', 'info'],
    queryFn: () => apiClient.get<SystemInfoResponse>('/api/v1/server/info'),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  })
}

export function useServerServices() {
  return useQuery({
    queryKey: ['server', 'services'],
    queryFn: () => apiClient.get<ServiceStatus[]>('/api/v1/server/services'),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  })
}

export function useSites(filters?: { type?: string; ssl?: boolean; search?: string }) {
  const params = new URLSearchParams()
  if (filters?.type) params.append('type', filters.type)
  if (filters?.ssl !== undefined) params.append('ssl', String(filters.ssl))
  if (filters?.search) params.append('search', filters.search)

  const queryString = params.toString()
  return useQuery({
    queryKey: ['sites', queryString],
    queryFn: () => apiClient.get<Site[]>(`/api/v1/sites/${queryString ? `?${queryString}` : ''}`),
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export function useSite(domain: string) {
  return useQuery({
    queryKey: ['sites', domain],
    queryFn: () => apiClient.get<Site>(`/api/v1/sites/${encodeURIComponent(domain)}`),
    enabled: !!domain,
    staleTime: 30000,
  })
}

// =============================================================================
// Helper functions to transform API data to UI types
// =============================================================================

import type { Server, SiteCounts, UfwIntrusions, Updates } from '../components/dashboard/types'

export function transformServerMetrics(
  metrics: SystemMetricsResponse,
  services: ServiceStatus[],
  systemInfo?: SystemInfoResponse
): Server {
  // Check if server is online by checking critical services
  // php-fpm services are named like php8.1-fpm, php8.2-fpm, etc.
  const isOnline = services.some(
    s => (s.name === 'nginx' || (s.name.startsWith('php') && s.name.includes('-fpm'))) && s.active === true
  )

  // Format uptime from seconds to human readable
  const formatUptime = (seconds: number): string => {
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

  // Use system info if available, otherwise use defaults
  const hostname = systemInfo?.hostname || 'unknown'
  const uptime = systemInfo ? formatUptime(systemInfo.uptime_seconds) : 'Unknown'
  const lastBootTime = systemInfo
    ? new Date(systemInfo.boot_time * 1000).toISOString()
    : new Date().toISOString()
  const diskUsage = systemInfo?.disk_usage_percent ?? 0

  return {
    hostname,
    status: isOnline ? 'online' : 'offline',
    uptime,
    lastBootTime,
    cpuUsage: Math.round(metrics.cpu.current),
    memoryUsage: Math.round(metrics.ram.current),
    diskUsage,
    loadAverage: [0, 0, 0], // Would need additional endpoint
    inodesUsed: systemInfo?.inodes_used,
    inodesTotal: systemInfo?.inodes_total,
    inodesPercent: systemInfo?.inodes_percent,
  }
}

export function transformSiteCounts(sites: Site[]): SiteCounts {
  const counts: SiteCounts = {
    wordpress: 0,
    html: 0,
    alias: 0,
    php: 0,
    total: sites.length,
  }

  for (const site of sites) {
    switch (site.type) {
      case 'wordpress':
        counts.wordpress++
        break
      case 'html':
        counts.html++
        break
      case 'proxy':
        counts.alias++
        break
      case 'php':
        counts.php++
        break
    }
  }

  return counts
}

// Placeholder - would need actual UFW endpoint
export function getPlaceholderUfwIntrusions(): UfwIntrusions {
  return {
    blockedAttemptsLast24h: 0,
    topBlockedIPs: [],
  }
}

// Get updates from system info
export function getUpdatesFromSystemInfo(systemInfo?: SystemInfoResponse): Updates {
  return {
    systemPackages: (systemInfo?.security_updates ?? 0) + (systemInfo?.other_updates ?? 0),
    siteUpdates: {
      wordpressCore: 0,
      plugins: 0,
      themes: 0,
    },
    totalSiteUpdates: 0,
  }
}
