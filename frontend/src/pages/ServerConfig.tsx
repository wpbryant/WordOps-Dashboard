import { useState } from 'react'
import { OverviewTab } from '../components/server-config/OverviewTab'

type TabKey = 'overview' | 'stack-services'

const tabs = [
  { key: 'overview' as const, label: 'Overview' },
  { key: 'stack-services' as const, label: 'Stack Services' },
]

export function ServerConfig() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Page Header */}
      <div className="px-6 py-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Server Configuration</h1>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <nav className="flex gap-1 px-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto px-6">
        <div className="max-w-6xl mx-auto py-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'stack-services' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">Stack Services tab coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
