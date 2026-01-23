import { useState } from 'react'
import {
  Globe,
  Server,
  Lock,
  Database,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Shield,
  Zap,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { FaWordpress } from 'react-icons/fa'
import type { CreateSiteWizardProps, SiteType } from '../../types'
import { cn } from '../../lib/utils'
import { useServerInfo } from '../../lib/dashboard-api'

type Step = 1 | 2 | 3 | 4 | 5 | 6

type WpCacheType = 'default' | 'wpfc' | 'redis' | 'wpsc' | 'wprocket' | 'cache-enabler'
type DnsProvider = 'cloudflare' | 'digitalocean' | 'linode' | 'aws' | 'google' | 'vultr' | 'hetzner'

interface WizardState {
  domain: string
  siteType: SiteType | null
  phpVersion: string
  enableSsl: boolean
  sslType: 'single' | 'wildcard'
  dnsProvider: DnsProvider | null
  hstsEnabled: boolean
  createDatabase: boolean
  databaseName: string
  databaseUser: string
  wpCacheType: WpCacheType
  wpMultisite: boolean
  proxyDestination: string  // For proxy sites - the destination URL/address
  aliasTarget: string  // For alias sites - the target domain
}

const siteTypeOptions: { type: SiteType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'wordpress',
    label: 'WordPress',
    description: 'Full WordPress installation with optimized nginx configuration',
    icon: <FaWordpress className="w-8 h-8" />
  },
  {
    type: 'phpmysql',
    label: 'PHP + MySQL',
    description: 'PHP application with MySQL database support',
    icon: <Server className="w-8 h-8" />
  },
  {
    type: 'php',
    label: 'PHP',
    description: 'Custom PHP application with PHP-FPM',
    icon: <Server className="w-8 h-8" />
  },
  {
    type: 'html',
    label: 'HTML',
    description: 'Static HTML site with nginx',
    icon: <Globe className="w-8 h-8" />
  },
  {
    type: 'proxy',
    label: 'Proxy',
    description: 'Reverse proxy to an external service or application',
    icon: <ExternalLink className="w-8 h-8" />
  },
  {
    type: 'alias',
    label: 'Alias',
    description: 'Domain alias pointing to an existing site',
    icon: <Globe className="w-8 h-8" />
  }
]

const phpVersions = ['8.3', '8.2', '8.1', '8.0', '7.4']

const wpCacheTypes: { value: WpCacheType; label: string; description: string }[] = [
  { value: 'default', label: 'Standard', description: 'Default WordPress caching' },
  { value: 'wpfc', label: 'Nginx FastCGI Cache', description: 'WordPress + nginx fastcgi_cache' },
  { value: 'redis', label: 'Redis Cache', description: 'WordPress + Redis object cache' },
  { value: 'wpsc', label: 'WP-Super-Cache', description: 'WordPress with WP-Super-Cache plugin' },
  { value: 'wprocket', label: 'WP-Rocket', description: 'WordPress with WP-Rocket caching' },
  { value: 'cache-enabler', label: 'Cache Enabler', description: 'WordPress with Cache Enabler plugin' }
]

const dnsProviders: { value: DnsProvider; label: string }[] = [
  { value: 'cloudflare', label: 'Cloudflare' },
  { value: 'digitalocean', label: 'DigitalOcean' },
  { value: 'linode', label: 'Linode' },
  { value: 'aws', label: 'AWS Route 53' },
  { value: 'google', label: 'Google Cloud DNS' },
  { value: 'vultr', label: 'Vultr' },
  { value: 'hetzner', label: 'Hetzner' }
]

