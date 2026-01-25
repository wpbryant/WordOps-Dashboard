// =============================================================================
// Data Model Types
// =============================================================================

// -----------------------------------------------------------------------------
// Server
// -----------------------------------------------------------------------------

export interface Server {
  hostname: string
  status: 'online' | 'offline' | 'error'
  uptime: string
  lastBootTime: string
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  loadAverage: number[]
}

// -----------------------------------------------------------------------------
// Site
// -----------------------------------------------------------------------------

export type SiteType = 'wordpress' | 'alias' | 'html' | 'php' | 'proxy' | 'phpmysql'
export type SiteStatus = 'online' | 'offline'

export interface Plugin {
  id: string
  name: string
  version: string
  updateAvailable: boolean
}

export interface SslCertificate {
  id: string
  provider: string
  issuedDate: string
  expiresDate: string
  status: 'active' | 'expiring' | 'expired'
  autoRenew: boolean
  daysToExpiration?: number
  dnsApiProvider?: string
}

export interface MonitoringStats {
  uptimePercent: number
  avgResponseTime: number
  diskUsage: string
  bandwidthMonth: string
  inodesUsed: string
}

export interface AuditLogEntry {
  id: string
  action: string
  user: string
  timestamp: string
}

export interface DatabaseInfo {
  name: string
  user: string
  password: string
  host: string
}

export interface Site {
  id: string
  domain: string
  siteType: SiteType
  status: SiteStatus
  phpVersion: string | null
  installPath: string
  sslEnabled: boolean
  sslCertificate: SslCertificate | null
  plugins: Plugin[]
  cacheEnabled: boolean
  nginxTemplate: string
  createdAt: string
  lastBackup: string | null
  monitoring: MonitoringStats
  auditLog: AuditLogEntry[]
  targetSite?: string  // For alias sites (deprecated, use aliasTarget)
  aliasTarget?: string  // For alias sites: the target domain
  proxyDestination?: string  // For proxy sites: the destination URL
  database?: DatabaseInfo  // For sites with databases
  wpAdminUrl?: string  // WordPress admin URL
  wpAdminUser?: string  // WordPress admin username
  wpAdminPassword?: string  // WordPress admin password
  isDisabled?: boolean  // Whether the site is disabled
  nginxConfig?: string | null  // Nginx configuration content
  hstsEnabled?: boolean  // Whether HSTS is enabled
  ngxblockerEnabled?: boolean  // Whether Ultimate Nginx Bad Blocker is enabled
}

// Sites component props
export interface SitesListProps {
  sites: Site[]
  siteTypeFilter?: SiteType | 'all'
  statusFilter?: SiteStatus | 'all'
  searchQuery?: string
  onSiteClick?: (siteId: string) => void
  onVisitSite?: (siteId: string) => void
  onWpAdminLogin?: (siteId: string) => void
  onSiteTypeFilterChange?: (type: SiteType | 'all') => void
  onStatusFilterChange?: (status: SiteStatus | 'all') => void
  onSearchChange?: (query: string) => void
  onCreateSite?: () => void
}

export interface SiteDetailsProps {
  site: Site
  activeTab: 'overview' | 'configuration' | 'monitoring' | 'audit' | 'wordpress'
  onTabChange?: (tab: 'overview' | 'configuration' | 'monitoring' | 'audit' | 'wordpress') => void
  onVisitSite?: () => void
  onOpenPhpMyAdmin?: () => void
  onWpAdminLogin?: () => void
  onDelete?: () => void
  onEnable?: () => void
  onDisable?: () => void
  serverPublicIp?: string
}

