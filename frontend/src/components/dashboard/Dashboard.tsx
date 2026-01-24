import type { DashboardProps } from './types'
import { ServerStatusTile } from './ServerStatusTile'
import { SiteCountTile } from './SiteCountTile'
import { UfwTile } from './UfwTile'
import { UpdatesTile } from './UpdatesTile'
import { RefreshCw } from 'lucide-react'

export function Dashboard({
  server,
  siteCounts,
  ufwIntrusions,
  updates,
  onServerClick,
  onWordPressSitesClick,
  onHtmlSitesClick,
  onAliasSitesClick,
  onPhpSitesClick,
  onPhpMysqlSitesClick,
  onProxySitesClick,
  onUfwClick,
  onUpdatesClick,
  onViewDetails,
  onRefresh,
}: DashboardProps) {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 font-sans">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Server overview and metrics
          </p>
        </div>
        <button
          onClick={() => onRefresh?.()}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Tiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {/* Server Status */}
        <ServerStatusTile
          server={server}
          onClick={() => onServerClick?.()}
          onViewDetails={() => onViewDetails?.('server')}
        />

        {/* Updates */}
        <UpdatesTile
          updates={updates}
          onClick={() => onUpdatesClick?.()}
          onViewDetails={() => onViewDetails?.('updates')}
        />

        {/* Site Counts */}
        <SiteCountTile
          title="WordPress Sites"
          count={siteCounts.wordpress}
          icon="wordpress"
          onClick={() => onWordPressSitesClick?.()}
          onViewDetails={() => onViewDetails?.('wordpress')}
        />
        <SiteCountTile
          title="HTML Sites"
          count={siteCounts.html}
          icon="html"
          onClick={() => onHtmlSitesClick?.()}
          onViewDetails={() => onViewDetails?.('html')}
        />
        <SiteCountTile
          title="Alias Sites"
          count={siteCounts.alias}
          icon="alias"
          onClick={() => onAliasSitesClick?.()}
          onViewDetails={() => onViewDetails?.('alias')}
        />
        <SiteCountTile
          title="PHP Sites"
          count={siteCounts.php}
          icon="php"
          onClick={() => onPhpSitesClick?.()}
          onViewDetails={() => onViewDetails?.('php')}
        />
        <SiteCountTile
          title="PHP+MySQL Sites"
          count={siteCounts.phpmysql}
          icon="phpmysql"
          onClick={() => onPhpMysqlSitesClick?.()}
          onViewDetails={() => onViewDetails?.('phpmysql')}
        />
        <SiteCountTile
          title="Proxy Sites"
          count={siteCounts.proxy}
          icon="proxy"
          onClick={() => onProxySitesClick?.()}
          onViewDetails={() => onViewDetails?.('proxy')}
        />

        {/* UFW Intrusions */}
        <UfwTile
          intrusions={ufwIntrusions}
          onClick={() => onUfwClick?.()}
          onViewDetails={() => onViewDetails?.('ufw')}
        />
      </div>

        {/* Footer Summary */}
        <div className="mt-8 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {siteCounts.total} sites
            </span>
            {' '}deployed on{' '}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {server.hostname}
            </span>
            {' '}• Last updated just now
          </p>
        </div>
      </div>
    </div>
  )
}
