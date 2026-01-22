// =============================================================================
// Data Types
// =============================================================================

export type ServerStatus = 'online' | 'offline' | 'error'

export interface Server {
  hostname: string
  status: ServerStatus
  uptime: string
  lastBootTime: string
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  loadAverage: number[]
}

export interface SiteCounts {
  wordpress: number
  html: number
  alias: number
  php: number
  total: number
}

export interface BlockedIP {
  ip: string
  attempts: number
  lastAttempt: string
  ports: number[]
}

export interface UfwIntrusions {
  blockedAttemptsLast24h: number
  topBlockedIPs: BlockedIP[]
}

export interface SiteUpdates {
  wordpressCore: number
  plugins: number
  themes: number
}

export interface Updates {
  systemPackages: number
  siteUpdates: SiteUpdates
  totalSiteUpdates: number
}

// =============================================================================
// Component Props
// =============================================================================

export interface DashboardProps {
  /** The server status and metrics */
  server: Server
  /** Site counts broken down by type */
  siteCounts: SiteCounts
  /** UFW firewall intrusion data */
  ufwIntrusions: UfwIntrusions
  /** Available system and site updates */
  updates: Updates
  /** Called when user clicks the Server Status tile */
  onServerClick?: () => void
  /** Called when user clicks the WordPress sites tile */
  onWordPressSitesClick?: () => void
  /** Called when user clicks the HTML sites tile */
  onHtmlSitesClick?: () => void
  /** Called when user clicks the Alias sites tile */
  onAliasSitesClick?: () => void
  /** Called when user clicks the PHP sites tile */
  onPhpSitesClick?: () => void
  /** Called when user clicks the UFW Intrusions tile */
  onUfwClick?: () => void
  /** Called when user clicks the Updates tile */
  onUpdatesClick?: () => void
  /** Called when user wants to view details for a specific tile */
  onViewDetails?: (tile: string) => void
  /** Called when user manually refreshes the dashboard */
  onRefresh?: () => void
}
