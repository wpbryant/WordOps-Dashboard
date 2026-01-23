import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SiteDetails as SiteDetailsComponent } from '../components/sites'
import { fetchSite, getSiteUrl, getWpAdminUrl, getPhpMyAdminUrl, clearSiteCache, restartSiteServices, updateSiteConfig } from '../lib/sites-api'

export function SiteDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'monitoring' | 'audit'>('overview')

  // Fetch site details - id is actually the domain
  const { data: site, isLoading, error } = useQuery({
    queryKey: ['sites', id],
    queryFn: () => {
      console.log('Fetching site details for domain:', id)
      return fetchSite(id!) // id is the domain
    },
    enabled: !!id,
    retry: 1,
  })

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => clearSiteCache(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', id] })
    },
  })

  // Restart services mutation
  const restartServicesMutation = useMutation({
    mutationFn: () => restartSiteServices(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', id] })
    },
  })

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (config: Record<string, unknown>) => updateSiteConfig(id!, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', id] })
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
        {error && (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Domain: {id}
          </div>
        )}
        <button
          onClick={() => navigate('/sites')}
          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          Back to Sites
        </button>
      </div>
    )
  }

  return (
    <SiteDetailsComponent
      site={site}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab)}
      onVisitSite={handleVisitSite}
      onOpenPhpMyAdmin={handleOpenPhpMyAdmin}
      onWpAdminLogin={handleWpAdminLogin}
      onEditConfig={handleEditConfig}
      onClearCache={handleClearCache}
      onRestartServices={handleRestartServices}
    />
  )
}
