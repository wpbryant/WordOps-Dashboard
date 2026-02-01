import { Globe, Cloud, ExternalLink, AlertCircle, Loader2 } from 'lucide-react'
import { useDnsCredentials } from '../../lib/server-config-api'
import type { DnsCredential } from '../../types'

/**
 * Format provider name for display
 */
function formatProviderName(provider: string): string {
  const providerNames: Record<string, string> = {
    cloudflare: 'Cloudflare',
    digitalocean: 'DigitalOcean',
    godaddy: 'GoDaddy',
    linode: 'Linode',
    aws: 'Amazon Web Services',
    google: 'Google Cloud',
    vultr: 'Vultr',
    hetzner: 'Hetzner',
    ovh: 'OVH',
    aliyun: 'Aliyun',
    namecom: 'Name.com',
    lexicon: 'Lexicon',
  }
  return providerNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1)
}

/**
 * Get provider icon component based on provider name
 */
function getProviderIcon(provider: string) {
  // Use Cloud icon for all DNS providers (they're cloud-based DNS services)
  return Cloud
}

/**
 * DnsCredentialsSection component displays configured DNS API credentials
 */
export function DnsCredentialsSection() {
  const { data: credentials, isLoading, error, refetch } = useDnsCredentials()

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">DNS API Credentials</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Let's Encrypt wildcard SSL validation
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">DNS API Credentials</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Let's Encrypt wildcard SSL validation
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Failed to load DNS credentials</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const hasCredentials = credentials && credentials.length > 0

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">DNS API Credentials</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Let's Encrypt wildcard SSL validation
            </p>
          </div>
        </div>
      </div>

      {/* Helper Text */}
      <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          DNS API credentials are used for Let's Encrypt wildcard SSL certificates. Configure via WordOps CLI using export commands.
        </p>
      </div>

      {/* Credentials List */}
      {hasCredentials ? (
        <div className="space-y-3">
          {credentials.map((credential) => {
            const ProviderIcon = getProviderIcon(credential.provider)
            const displayName = formatProviderName(credential.provider)

            return (
              <div
                key={credential.provider}
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
                    <ProviderIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{displayName}</p>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                        Configured
                      </span>
                    </div>
                    {credential.email && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{credential.email}</p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      Key: {credential.key_preview}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
            <Cloud className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
          </div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
            No DNS API credentials configured
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-xs">
            Configure DNS provider credentials via WordOps CLI to enable wildcard SSL certificates
          </p>
          <a
            href="https://docs.wordops.net/how-to/configure-letsencrypt-dns-api-validation/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>View Documentation</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Documentation Link (also show when credentials exist) */}
      {hasCredentials && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <a
            href="https://docs.wordops.net/how-to/configure-letsencrypt-dns-api-validation/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <span>WordOps DNS API Documentation</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  )
}