export function CreateSiteWizard({ onCreateSite, onCancel, isSubmitting = false }: CreateSiteWizardProps) {
  // Fetch server info to get public IP
  const { data: serverInfo } = useServerInfo()

  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [wizardState, setWizardState] = useState<WizardState>({
    domain: '',
    siteType: null,
    phpVersion: '8.2',
    enableSsl: true,
    sslType: 'single',
    dnsProvider: null,
    hstsEnabled: false,
    createDatabase: true,
    databaseName: '',
    databaseUser: '',
    wpCacheType: 'default',
    wpMultisite: false,
    proxyDestination: '',
    aliasTarget: ''
  })

  const updateState = (updates: Partial<WizardState>) => {
    setWizardState((prev) => {
      const newState = { ...prev, ...updates }
      // Auto-generate database name/user from domain
      if ('domain' in updates && updates.domain) {
        const dbPrefix = updates.domain.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        newState.databaseName = `${dbPrefix}_db`
        newState.databaseUser = dbPrefix
      }
      // Reset SSL type to single if SSL is disabled
      if ('enableSsl' in updates && !updates.enableSsl) {
        newState.sslType = 'single'
        newState.dnsProvider = null
      }
      return newState
    })
  }

  const canProceed = () => {
    switch (logicalStep) {
      case 'domain':
        return (
          wizardState.domain.trim() !== '' &&
          /^[a-zA-Z0-9][a-zA-Z0-9-._]*\.[a-zA-Z]{2,}$/.test(wizardState.domain)
        )
      case 'siteType':
        return wizardState.siteType !== null
      case 'database':
        return true // Database is optional
      case 'php':
        return true // PHP selection can be skipped for some types
      case 'proxy':
        return wizardState.proxyDestination.trim() !== '' // Proxy destination is required
      case 'alias':
        return wizardState.aliasTarget.trim() !== '' // Alias target is required
      case 'ssl':
        return true // SSL is optional
      case 'review':
        return true // Final review - always can proceed
      default:
        return false
    }
  }

  const handleNext = () => {
    // If on the review step, submit the form
    if (logicalStep === 'review') {
      console.log('Submitting site creation with data:', {
        domain: wizardState.domain,
        siteType: wizardState.siteType,
        phpVersion: wizardState.phpVersion,
        enableSsl: wizardState.enableSsl,
        createDatabase: wizardState.createDatabase,
        proxyDestination: wizardState.proxyDestination,
        aliasTarget: wizardState.aliasTarget,
      })
      onCreateSite?.({
        domain: wizardState.domain,
        siteType: wizardState.siteType!,
        phpVersion: wizardState.phpVersion,
        enableSsl: wizardState.enableSsl,
        createDatabase: wizardState.createDatabase,
        wpCacheType: wizardState.wpCacheType,
        wpMultisite: wizardState.wpMultisite,
        sslType: wizardState.sslType,
        dnsProvider: wizardState.dnsProvider ?? undefined,
        hstsEnabled: wizardState.hstsEnabled,
        proxyDestination: wizardState.proxyDestination || undefined,
        aliasTarget: wizardState.aliasTarget || undefined,
      })
    } else {
      // Move to next step
      setCurrentStep((prev) => (prev + 1) as Step)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const isAliasSite = wizardState.siteType === 'alias'
  const isProxySite = wizardState.siteType === 'proxy'
  const isHtmlSite = wizardState.siteType === 'html'
  const needsPhp = wizardState.siteType === 'wordpress' || wizardState.siteType === 'php' || wizardState.siteType === 'phpmysql'
  const needsDatabase = wizardState.siteType === 'wordpress' || wizardState.siteType === 'phpmysql'
  const isWordPress = wizardState.siteType === 'wordpress'

  // Define which steps are needed for each site type
  const stepConfig = {
    domain: true,           // Step 1 - always shown
    siteType: true,         // Step 2 - always shown
    database: needsDatabase,  // Step 3 - only for WordPress and PHP+MySQL
    php: needsPhp,          // Step 4 - only for WordPress, PHP, PHP+MySQL
    proxy: isProxySite,     // Step 5 - only for Proxy sites (replaces PHP step)
    alias: isAliasSite,      // Step 5 - only for Alias sites (replaces PHP step)
    ssl: true,              // Step before review - always shown
    review: true            // Final step - always shown
  }

  // Map physical step numbers to logical step names
  // This maps the currentStep (1-8) to the actual content shown
  const getLogicalStep = () => {
    const steps = []
    if (stepConfig.domain) steps.push('domain')
    if (stepConfig.siteType) steps.push('siteType')
    if (stepConfig.database) steps.push('database')
    if (stepConfig.php) steps.push('php')
    if (stepConfig.proxy) steps.push('proxy')
    if (stepConfig.alias) steps.push('alias')
    if (stepConfig.ssl) steps.push('ssl')
    steps.push('review')

    // Return the logical step at the current step index
    const index = Math.min(currentStep - 1, steps.length - 1)
    return steps[index]
  }

  const logicalStep = getLogicalStep()

  // Calculate total steps
  const getTotalSteps = () => {
    const steps = []
    if (stepConfig.domain) steps.push('domain')
    if (stepConfig.siteType) steps.push('siteType')
    if (stepConfig.database) steps.push('database')
    if (stepConfig.php) steps.push('php')
    if (stepConfig.proxy) steps.push('proxy')
    if (stepConfig.alias) steps.push('alias')
    if (stepConfig.ssl) steps.push('ssl')
    steps.push('review')
    return steps.length
  }

  // Get the display step number (skips hidden steps in numbering)
  const getDisplayStep = () => {
    // The display step should be based on the actual visible steps, not the physical step number
    const steps = []
    if (stepConfig.domain) steps.push(1)
    if (stepConfig.siteType) steps.push(steps.length + 1)
    if (stepConfig.database) steps.push(steps.length + 1)
    if (stepConfig.php) steps.push(steps.length + 1)
    if (stepConfig.proxy) steps.push(steps.length + 1)
    if (stepConfig.alias) steps.push(steps.length + 1)
    if (stepConfig.ssl) steps.push(steps.length + 1)
    steps.push(steps.length + 1) // review

    // Find the display step for the current logical step
    const logicalStep = getLogicalStep()
    const stepMapping: Record<string, number> = {
      'domain': 1,
      'siteType': 2,
      'database': 3,
      'php': 4,
      'proxy': 4,
      'alias': 4,
      'ssl': 5,
      'review': steps.length
    }

    return stepMapping[logicalStep] || currentStep
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Create New Site
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Step {getDisplayStep()} of {getTotalSteps()}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            {(() => {
              // Build the step list dynamically based on current site type
              const steps = []
              steps.push({ step: 1, label: 'Domain', show: true })
              steps.push({ step: 2, label: 'Site Type', show: true })
              if (stepConfig.database) steps.push({ step: steps.length + 1, label: 'Database', show: true })
              if (stepConfig.php) steps.push({ step: steps.length + 1, label: 'PHP', show: true })
              if (stepConfig.proxy) steps.push({ step: steps.length + 1, label: 'Proxy', show: true })
              if (stepConfig.alias) steps.push({ step: steps.length + 1, label: 'Alias', show: true })
              steps.push({ step: steps.length + 1, label: 'SSL', show: true })
              steps.push({ step: steps.length + 1, label: 'Review', show: true })

              return steps.filter((s) => s.show).map((s, index) => {
                const displayStep = index + 1
                const isCurrent = displayStep === getDisplayStep()
                const isPast = displayStep < getDisplayStep()
                return (
                  <div key={s.step} className="flex items-center flex-1">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isPast
                          ? 'bg-teal-500 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      )}
                    >
                      {isPast ? <Check className="w-4 h-4" /> : displayStep}
                    </div>
                    {index < getTotalSteps() - 1 && (
                      <div
                        className={cn(
                          'flex-1 h-1 mx-2 rounded-full transition-colors',
                          isPast ? 'bg-teal-500' : 'bg-zinc-200 dark:bg-zinc-800'
                        )}
                      />
                    )}
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">
          {/* Step 1: Domain */}
          {logicalStep === 'domain' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Enter your domain
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Enter the domain name for your new site. Make sure the domain is already pointing to
                  this server.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Domain Name
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={wizardState.domain}
                    onChange={(e) => updateState({ domain: e.target.value })}
                    placeholder="example.com"
                    className={cn(
                      'w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 transition-colors',
                      wizardState.domain &&
                        !/^[a-zA-Z0-9][a-zA-Z0-9-._]*\.[a-zA-Z]{2,}$/.test(wizardState.domain)
                        ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                        : 'border-zinc-200 dark:border-zinc-800'
                    )}
                    autoFocus
                  />
                </div>
                {wizardState.domain &&
                  !/^[a-zA-Z0-9][a-zA-Z0-9-._]*\.[a-zA-Z]{2,}$/.test(wizardState.domain) && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      Please enter a valid domain name (e.g., example.com)
                    </p>
                  )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Tip:</strong> Make sure your domain's DNS A record points to this server
                  IP address <span className="font-mono font-semibold">({serverInfo?.public_ip || 'loading...'})</span> before proceeding.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Site Type */}
          {logicalStep === 'siteType' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Choose site type
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Select the type of site you want to create. This determines the server
                  configuration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {siteTypeOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => updateState({ siteType: option.type })}
                    className={cn(
                      'p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg',
                      wizardState.siteType === option.type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg shadow-blue-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'p-3 rounded-xl transition-colors',
                          wizardState.siteType === option.type
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        )}
                      >
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                          {option.label}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {option.description}
                        </p>
                      </div>
                      {wizardState.siteType === option.type && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* WordPress Options */}
              {isWordPress && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                  {/* Cache Type */}
                  <div className="px-6 py-4">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      Cache Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {wpCacheTypes.map((cache) => (
                        <button
                          key={cache.value}
                          onClick={() => updateState({ wpCacheType: cache.value })}
                          className={cn(
                            'p-3 rounded-lg border-2 text-left transition-colors',
                            wizardState.wpCacheType === cache.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {cache.label}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {cache.description}
                              </p>
                            </div>
                            {wizardState.wpCacheType === cache.value && (
                              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multisite */}
                  <div className="px-6 py-4">
                    <button
                      onClick={() => updateState({ wpMultisite: !wizardState.wpMultisite })}
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            wizardState.wpMultisite
                              ? 'bg-blue-100 dark:bg-blue-900/50'
                              : 'bg-zinc-100 dark:bg-zinc-800'
                          )}
                        >
                          <Server
                            className={cn(
                              'w-5 h-5',
                              wizardState.wpMultisite
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-zinc-600 dark:text-zinc-400'
                            )}
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Enable WordPress Multisite
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Create a WordPress network with multiple sites
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          'w-11 h-6 rounded-full p-1 transition-colors',
                          wizardState.wpMultisite ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'
                        )}
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded-full bg-white shadow transition-transform',
                            wizardState.wpMultisite ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: PHP Version */}
          {logicalStep === 'php' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Select PHP version
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Choose the PHP version for your site. We recommend PHP 8.2 or higher for best
                  performance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {phpVersions.map((version) => (
                  <button
                    key={version}
                    onClick={() => updateState({ phpVersion: version })}
                    className={cn(
                      'p-6 rounded-xl border-2 text-center transition-all hover:shadow-lg',
                      wizardState.phpVersion === version
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg shadow-blue-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                    )}
                  >
                    <div
                      className={cn(
                        'text-3xl font-bold mb-2 font-mono',
                        wizardState.phpVersion === version
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      PHP {version}
                    </div>
                    {version === '8.3' && (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-full">
                        Latest
                      </span>
                    )}
                    {version === '7.4' && (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full">
                        Deprecated
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Proxy Destination (only for Proxy sites) */}
          {logicalStep === 'proxy' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Configure Proxy Destination
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Enter the destination URL or IP address where this proxy site will forward requests to.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Proxy Destination
                </label>
                <input
                  type="text"
                  placeholder="e.g., http://localhost:3000 or 192.168.1.100:8080"
                  value={wizardState.proxyDestination}
                  onChange={(e) => updateState({ proxyDestination: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Examples: http://localhost:3000, https://api.example.com, 192.168.1.100:8080
                </p>
              </div>
            </div>
          )}

          {/* Step: Alias Target (only for Alias sites) */}
          {logicalStep === 'alias' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Configure Alias Target
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Enter the target domain name that this alias will redirect to.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Target Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g., mainsite.com or www.example.com"
                  value={wizardState.aliasTarget}
                  onChange={(e) => updateState({ aliasTarget: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  The target domain must already exist on this server. The alias will redirect all traffic to the target domain.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: SSL */}
          {logicalStep === 'ssl' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Configure SSL
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Secure your site with a free Let's Encrypt SSL certificate.
                </p>
              </div>

              <button
                onClick={() => updateState({ enableSsl: !wizardState.enableSsl })}
                className={cn(
                  'w-full p-6 rounded-xl border-2 text-left transition-all',
                  wizardState.enableSsl
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-xl transition-colors',
                      wizardState.enableSsl
                        ? 'bg-blue-100 dark:bg-blue-900/50'
                        : 'bg-zinc-100 dark:bg-zinc-800'
                    )}
                  >
                    <Lock
                      className={cn(
                        'w-6 h-6',
                        wizardState.enableSsl
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-zinc-600 dark:text-zinc-400'
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      Enable SSL Certificate
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Automatically install and renew a free Let's Encrypt SSL certificate
                    </p>
                  </div>
                  <div
                    className={cn(
                      'w-12 h-7 rounded-full p-1 transition-colors',
                      wizardState.enableSsl ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white shadow transition-transform',
                        wizardState.enableSsl ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </div>
                </div>
              </button>

              {wizardState.enableSsl && (
                <div className="space-y-4">
                  {/* SSL Type */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                    <div className="px-6 py-4">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                        SSL Certificate Type
                      </label>
                      <div className="space-y-2">
                        <button
                          onClick={() => updateState({ sslType: 'single' })}
                          className={cn(
                            'w-full p-4 rounded-lg border-2 text-left transition-colors',
                            wizardState.sslType === 'single'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                Single Domain
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Standard SSL certificate for {wizardState.domain}
                              </p>
                            </div>
                            {wizardState.sslType === 'single' && (
                              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => updateState({ sslType: 'wildcard' })}
                          className={cn(
                            'w-full p-4 rounded-lg border-2 text-left transition-colors',
                            wizardState.sslType === 'wildcard'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                Wildcard Certificate
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Covers *.{wizardState.domain} with DNS validation
                              </p>
                            </div>
                            {wizardState.sslType === 'wildcard' && (
                              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* DNS Provider (for wildcard) */}
                    {wizardState.sslType === 'wildcard' && (
                      <div className="px-6 py-4 bg-amber-50 dark:bg-amber-950/30">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                              DNS Provider for Wildcard SSL
                            </p>
                            <select
                              value={wizardState.dnsProvider ?? ''}
                              onChange={(e) =>
                                updateState({ dnsProvider: e.target.value as DnsProvider | null })
                              }
                              className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
                            >
                              <option value="">Select DNS provider...</option>
                              {dnsProviders.map((provider) => (
                                <option key={provider.value} value={provider.value}>
                                  {provider.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                              You will need to configure your DNS API credentials before the
                              certificate can be issued.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* HSTS */}
                  <button
                    onClick={() => updateState({ hstsEnabled: !wizardState.hstsEnabled })}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 text-left transition-all',
                      wizardState.hstsEnabled
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          wizardState.hstsEnabled
                            ? 'bg-blue-100 dark:bg-blue-900/50'
                            : 'bg-zinc-100 dark:bg-zinc-800'
                        )}
                      >
                        <Shield
                          className={cn(
                            'w-5 h-5',
                            wizardState.hstsEnabled
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-zinc-600 dark:text-zinc-400'
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Enable HSTS (HTTP Strict Transport Security)
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Enforce HTTPS connections for enhanced security
                        </p>
                      </div>
                      <div
                        className={cn(
                          'w-11 h-6 rounded-full p-1 transition-colors',
                          wizardState.hstsEnabled ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'
                        )}
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded-full bg-white shadow transition-transform',
                            wizardState.hstsEnabled ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </div>
                    </div>
                  </button>
                </div>
              )}

              <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    <p className="font-medium mb-1">SSL Requirements:</p>
                    <ul className="space-y-1">
                      <li>• Domain must be pointing to this server</li>
                      <li>• Port 80 must be accessible for validation</li>
                      <li>• Wildcard certificates require DNS API credentials</li>
                      <li>• Certificate auto-renews before expiration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Database */}
          {logicalStep === 'database' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Configure Database
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {needsDatabase
                    ? 'Create a MySQL database for your site. The database name and user will be auto-generated from your domain.'
                    : 'Alias, Proxy, and HTML sites do not require a database.'}
                </p>
              </div>

              {needsDatabase ? (
                <>
                  <button
                    onClick={() => updateState({ createDatabase: !wizardState.createDatabase })}
                    className={cn(
                      'w-full p-6 rounded-xl border-2 text-left transition-all',
                      wizardState.createDatabase
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-3 rounded-xl transition-colors',
                          wizardState.createDatabase
                            ? 'bg-blue-100 dark:bg-blue-900/50'
                            : 'bg-zinc-100 dark:bg-zinc-800'
                        )}
                      >
                        <Database
                          className={cn(
                            'w-6 h-6',
                            wizardState.createDatabase
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-zinc-600 dark:text-zinc-400'
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                          Create MySQL Database
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          Auto-generate database credentials
                        </p>
                      </div>
                      <div
                        className={cn(
                          'w-12 h-7 rounded-full p-1 transition-colors',
                          wizardState.createDatabase ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full bg-white shadow transition-transform',
                            wizardState.createDatabase ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </div>
                    </div>
                  </button>

                  {wizardState.createDatabase && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                      <div className="px-6 py-4">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Database Name
                        </label>
                        <input
                          type="text"
                          value={wizardState.databaseName}
                          onChange={(e) => updateState({ databaseName: e.target.value })}
                          className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="px-6 py-4">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Database User
                        </label>
                        <input
                          type="text"
                          value={wizardState.databaseUser}
                          onChange={(e) => updateState({ databaseUser: e.target.value })}
                          className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="px-6 py-4">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Password
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value="••••••••••••"
                            readOnly
                            className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm font-mono text-zinc-500 dark:text-zinc-400"
                          />
                          <button className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors">
                            Generate
                          </button>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                          A strong password will be auto-generated
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-6 text-center">
                  <Database className="w-12 h-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-3" />
                  <p className="text-zinc-600 dark:text-zinc-400">
                    No database is needed for{' '}
                    {isAliasSite
                      ? 'alias'
                      : isProxySite
                      ? 'proxy'
                      : isHtmlSite
                      ? 'HTML'
                      : 'this type of'}{' '}
                    sites.
                  </p>
                </div>
              )}

              {/* Summary */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                <div className="px-6 py-4">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                    Site Summary
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-zinc-600 dark:text-zinc-400">Domain:</dt>
                      <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                        {wizardState.domain}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-600 dark:text-zinc-400">Type:</dt>
                      <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                        {wizardState.siteType === 'wordpress'
                          ? 'WordPress'
                          : wizardState.siteType === 'phpmysql'
                          ? 'PHP + MySQL'
                          : wizardState.siteType
                            ? wizardState.siteType.charAt(0).toUpperCase() + wizardState.siteType.slice(1)
                            : 'Unknown'}
                      </dd>
                    </div>
                    {isWordPress && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-zinc-600 dark:text-zinc-400">Cache:</dt>
                          <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                            {wpCacheTypes.find((c) => c.value === wizardState.wpCacheType)?.label ?? 'Default'}
                          </dd>
                        </div>
                        {wizardState.wpMultisite && (
                          <div className="flex justify-between">
                            <dt className="text-zinc-600 dark:text-zinc-400">Multisite:</dt>
                            <dd className="font-medium text-teal-600 dark:text-teal-400">Enabled</dd>
                          </div>
                        )}
                      </>
                    )}
                    {needsPhp && (
                      <div className="flex justify-between">
                        <dt className="text-zinc-600 dark:text-zinc-400">PHP Version:</dt>
                        <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                          {wizardState.phpVersion}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-zinc-600 dark:text-zinc-400">SSL:</dt>
                      <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                        {wizardState.enableSsl ? (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            {wizardState.sslType === 'wildcard' ? 'Wildcard' : 'Single'}
                          </span>
                        ) : (
                          <span className="text-zinc-500">Disabled</span>
                        )}
                      </dd>
                    </div>
                    {wizardState.enableSsl && wizardState.sslType === 'wildcard' && (
                      <div className="flex justify-between">
                        <dt className="text-zinc-600 dark:text-zinc-400">DNS Provider:</dt>
                        <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                          {dnsProviders.find((d) => d.value === wizardState.dnsProvider)?.label ||
                            'Not selected'}
                        </dd>
                      </div>
                    )}
                    {wizardState.enableSsl && wizardState.hstsEnabled && (
                      <div className="flex justify-between">
                        <dt className="text-zinc-600 dark:text-zinc-400">HSTS:</dt>
                        <dd className="font-medium text-teal-600 dark:text-teal-400">Enabled</dd>
                      </div>
                    )}
                    {needsDatabase && (
                      <div className="flex justify-between">
                        <dt className="text-zinc-600 dark:text-zinc-400">Database:</dt>
                        <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                          {wizardState.createDatabase ? (
                            <span className="text-teal-600 dark:text-teal-400">
                              {wizardState.databaseName}
                            </span>
                          ) : (
                            <span className="text-zinc-500">Not created</span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Final Review */}
          {logicalStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Review & Create Site
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Review your site configuration below. Click on any section to make changes, or create
                  your site to finish.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4">
                {/* Domain & Type */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Domain & Type</p>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {wizardState.domain} —{' '}
                          {wizardState.siteType === 'wordpress'
                            ? 'WordPress'
                            : wizardState.siteType === 'phpmysql'
                            ? 'PHP + MySQL'
                            : wizardState.siteType
                            ? wizardState.siteType.charAt(0).toUpperCase() + wizardState.siteType.slice(1)
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                  </button>
                </div>

                {/* WordPress Settings */}
                {isWordPress && (
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                          <FaWordpress className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">WordPress Settings</p>
                          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {wpCacheTypes.find((c) => c.value === wizardState.wpCacheType)?.label ?? 'Default'}
                            {wizardState.wpMultisite && ' • Multisite'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    </button>
                  </div>
                )}

                {/* PHP Version */}
                {needsPhp && (
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50">
                          <Server className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">PHP Version</p>
                          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            PHP {wizardState.phpVersion}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    </button>
                  </div>
                )}

                {/* SSL Configuration */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          wizardState.enableSsl
                            ? 'bg-emerald-100 dark:bg-emerald-900/50'
                            : 'bg-zinc-100 dark:bg-zinc-800'
                        )}
                      >
                        <Shield
                          className={cn(
                            'w-5 h-5',
                            wizardState.enableSsl
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-zinc-600 dark:text-zinc-400'
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">SSL Certificate</p>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {wizardState.enableSsl ? (
                            <span className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              {wizardState.sslType === 'wildcard' ? 'Wildcard' : 'Single Domain'}
                              {wizardState.hstsEnabled && ' • HSTS'}
                              {wizardState.sslType === 'wildcard' &&
                                ` • ${dnsProviders.find((d) => d.value === wizardState.dnsProvider)?.label || 'DNS'}`}
                            </span>
                          ) : (
                            <span className="text-zinc-500">Not enabled</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                  </button>
                </div>

                {/* Database */}
                {needsDatabase && (
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            wizardState.createDatabase
                              ? 'bg-orange-100 dark:bg-orange-900/50'
                              : 'bg-zinc-100 dark:bg-zinc-800'
                          )}
                        >
                          <Database
                            className={cn(
                              'w-5 h-5',
                              wizardState.createDatabase
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-zinc-600 dark:text-zinc-400'
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Database</p>
                          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {wizardState.createDatabase ? wizardState.databaseName : 'Not created'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Ready Message */}
              {isSubmitting ? (
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
                  <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3 animate-spin" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Creating your site...
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    This may take a minute or two. Please wait while WordOps sets up your site.
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
                  <Check className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Ready to create your site
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Your site will be created with the configuration above. Click "Create Site" to
                    proceed.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-b-xl px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={currentStep === 1 ? onCancel : handleBack}
            disabled={isSubmitting}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              currentStep === 1
                ? 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
              isSubmitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className={cn(
              'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all shadow-lg',
              canProceed() && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            )}
          >
            {isSubmitting && logicalStep === 'review' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Site...
              </>
            ) : logicalStep === 'review' ? (
              'Create Site'
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
