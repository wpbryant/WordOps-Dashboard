import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SitesList, CreateSiteWizard } from '../components/sites'
import { fetchSites, createSite, getSiteUrl, getWpAdminUrl } from '../lib/sites-api'
import type { SiteType, SiteStatus } from '../types'

export function Sites() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showWizard, setShowWizard] = useState(false)
  const [siteTypeFilter, setSiteTypeFilter] = useState<SiteType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<SiteStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch sites
  const { data: sites = [], isLoading, error } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites,
  })

  // Create site mutation with error handling
  const createSiteMutation = useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      setShowWizard(false)
    },
    onError: (error) => {
      console.error('Failed to create site:', error)
      // Parse error message for better user feedback
      const errorMsg = error.message || 'Unknown error'
      let userMessage = 'Failed to create site'

      if (errorMsg.includes('already exists')) {
        userMessage = 'A site with this domain already exists'
      } else if (errorMsg.includes('invalid domain')) {
        userMessage = 'Invalid domain name'
      } else if (errorMsg.includes('dns')) {
        userMessage = 'DNS configuration failed'
      } else if (errorMsg.includes('ssl') || errorMsg.includes('certificate')) {
        userMessage = 'SSL certificate creation failed'
      } else if (errorMsg.includes('database')) {
        userMessage = 'Database creation failed'
      } else {
        // Show full error for unknown errors
        userMessage = `Failed to create site: ${errorMsg}`
      }

      alert(userMessage)
    },
  })

  const handleSiteClick = (siteId: string) => {
    navigate(`/sites/${siteId}`)
  }

  const handleVisitSite = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId)
    if (site) {
      window.open(getSiteUrl(site), '_blank')
    }
  }

  const handleWpAdminLogin = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId)
    if (site && site.siteType === 'wordpress') {
      window.open(getWpAdminUrl(site), '_blank')
    }
  }

  const handleCreateSite = () => {
    setShowWizard(true)
  }

  const handleWizardSubmit = async (data: {
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
  }) => {
    console.log('Creating site with data:', data)

    try {
      await createSiteMutation.mutateAsync(data)
      console.log('Site created successfully')
    } catch (error) {
      console.error('Error creating site:', error)
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500 dark:text-zinc-400">Loading sites...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600 dark:text-red-400">Error loading sites</div>
      </div>
    )
  }

  // Show wizard when active
  if (showWizard) {
    return (
      <CreateSiteWizard
        onCreateSite={handleWizardSubmit}
        onCancel={() => setShowWizard(false)}
        isSubmitting={createSiteMutation.isPending}
      />
    )
  }

  return (
    <SitesList
      sites={sites}
      siteTypeFilter={siteTypeFilter}
      statusFilter={statusFilter}
      searchQuery={searchQuery}
      onSiteClick={handleSiteClick}
      onVisitSite={handleVisitSite}
      onWpAdminLogin={handleWpAdminLogin}
      onSiteTypeFilterChange={setSiteTypeFilter}
      onStatusFilterChange={setStatusFilter}
      onSearchChange={setSearchQuery}
      onCreateSite={handleCreateSite}
    />
  )
}
