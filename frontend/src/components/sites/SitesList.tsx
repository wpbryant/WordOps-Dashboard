import { useState } from 'react'
import { ExternalLink, Plus, Search, Link2, Globe } from 'lucide-react'
import { FaWordpress, FaHtml5, FaPhp } from 'react-icons/fa'
import type { SitesListProps, SiteType, SiteStatus } from '../../types'
import { cn } from '../../lib/utils'

export function SitesList({
  sites,
  siteTypeFilter = 'all',
  statusFilter = 'all',
  searchQuery = '',
  onSiteClick,
  onVisitSite,
  onWpAdminLogin,
  onSiteTypeFilterChange,
  onStatusFilterChange,
  onSearchChange,
  onCreateSite,
}: SitesListProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery)

  // Filter sites based on current filters and search
  const filteredSites = sites.filter((site) => {
    const matchesType = siteTypeFilter === 'all' || site.siteType === siteTypeFilter
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter
    const matchesSearch =
      searchQuery === '' ||
      site.domain.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesStatus && matchesSearch
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Sites
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {filteredSites.length} {filteredSites.length === 1 ? 'site' : 'sites'}
              {filteredSites.length !== sites.length && ` of ${sites.length} total`}
            </p>
          </div>
          <button
            onClick={onCreateSite}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Site</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search domains..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value)
                onSearchChange?.(e.target.value)
              }}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Site Type Filter */}
          <select
            value={siteTypeFilter}
            onChange={(e) =>
              onSiteTypeFilterChange?.(e.target.value as SiteType | 'all')
            }
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="wordpress">WordPress</option>
            <option value="alias">Alias</option>
            <option value="html">HTML</option>
            <option value="php">PHP</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange?.(e.target.value as SiteStatus | 'all')
            }
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Sites List */}
      {filteredSites.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <Globe className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {sites.length === 0
                ? 'No sites yet. Create your first site to get started.'
                : 'No sites match your filters.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            <div className="col-span-4">Domain</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">PHP</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-2">SSL</div>
            <div className="col-span-2">WP Admin</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredSites.map((site) => {
              // Helper function to get site type icon
              const getSiteTypeIcon = () => {
                switch (site.siteType) {
                  case 'wordpress':
                    return FaWordpress
                  case 'html':
                    return FaHtml5
                  case 'phpmysql':
                  case 'php':
                    return FaPhp
                  case 'alias':
                    return Link2
                  default:
                    return null
                }
              }
              const SiteTypeIcon = getSiteTypeIcon()

              return (
                <div
                  key={site.id}
                  onClick={() => onSiteClick?.(site.id)}
                  className="sm:grid sm:grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer transition-colors group"
                >
                  {/* Domain */}
                  <div className="col-span-4 flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {site.domain}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onVisitSite?.(site.id)
                      }}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                      title="Visit site"
                    >
                      <ExternalLink className="w-4 h-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                    </button>
                  </div>

                  {/* Status - Desktop */}
                  <div className="hidden sm:flex sm:col-span-2 items-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                        site.isDisabled
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                          : site.status === 'online'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          site.isDisabled
                            ? 'bg-amber-500 dark:bg-amber-400'
                            : site.status === 'online'
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : 'bg-zinc-400 dark:bg-zinc-500'
                        )}
                      />
                      {site.isDisabled ? 'Disabled' : site.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* PHP Version - Desktop */}
                  <div className="hidden sm:flex sm:col-span-1 items-center">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                      {site.phpVersion || '—'}
                    </span>
                  </div>

                  {/* Type - Desktop (Icon only) */}
                  <div className="hidden sm:flex sm:col-span-1 items-center justify-center">
                    {SiteTypeIcon && (
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          site.siteType === 'wordpress' &&
                            'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
                          site.siteType === 'alias' &&
                            'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
                          site.siteType === 'html' &&
                            'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400',
                          (site.siteType === 'php' || site.siteType === 'phpmysql') &&
                            'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400'
                        )}
                      >
                        <SiteTypeIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* SSL Status - Desktop */}
                  <div className="hidden sm:flex sm:col-span-2 items-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium',
                        site.sslEnabled && site.sslCertificate
                          ? site.sslCertificate.status === 'active'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : site.sslCertificate.status === 'expiring'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-red-700 dark:text-red-400'
                          : 'text-zinc-400 dark:text-zinc-500'
                      )}
                    >
                      <span
                        className={cn(
                          'w-4 h-4 rounded-full border-2',
                          site.sslEnabled && site.sslCertificate
                            ? site.sslCertificate.status === 'active'
                              ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400'
                              : site.sslCertificate.status === 'expiring'
                                ? 'border-amber-500 bg-amber-500 dark:border-amber-400 dark:bg-amber-400'
                                : 'border-red-500 bg-red-500 dark:border-red-400 dark:bg-red-400'
                            : 'border-zinc-300 dark:border-zinc-600'
                        )}
                      />
                      {site.sslEnabled && site.sslCertificate
                        ? site.sslCertificate.status === 'active'
                          ? 'Active'
                          : site.sslCertificate.status === 'expiring'
                            ? 'Expiring'
                            : 'Expired'
                        : 'Not Active'}
                    </span>
                  </div>

                  {/* WP Admin - Desktop */}
                  <div className="hidden sm:flex sm:col-span-2 items-center">
                    {site.siteType === 'wordpress' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onWpAdminLogin?.(site.id)
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                      >
                        <FaWordpress className="w-3 h-3" />
                        WP Admin
                      </button>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600">—</span>
                    )}
                  </div>

                  {/* Mobile Info */}
                  <div className="flex sm:hidden col-span-full flex-col gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        site.isDisabled
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : site.status === 'online'
                            ? 'bg-emerald-500 dark:bg-emerald-400'
                            : 'bg-zinc-400 dark:bg-zinc-500'
                      )}
                      />
                      {site.isDisabled ? 'Disabled' : site.status === 'online' ? 'Online' : 'Offline'}
                      {' • '}
                      {site.phpVersion || 'N/A'}
                      {' • '}
                      {site.siteType === 'phpmysql' ? 'PHP+MySQL' : site.siteType.charAt(0).toUpperCase() + site.siteType.slice(1)}
                      {' • '}
                      {site.sslEnabled && site.sslCertificate
                        ? site.sslCertificate.status === 'active'
                          ? 'SSL Active'
                          : site.sslCertificate.status === 'expiring'
                            ? 'SSL Expiring'
                            : 'SSL Expired'
                        : 'SSL Not Active'}
                    </div>
                    <div className="flex items-center gap-2">
                      {site.siteType === 'wordpress' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onWpAdminLogin?.(site.id)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <FaWordpress className="w-3 h-3" />
                          WP Admin
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onVisitSite?.(site.id)
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Visit
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
