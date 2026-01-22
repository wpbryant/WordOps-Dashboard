import type { Server, SiteCounts, UfwIntrusions, Updates } from './types'

export const sampleServer: Server = {
  hostname: 'webserver-01',
  status: 'online',
  uptime: '45 days, 12 hours, 34 minutes',
  lastBootTime: '2024-12-07T06:22:00Z',
  cpuUsage: 23,
  memoryUsage: 67,
  diskUsage: 54,
  loadAverage: [0.45, 0.62, 0.71],
}

export const sampleSiteCounts: SiteCounts = {
  wordpress: 8,
  html: 3,
  alias: 2,
  php: 4,
  total: 17,
}

export const sampleUfwIntrusions: UfwIntrusions = {
  blockedAttemptsLast24h: 127,
  topBlockedIPs: [
    {
      ip: '192.168.1.100',
      attempts: 34,
      lastAttempt: '2025-01-21T09:45:22Z',
      ports: [22, 80, 443],
    },
    {
      ip: '10.0.0.55',
      attempts: 28,
      lastAttempt: '2025-01-21T08:12:05Z',
      ports: [22, 80],
    },
    {
      ip: '172.16.0.200',
      attempts: 19,
      lastAttempt: '2025-01-21T07:33:41Z',
      ports: [443],
    },
    {
      ip: '203.0.113.45',
      attempts: 15,
      lastAttempt: '2025-01-21T06:58:17Z',
      ports: [22],
    },
    {
      ip: '198.51.100.89',
      attempts: 12,
      lastAttempt: '2025-01-21T05:21:33Z',
      ports: [80, 443],
    },
  ],
}

export const sampleUpdates: Updates = {
  systemPackages: 5,
  siteUpdates: {
    wordpressCore: 2,
    plugins: 12,
    themes: 3,
  },
  totalSiteUpdates: 17,
}
