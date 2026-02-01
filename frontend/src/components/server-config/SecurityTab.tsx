import { DnsCredentialsSection } from './DnsCredentialsSection'
import { FirewallSection } from './FirewallSection'

/**
 * SecurityTab component displays security-related server configuration
 * including DNS credentials, SSH settings, firewall rules, and fail2ban status
 */
export function SecurityTab() {
  return (
    <div className="space-y-6">
      {/* DNS API Credentials Section */}
      <DnsCredentialsSection />

      {/* Firewall Rules Section */}
      <FirewallSection />

      {/* Additional security sections will be added in future plans:
          - SSH Configuration
          - Fail2ban Status
      */}
    </div>
  )
}
