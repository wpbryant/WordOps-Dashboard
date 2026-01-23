import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SiteDetails as SiteDetailsComponent } from '../components/sites'
import { fetchSite, getSiteUrl, getWpAdminUrl, getPhpMyAdminUrl, clearSiteCache, restartSiteServices, updateSiteConfig, fetchSiteMonitoring, deleteSite, enableSite, disableSite, fetchNginxConfig } from '../lib/sites-api'
import type { Site } from '../types'

export function SiteDetails() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'monitoring' | 'audit'>('overview')

  // Extract domain from pathname manually since we're not using React Router's Routes
  // The URL format is /sites/{domain}
  const domain = window.location.pathname.split('/sites/')[1]

  // Debug: log the domain from URL
  console.log('SiteDetails page loaded, domain from URL:', domain, 'type:', typeof domain, 'truthy:', !!domain)

  // Fetch site details - domain is extracted from pathname
  // Use a more specific query key to avoid conflicts with list cache
  const { data: site, isLoading, error } = useQuery({
    queryKey: ['site-detail', domain], // Changed from ['sites', domain]
    queryFn: () => {
      console.log('Fetching site details for domain:', domain)
      return fetchSite(domain) // domain is extracted from pathname
    },
    enabled: !!domain,
    retry: 1,
    staleTime: 0, // Always fetch fresh data, don't use stale cache
  })

  // Fetch monitoring data
  const { data: monitoringData } = useQuery({
    queryKey: ['site-monitoring', domain],
    queryFn: () => fetchSiteMonitoring(domain),
    enabled: !!domain,
    retry: 1,
    staleTime: 60000, // Cache for 1 minute
  })

  // Debug: log query state
  console.log('Query state:', { isLoading, error, site })

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => clearSiteCache(domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-detail', domain] })
    },
  })

  // Restart services mutation
  const restartServicesMutation = useMutation({
    mutationFn: () => restartSiteServices(domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-detail', domain] })
    },
  })

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (config: Record<string, unknown>) => updateSiteConfig(domain, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-detail', domain] })
    },
  })

  // Delete site mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteSite(domain),
    onSuccess: () => {
      navigate('/sites')
    },
  })

  // Enable site mutation
  const enableMutation = useMutation({
    mutationFn: () => enableSite(domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-detail', domain] })
    },
  })

  // Disable site mutation
  const disableMutation = useMutation({
    mutationFn: () => disableSite(domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-detail', domain] })
    },
  })

  const handleVisitSite = () => {
    if (site) {
      window.open(getSiteUrl(site), '_blank')
    }
  }

  const handleOpenPhpMyAdmin = () => {
    window.open(getPhpMyAdminUrl(), '_blank')
  }

  const handleWpAdminLogin = () => {
    if (site) {
      window.open(getWpAdminUrl(site), '_blank')
    }
  }

  const handleEditConfig = (config: Record<string, unknown>) => {
    updateConfigMutation.mutate(config)
  }

  const handleClearCache = () => {
    clearCacheMutation.mutate()
  }

  const handleRestartServices = () => {
    restartServicesMutation.mutate()
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      deleteMutation.mutate()
    }
  }

  const handleEnable = () => {
    enableMutation.mutate()
  }

  const handleDisable = () => {
    if (window.confirm('Are you sure you want to disable this site?')) {
      disableMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500 dark:text-zinc-400">Loading site details...</div>
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-red-600 dark:text-red-400">
          {error ? `Error: ${error.message}` : 'Site not found'}
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Domain: {domain}
        </div>
        <button
          onClick={() => navigate('/sites')}
          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          Back to Sites
        </button>
      </div>
    )
  }

  // Merge monitoring data with site data
  const siteWithMonitoring: Site = monitoringData
    ? {
        ...site,
        monitoring: {
          uptimePercent: site.monitoring.uptimePercent,
          avgResponseTime: site.monitoring.avgResponseTime,
          diskUsage: monitoringData.diskUsage,
          bandwidthMonth: monitoringData.bandwidthMonth,
          inodesUsed: monitoringData.inodesUsed,
        },
      }
    : site

  return (
    <SiteDetailsComponent
      site={siteWithMonitoring}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab)}
      onVisitSite={handleVisitSite}
      onOpenPhpMyAdmin={handleOpenPhpMyAdmin}
      onWpAdminLogin={handleWpAdminLogin}
      onEditConfig={handleEditConfig}
      onClearCache={handleClearCache}
      onRestartServices={handleRestartServices}
      onDelete={handleDelete}
      onEnable={handleEnable}
      onDisable={handleDisable}
    />
  )
}
