import { apiClient } from './api-client'
import type { Site, SiteType } from '../types'

// Backend site types (may differ from frontend types)
type BackendSiteType = 'wordpress' | 'php' | 'phpmysql' | 'html' | 'proxy' | 'mysql' | 'alias'

// Backend site model (simpler than frontend model)
interface BackendSite {
  name: string
  type: BackendSiteType
  ssl: boolean
  cache: string | null
  php_version: string | null
  is_disabled?: boolean
  database?: {
    name: string | null
    user: string | null
    password?: string | null
    host: string
  } | null
  wp_admin_url?: string | null
  wp_admin_user?: string | null
  wp_admin_password?: string | null
  alias_target?: string | null
  proxy_destination?: string | null
  hsts_enabled?: boolean
  ngxblocker_enabled?: boolean
}

// Site creation input
export interface CreateSiteInput {
  domain: string
  siteType: SiteType
  phpVersion: string
  enableSsl: boolean
  createDatabase: boolean
  wpCacheType?: 'default' | 'wpfc' | 'redis' | 'wpsc' | 'wprocket' | 'cache-enabler'
  wpMultisite?: boolean
  sslType?: 'single' | 'wildcard'
  dnsProvider?: 'cloudflare' | 'digitalocean' | 'linode' | 'aws' | 'google' | 'vultr' | 'hetzner'
  proxyDestination?: string
  aliasTarget?: string
}

// Site configuration input
export interface UpdateSiteConfigInput {
  phpVersion?: string
  nginxTemplate?: string
  cacheEnabled?: boolean
  sslEnabled?: boolean
  phpMemoryLimit?: string
  maxUploadSize?: string
  maxExecutionTime?: string
  hstsEnabled?: boolean
  ngxblockerEnabled?: boolean
}

// Transform backend site to frontend site
function transformSite(backendSite: BackendSite): Site {
  // Determine site status based on basic assumptions
  // In a real implementation, you might check if the site is actually online
  const status: 'online' | 'offline' = 'online'

  // Map backend site type to frontend site type
  // Backend returns "mysql" for PHP+MySQL sites, frontend uses "phpmysql"
  const siteTypeMap: Record<BackendSiteType, SiteType> = {
    'wordpress': 'wordpress',
    'php': 'php',
    'phpmysql': 'phpmysql',
    'html': 'html',
    'proxy': 'proxy',
    'mysql': 'phpmysql',  // Map backend "mysql" to frontend "phpmysql"
    'alias': 'alias',
  }

  const siteType = siteTypeMap[backendSite.type] || backendSite.type as SiteType

  // Map cache type to nginx template
  const nginxTemplate = backendSite.cache || 'default'

  // Create default monitoring stats
  const monitoring = {
    uptimePercent: 99.9,
    avgResponseTime: 200,
    diskUsage: 'Unknown',
    bandwidthMonth: 'Unknown',
    inodesUsed: 'Unknown',
  }

  // Create empty plugins list for WordPress sites
  const plugins = siteType === 'wordpress' ? [] : []

  // Handle database info from backend
  const database = backendSite.database?.name
    ? {
        name: backendSite.database.name,
        user: backendSite.database.user || '••••••••••••',
        password: backendSite.database.password || '••••••••••••',
        host: backendSite.database.host || 'localhost',
      }
    : (siteType === 'wordpress' || siteType === 'php' || siteType === 'phpmysql')
      ? {
          // Fallback to generated database info if backend doesn't provide it
          name: `${backendSite.name.replace(/[^a-z0-9]/gi, '_')}_db`,
          user: backendSite.name.replace(/[^a-z0-9]/gi, '_'),
          password: '••••••••••••',
          host: 'localhost',
        }
      : undefined

  // Calculate days to expiration
  const expiresDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  const today = new Date()
  const daysToExpiration = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Determine SSL status based on days to expiration
  let sslStatus: 'active' | 'expiring' | 'expired' = 'active'
  if (daysToExpiration < 0) {
    sslStatus = 'expired'
  } else if (daysToExpiration <= 30) {
    sslStatus = 'expiring'
  }

  return {
    id: backendSite.name, // Use domain as ID since backend uses domain
    domain: backendSite.name,
    siteType: siteType,
    status,
    phpVersion: backendSite.php_version,
    installPath: `/var/www/${backendSite.name}`,
    sslEnabled: backendSite.ssl,
    sslCertificate: backendSite.ssl ? {
      id: `${backendSite.name}-ssl`,
      provider: "Let's Encrypt",
      issuedDate: new Date().toISOString().split('T')[0],
      expiresDate: expiresDate.toISOString().split('T')[0],
      status: sslStatus,
      autoRenew: true,
      daysToExpiration,
      dnsApiProvider: undefined, // Will be populated by backend if available
    } : null,
    plugins,
    cacheEnabled: !!backendSite.cache,
    nginxTemplate,
    createdAt: new Date().toISOString().split('T')[0],
    lastBackup: null,
    monitoring,
    auditLog: [],
    database,
    // WordPress admin credentials if available
    wpAdminUrl: backendSite.wp_admin_url || undefined,
    wpAdminUser: backendSite.wp_admin_user || undefined,
    wpAdminPassword: backendSite.wp_admin_password || undefined,
    // Disabled state
    isDisabled: backendSite.is_disabled || false,
    // Alias and proxy targets
    aliasTarget: backendSite.alias_target || undefined,
    proxyDestination: backendSite.proxy_destination || undefined,
    // For backward compatibility, also set targetSite for alias sites
    targetSite: backendSite.alias_target || undefined,
    // HSTS and ngxblocker
    hstsEnabled: backendSite.hsts_enabled || false,
    ngxblockerEnabled: backendSite.ngxblocker_enabled || false,
  }
}