export interface CreateSiteWizardProps {
  onCreateSite?: (siteData: {
    domain: string
    siteType: SiteType
    phpVersion: string
    enableSsl: boolean
    createDatabase: boolean
    wpCacheType?: 'default' | 'wpfc' | 'redis' | 'wpsc' | 'wprocket' | 'cache-enabler'
    wpMultisite?: boolean
    sslType?: 'single' | 'wildcard'
    dnsProvider?: 'cloudflare' | 'digitalocean' | 'linode' | 'aws' | 'google' | 'vultr' | 'hetzner'
    hstsEnabled?: boolean
    proxyDestination?: string
    aliasTarget?: string
  }) => void
  onCancel?: () => void
  isSubmitting?: boolean
}

// -----------------------------------------------------------------------------
// Server Config
// -----------------------------------------------------------------------------

export interface StackService {
  id: string
  name: string
  displayName: string
  status: 'running' | 'stopped' | 'restarting' | 'error'
  version: string
  enabled: boolean
  memoryUsage: string
  connections?: number
  children?: number
  maxRequests?: number
  connectedClients?: number
  maxMemory?: string
  maxConnections?: number
  workerProcesses?: number
  workerConnections?: number
  configFile: string
}

export interface SystemPackage {
  id: string
  name: string
  installedVersion: string
  availableVersion: string | null
  updateType: 'security' | 'normal' | null
  isSecurityUpdate: boolean
}

export interface SSHConfig {
  port: number
  permitRootLogin: boolean
  passwordAuthentication: boolean
  allowedUsers: string[]
  maxAuthTries: number
}

export interface Fail2banJail {
  name: string
  enabled: boolean
  banned: number
}

export interface Fail2banConfig {
  enabled: boolean
  bantime: number
  findtime: number
  maxRetry: number
  destemail: string
  jails: Fail2banJail[]
}

export interface DNSApiCredentials {
  provider: 'cloudflare' | 'digitalocean' | 'linode' | 'godaddy' | 'none'
  email: string
  apiKey: string
  zoneId: string
}

export interface SecurityConfig {
  ssh: SSHConfig
  fail2ban: Fail2banConfig
  dnsApiCredentials: DNSApiCredentials
}

export interface FirewallRule {
  id: string
  action: 'allow' | 'deny' | 'limit' | 'reject'
  direction: 'in' | 'out' | 'routed'
  from: string
  to: string
  port: string
  protocol: 'tcp' | 'udp' | 'Any' | 'ipv6' | 'icmp'
  enabled: boolean
}

export type LogSource = 'nginx' | 'php' | 'mysql' | 'system' | 'fail2ban' | 'ufw'
export type LogSeverity = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface ServerLog {
  id: string
  source: LogSource
  timestamp: string
  severity: LogSeverity
  message: string
  clientIp?: string
}

export type AlertMetric = 'cpu' | 'memory' | 'disk' | 'mysql_connections' | 'network' | 'custom'
export type AlertOperator = 'greater' | 'less' | 'equal'

export interface MonitoringAlert {
  id: string
  name: string
  metric: AlertMetric
  threshold: number
  operator: AlertOperator
  duration: string
  enabled: boolean
  notificationEmail: string
}

// -----------------------------------------------------------------------------
// Server Config - Overview
// -----------------------------------------------------------------------------

export interface ServerOverviewInfo {
  hostname: string
  public_ip: string
  os_version: string
  kernel_version: string
  uptime_seconds: number
  wordops_version: string | null
  security_updates: number
  other_updates: number
  last_backup_date: string | null
}

export interface PackageUpdateRequest {
  update_type: 'all' | 'security'
}

export interface PackageUpdateResponse {
  status: 'running' | 'completed' | 'failed'
  message: string
  updated_count: number
}

// -----------------------------------------------------------------------------
// Server Config - Stack Services
// -----------------------------------------------------------------------------

export interface StackServiceInfo {
  name: string
  display_name: string
  status: 'running' | 'stopped' | 'restarting' | 'error'
  version: string | null
  memory_usage: number | null
  memory_display: string | null
  uptime_seconds: number | null
  config_file: string
  php_fpm_connections: number | null
  php_fpm_max_children: number | null
  mysql_connections: number | null
  redis_connected_clients: number | null
}
