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
  status: 'running' | 'stopped' | 'unknown'
  version?: string
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

export function useServerMetrics(range: '5m' | '1h' | '24h' = '1h') {
  return useQuery({
    queryKey: ['server', 'metrics', range],
    queryFn: () => apiClient.get<SystemMetricsResponse>(`/api/v1/server/metrics?range=${range}`),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
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
  services: ServiceStatus[]
): Server {
  // Check if server is online by checking critical services
  const isOnline = services.some(
    s => (s.name === 'nginx' || s.name === 'php-fpm') && s.status === 'running'
  )

  // Calculate uptime (placeholder - would need additional endpoint)
  const uptime = 'Unknown'
  const lastBootTime = new Date().toISOString()

  return {
    hostname: 'webserver-01', // Would need additional endpoint
    status: isOnline ? 'online' : 'offline',
    uptime,
    lastBootTime,
    cpuUsage: Math.round(metrics.cpu.current),
    memoryUsage: Math.round(metrics.ram.current),
    diskUsage: Math.round(metrics.disk.current),
    loadAverage: [0.45, 0.62, 0.71], // Placeholder - would need additional endpoint
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

// Placeholder - would need actual updates endpoint
export function getPlaceholderUpdates(): Updates {
  return {
    systemPackages: 0,
    siteUpdates: {
      wordpressCore: 0,
      plugins: 0,
      themes: 0,
    },
    totalSiteUpdates: 0,
  }
}