/**
 * Fetch all sites
 */
export async function fetchSites(): Promise<Site[]> {
  const response = await apiClient.get<BackendSite[]>('/api/v1/sites/')
  return response.map(transformSite)
}

/**
 * Fetch a single site by domain (used as ID)
 */
export async function fetchSite(domain: string): Promise<Site> {
  console.log('fetchSite called with domain:', domain)
  const response = await apiClient.get<BackendSite>(`/api/v1/sites/${domain}`)
  console.log('API response:', response)
  return transformSite(response)
}

/**
 * Create a new site
 */
export async function createSite(input: CreateSiteInput): Promise<Site> {
  // Map frontend types to backend types
  const backendType = input.siteType === 'phpmysql' ? 'mysql' : input.siteType

  // Map cache types
  const cacheMap: Record<string, string> = {
    'default': 'none',
    'wpfc': 'wpfc',
    'redis': 'wpredis',
    'wpsc': 'wpsc',
    'wprocket': 'wpfc', // Map wprocket to wpfc for backend
    'cache-enabler': 'wpfc',
  }

  const response = await apiClient.post<BackendSite>('/api/v1/sites/', {
    domain: input.domain,
    type: backendType,
    ssl: input.enableSsl,
    cache: input.wpCacheType ? cacheMap[input.wpCacheType] || 'none' : undefined,
    php_version: input.phpVersion,
    proxy_destination: input.proxyDestination,
    alias_target: input.aliasTarget,
  })

  return transformSite(response)
}

/**
 * Update site configuration
 */
export async function updateSiteConfig(domain: string, config: UpdateSiteConfigInput): Promise<Site> {
  // Map frontend config to backend update format
  const backendUpdate: {
    ssl?: boolean
    cache?: string
    php_version?: string
    hsts?: boolean
    ngxblocker?: boolean
  } = {}

  if (config.sslEnabled !== undefined) {
    backendUpdate.ssl = config.sslEnabled
  }
  if (config.cacheEnabled !== undefined) {
    backendUpdate.cache = config.cacheEnabled ? 'wpfc' : 'none'
  }
  if (config.phpVersion !== undefined) {
    backendUpdate.php_version = config.phpVersion
  }
  if (config.hstsEnabled !== undefined) {
    backendUpdate.hsts = config.hstsEnabled
  }
  if (config.ngxblockerEnabled !== undefined) {
    backendUpdate.ngxblocker = config.ngxblockerEnabled
  }

  const response = await apiClient.put<BackendSite>(`/api/v1/sites/${domain}`, backendUpdate)
  return transformSite(response)
}

/**
 * Clear site cache
 */
export async function clearSiteCache(domain: string): Promise<void> {
  // This might need a dedicated endpoint, for now we'll try to update cache to 'none' and back
  await apiClient.put(`/api/v1/sites/${domain}`, { cache: 'none' })
  await apiClient.put(`/api/v1/sites/${domain}`, { cache: 'wpfc' })
}

/**
 * Restart site services (nginx, php-fpm)
 * Note: This endpoint may not exist yet in the backend
 */
export async function restartSiteServices(domain: string): Promise<void> {
  // This endpoint might not be implemented yet
  // For now, just make the call and let the error be handled
  try {
    await apiClient.post(`/api/v1/sites/${domain}/restart`, {})
  } catch (error) {
    console.warn('Restart services endpoint not yet implemented:', error)
  }
}

/**
 * Visit a site - returns the URL
 */
export function getSiteUrl(site: Site): string {
  const protocol = site.sslEnabled ? 'https' : 'http'
  return `${protocol}://${site.domain}`
}

/**
 * Get WordPress admin URL for a site
 */
export function getWpAdminUrl(site: Site): string {
  const protocol = site.sslEnabled ? 'https' : 'http'
  return `${protocol}://${site.domain}/wp-admin`
}

/**
 * Get phpMyAdmin URL
 */
export function getPhpMyAdminUrl(serverPublicIp?: string): string {
  if (serverPublicIp) {
    return `http://${serverPublicIp}:22222/db/pma`
  }
  return '/phpmyadmin' // Fallback to relative path
}

/**
 * Fetch monitoring information for a site
 */
export async function fetchSiteMonitoring(domain: string): Promise<{
  diskUsage: string
  bandwidthMonth: string
  inodesUsed: string
}> {
  const response = await apiClient.get<{
    disk_usage: string
    bandwidth_month: string
    inodes_used: string
  }>(`/api/v1/sites/${domain}/monitoring`)

  return {
    diskUsage: response.disk_usage,
    bandwidthMonth: response.bandwidth_month,
    inodesUsed: response.inodes_used,
  }
}

/**
 * Delete a site
 */
export async function deleteSite(domain: string): Promise<void> {
  await apiClient.delete(`/api/v1/sites/${domain}?confirm=true`)
}

/**
 * Enable a site
 */
export async function enableSite(domain: string): Promise<void> {
  await apiClient.post(`/api/v1/sites/${domain}/enable`, {})
}

/**
 * Disable a site
 */
export async function disableSite(domain: string): Promise<void> {
  await apiClient.post(`/api/v1/sites/${domain}/disable`, {})
}

/**
 * Fetch nginx configuration for a site
 */
export async function fetchNginxConfig(domain: string): Promise<string> {
  const response = await apiClient.get<{ config: string }>(`/api/v1/sites/${domain}/nginx-config`)
  return response.config
}
