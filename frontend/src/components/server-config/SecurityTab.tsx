import { DnsCredentialsSection } from './DnsCredentialsSection'
import { FirewallSection } from './FirewallSection'
import { SSHConfigSection } from './SSHConfigSection'
import { Fail2banSection } from './Fail2banSection'

/**
 * SecurityTab component displays security-related server configuration
 * including DNS credentials, SSH settings, firewall rules, and fail2ban status
 */
export function SecurityTab() {
  return (
    <div className="space-y-6">
      {/* SSH Configuration Section */}
      <SSHConfigSection />

      {/* Fail2ban Section */}
      <Fail2banSection />

      {/* DNS API Credentials Section */}
      <DnsCredentialsSection />

      {/* Firewall Rules Section */}
      <FirewallSection />
    </div>
  )
}
