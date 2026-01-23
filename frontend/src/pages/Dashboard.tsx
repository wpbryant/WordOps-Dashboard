import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dashboard as DashboardComponent, DetailsModal } from '../components/dashboard'
import type { Server, SiteCounts, UfwIntrusions, Updates } from '../components/dashboard/types'
import {
  useServerMetrics,
  useServerServices,
  useServerInfo,
  useSites,
  transformServerMetrics,
  transformSiteCounts,
  getPlaceholderUfwIntrusions,
  getUpdatesFromSystemInfo,
} from '../lib/dashboard-api'
import { Activity } from 'lucide-react'

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        </div>

        {/* Tiles Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5"
            >
              <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse mb-3" />
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-6 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer Skeleton */}
        <div className="mt-8 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}

// Error state component
function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <Activity className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Failed to load dashboard
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">{error.message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

// Empty state for no sites
function DashboardEmpty() {
  const navigate = useNavigate()

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          No sites deployed yet
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Get started by deploying your first site. You can create WordPress, HTML, PHP, or alias sites.
        </p>
        <button
          onClick={() => navigate('/sites')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Sites
        </button>
      </div>
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const [detailsTile, setDetailsTile] = useState<string | null>(null)

  // Fetch data from API
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useServerMetrics()
  const { data: services, isLoading: servicesLoading, error: servicesError, refetch: refetchServices } = useServerServices()
  const { data: systemInfo, isLoading: systemInfoLoading, error: systemInfoError, refetch: refetchSystemInfo } = useServerInfo()
  const { data: sites, isLoading: sitesLoading, error: sitesError, refetch: refetchSites } = useSites()

  // Transform data to UI types
  let server: Server | undefined
  let siteCounts: SiteCounts | undefined
  let ufwIntrusions: UfwIntrusions = getPlaceholderUfwIntrusions()
  let updates: Updates = getUpdatesFromSystemInfo(systemInfo)

  if (metrics && services) {
    server = transformServerMetrics(metrics, services, systemInfo)
  }

  if (sites) {
    siteCounts = transformSiteCounts(sites)
  }

  // Loading state
  const isLoading = metricsLoading || servicesLoading || sitesLoading || systemInfoLoading

  // Error state
  const hasError = metricsError || servicesError || sitesError || systemInfoError

  // Empty state - no sites
  const isEmpty = siteCounts && siteCounts.total === 0

  const handleRetry = () => {
    refetchMetrics()
    refetchServices()
    refetchSites()
    refetchSystemInfo()
  }

  const handleServerClick = () => {
    navigate('/server-config')
  }

  const handleWordPressSitesClick = () => {
    navigate('/sites?type=wordpress')
  }

  const handleHtmlSitesClick = () => {
    navigate('/sites?type=html')
  }

  const handleAliasSitesClick = () => {
    navigate('/sites?type=proxy')
  }

  const handlePhpSitesClick = () => {
    navigate('/sites?type=php')
  }

  const handleUfwClick = () => {
    navigate('/server-config#ufw')
  }

  const handleUpdatesClick = () => {
    navigate('/server-config#updates')
  }

  const handleViewDetails = (tile: string) => {
    setDetailsTile(tile)
  }

  const handleCloseDetails = () => {
    setDetailsTile(null)
  }

  const handleRefresh = () => {
    refetchMetrics()
    refetchServices()
    refetchSites()
    refetchSystemInfo()
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (hasError) {
    return <DashboardError error={metricsError || servicesError || sitesError || new Error('Unknown error')} onRetry={handleRetry} />
  }

  if (isEmpty) {
    return <DashboardEmpty />
  }

  if (!server || !siteCounts) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">No data available</p>
      </div>
    )
  }

  return (
    <>
      <DashboardComponent
        server={server}
        siteCounts={siteCounts}
        ufwIntrusions={ufwIntrusions}
        updates={updates}
        onServerClick={handleServerClick}
        onWordPressSitesClick={handleWordPressSitesClick}
        onHtmlSitesClick={handleHtmlSitesClick}
        onAliasSitesClick={handleAliasSitesClick}
        onPhpSitesClick={handlePhpSitesClick}
        onUfwClick={handleUfwClick}
        onUpdatesClick={handleUpdatesClick}
        onViewDetails={handleViewDetails}
        onRefresh={handleRefresh}
      />
      {detailsTile && (
        <DetailsModal
          isOpen={!!detailsTile}
          tile={detailsTile}
          server={server}
          siteCounts={siteCounts}
          ufwIntrusions={ufwIntrusions}
          updates={updates}
          onClose={handleCloseDetails}
        />
      )}
    </>
  )
}
