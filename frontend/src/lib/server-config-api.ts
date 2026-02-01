import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './api-client'
import { toast } from 'sonner'
import type {
  DnsCredential,
  Fail2banConfig,
  Fail2banConfigUpdate,
  FirewallRule,
  FirewallRuleCreate,
  LogSource,
  MonitoringAlert,
  MonitoringAlertCreate,
  MonitoringAlertUpdate,
  PackageUpdateRequest,
  PackageUpdateResponse,
  ServerLog,
  ServerOverviewInfo,
  SSHConfig,
  SSHConfigUpdate,
  StackServiceInfo,
} from '../types'

// =============================================================================
// API Hooks for Server Configuration
// =============================================================================

/**
 * Hook to fetch server overview information
 * @returns React Query hook for server overview data
 */
export function useServerOverview() {
  return useQuery<ServerOverviewInfo>({
    queryKey: ['server', 'overview'],
    queryFn: () => apiClient.get<ServerOverviewInfo>('/api/v1/server/overview'),
    refetchInterval: undefined, // Manual refresh only
    staleTime: 60000, // Consider data fresh for 1 minute
  })
}

/**
 * Trigger system package updates
 * @param updateType - Type of update: 'all' for all packages, 'security' for security updates only
 * @returns Promise with update response
 */
export async function updatePackages(
  updateType: 'all' | 'security'
): Promise<PackageUpdateResponse> {
  const request: PackageUpdateRequest = { update_type: updateType }
  return apiClient.post<PackageUpdateResponse>('/api/v1/server/packages/update', request)
}

// =============================================================================
// Stack Services API
// =============================================================================

/**
 * Hook to fetch stack services information
 * @returns React Query hook for stack services data
 */
export function useStackServices() {
  return useQuery<StackServiceInfo[]>({
    queryKey: ['server', 'stack-services'],
    queryFn: () => apiClient.get<StackServiceInfo[]>('/api/v1/server/stack-services'),
    refetchInterval: undefined, // Manual refresh only
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

/**
 * Start a stack service
 * @param serviceName - Name of the service to start (e.g., 'nginx', 'php8.1-fpm')
 * @returns Promise with success message
 */
export async function startService(
  serviceName: string
): Promise<{ success: boolean; message: string }> {
  return apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/server/services/${serviceName}/start`
  )
}

/**
 * Stop a stack service
 * @param serviceName - Name of the service to stop (e.g., 'nginx', 'php8.1-fpm')
 * @returns Promise with success message
 */
export async function stopService(
  serviceName: string
): Promise<{ success: boolean; message: string }> {
  return apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/server/services/${serviceName}/stop`
  )
}

/**
 * Restart a stack service
 * @param serviceName - Name of the service to restart (e.g., 'nginx', 'php8.1-fpm')
 * @returns Promise with success message
 */
export async function restartService(
  serviceName: string
): Promise<{ success: boolean; message: string }> {
  return apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/server/services/${serviceName}/restart`
  )
}

/**
 * Get service configuration file content
 * @param serviceName - Name of the service
 * @returns Promise with config content and path
 */
export async function getServiceConfig(
  _serviceName: string
): Promise<{ config: string; path: string }> {
  // Stub for future implementation
  return { config: '', path: '' }
}

/**
 * Update service configuration file
 * @param serviceName - Name of the service
 * @param config - New configuration content
 * @returns Promise with success status
 */
export async function updateServiceConfig(
  _serviceName: string,
  _config: string
): Promise<{ success: boolean }> {
  // Stub for future implementation
  return { success: true }
}

// =============================================================================
// Security API - DNS Credentials
// =============================================================================

/**
 * Hook to fetch DNS credentials information
 * @returns React Query hook for DNS credentials data
 */
export function useDnsCredentials() {
  return useQuery<DnsCredential[]>({
    queryKey: ['server', 'security', 'dns-credentials'],
    queryFn: () => apiClient.get<DnsCredential[]>('/api/v1/server/security/dns-credentials'),
    refetchInterval: undefined, // Manual refresh only
    staleTime: 60000, // Consider data fresh for 1 minute
  })
}

// =============================================================================
// Security API - Firewall Rules
// =============================================================================

/**
 * Hook to fetch firewall rules
 * @returns React Query hook for firewall rules data
 */
export function useFirewallRules() {
  return useQuery<FirewallRule[]>({
    queryKey: ['server', 'security', 'firewall'],
    queryFn: () => apiClient.get<FirewallRule[]>('/api/v1/server/security/firewall'),
    refetchInterval: undefined, // Manual refresh only
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

/**
 * Hook to add a firewall rule
 * @returns React Query mutation hook for adding firewall rules
 */
export function useAddFirewallRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rule: FirewallRuleCreate) =>
      apiClient.post<{ success: boolean; message: string }>('/api/v1/server/security/firewall', rule),
    onSuccess: () => {
      toast.success('Firewall rule added successfully')
      queryClient.invalidateQueries({ queryKey: ['server', 'security', 'firewall'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to add firewall rule: ${error.message}`)
    },
  })
}

/**
 * Hook to delete a firewall rule
 * @returns React Query mutation hook for deleting firewall rules
 */
export function useDeleteFirewallRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ruleId: string) =>
      apiClient.delete<{ success: boolean; message: string }>(`/api/v1/server/security/firewall/${ruleId}`),
    onSuccess: () => {
      toast.success('Firewall rule deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['server', 'security', 'firewall'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete firewall rule: ${error.message}`)
    },
  })
}

// =============================================================================
// Security API - SSH Configuration
// =============================================================================

/**
 * Hook to fetch SSH configuration
 * @returns React Query hook for SSH config data
 */
export function useSshConfig() {
  return useQuery<SSHConfig>({
    queryKey: ['server', 'security', 'ssh'],
    queryFn: () => apiClient.get<SSHConfig>('/api/v1/server/security/ssh'),
    refetchInterval: undefined, // Manual refresh only
    staleTime: 60000, // Consider data fresh for 1 minute
  })
}

/**
 * Hook to update SSH configuration
 * @returns React Query mutation hook for updating SSH config
 */
export function useUpdateSshConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: SSHConfigUpdate) =>
      apiClient.put<{ success: boolean; message: string }>('/api/v1/server/security/ssh', config),
    onSuccess: () => {
      toast.success('SSH configuration updated successfully')
      queryClient.invalidateQueries({ queryKey: ['server', 'security', 'ssh'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to update SSH configuration: ${error.message}`)
    },
  })
}

// =============================================================================
// Security API - Fail2ban Configuration
// =============================================================================

/**
 * Hook to fetch fail2ban configuration
 * @returns React Query hook for fail2ban config data
 */
export function useFail2banConfig() {
  return useQuery<Fail2banConfig>({
    queryKey: ['server', 'security', 'fail2ban'],
    queryFn: () => apiClient.get<Fail2banConfig>('/api/v1/server/security/fail2ban'),
    refetchInterval: undefined, // Manual refresh only
    staleTime: 60000, // Consider data fresh for 1 minute
  })
}

/**
 * Hook to update fail2ban configuration
 * @returns React Query mutation hook for updating fail2ban config
 */
export function useUpdateFail2banConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: Fail2banConfigUpdate) =>
      apiClient.put<{ success: boolean; message: string }>('/api/v1/server/security/fail2ban', config),
    onSuccess: () => {
      toast.success('Fail2ban configuration updated successfully')
      queryClient.invalidateQueries({ queryKey: ['server', 'security', 'fail2ban'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to update fail2ban configuration: ${error.message}`)
    },
  })
}

/**
 * Hook to start fail2ban service
 * @returns React Query mutation hook for starting fail2ban
 */
export function useStartFail2ban() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean; message: string }>('/api/v1/server/security/fail2ban/start'),
    onSuccess: () => {
      toast.success('Fail2ban service started')
      queryClient.invalidateQueries({ queryKey: ['server', 'security', 'fail2ban'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to start fail2ban: ${error.message}`)
    },
  })
}

/**
 * Hook to stop fail2ban service
 * @returns React Query mutation hook for stopping fail2ban
 */
export function useStopFail2ban() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean; message: string }>('/api/v1/server/security/fail2ban/stop'),
    onSuccess: () => {
      toast.success('Fail2ban service stopped')
      queryClient.invalidateQueries({ queryKey: ['server', 'security', 'fail2ban'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to stop fail2ban: ${error.message}`)
    },
  })
}

// =============================================================================
// Logs API
// =============================================================================

/**
 * Hook to fetch server logs with optional filtering
 * @param source - Log source filter (optional, can be 'all' or specific source)
 * @param search - Text search query (optional)
 * @returns React Query hook for server logs data
 */
export function useLogs(source?: LogSource | 'all', search?: string) {
  return useQuery<ServerLog[]>({
    queryKey: ['server', 'logs', source, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (source && source !== 'all') params.append('source', source)
      if (search) params.append('search', search)
      const query = params.toString() ? `?${params}` : ''
      return apiClient.get<ServerLog[]>(`/api/v1/server/logs${query}`)
    },
    refetchInterval: undefined, // Manual refresh only
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

// =============================================================================
// Monitoring Alerts API
// =============================================================================

/**
 * Hook to fetch monitoring alerts
 * @returns React Query hook for monitoring alerts data
 */
export function useMonitoringAlerts() {
  return useQuery<MonitoringAlert[]>({
    queryKey: ['server', 'monitoring', 'alerts'],
    queryFn: () => apiClient.get<MonitoringAlert[]>('/api/v1/server/monitoring/alerts'),
    refetchInterval: undefined,
    staleTime: 60000,
  })
}

/**
 * Hook to create a monitoring alert
 * @returns React Query mutation hook for creating alerts
 */
export function useCreateAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (alert: MonitoringAlertCreate) =>
      apiClient.post<MonitoringAlert>('/api/v1/server/monitoring/alerts', alert),
    onSuccess: () => {
      toast.success('Alert created successfully')
      queryClient.invalidateQueries({ queryKey: ['server', 'monitoring', 'alerts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create alert')
    },
  })
}

/**
 * Hook to update a monitoring alert
 * @returns React Query mutation hook for updating alerts
 */
export function useUpdateAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, alert }: { id: string; alert: MonitoringAlertUpdate }) =>
      apiClient.put<MonitoringAlert>(`/api/v1/server/monitoring/alerts/${id}`, alert),
    onSuccess: () => {
      toast.success('Alert updated successfully')
      queryClient.invalidateQueries({ queryKey: ['server', 'monitoring', 'alerts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update alert')
    },
  })
}

/**
 * Hook to delete a monitoring alert
 * @returns React Query mutation hook for deleting alerts
 */
export function useDeleteAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ message: string }>(`/api/v1/server/monitoring/alerts/${id}`),
    onSuccess: () => {
      toast.success('Alert deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['server', 'monitoring', 'alerts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete alert')
    },
  })
}

/**
 * Hook to toggle a monitoring alert enabled/disabled
 * @returns React Query mutation hook for toggling alerts
 */
export function useToggleAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<MonitoringAlert>(`/api/v1/server/monitoring/alerts/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', 'monitoring', 'alerts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to toggle alert')
    },
  })
}

// =============================================================================
// Type Exports
// =============================================================================

export type {
  ServerOverviewInfo,
  PackageUpdateRequest,
  PackageUpdateResponse,
  StackServiceInfo,
  DnsCredential,
  FirewallRule,
  FirewallRuleCreate,
  SSHConfig,
  SSHConfigUpdate,
  Fail2banConfig,
  Fail2banConfigUpdate,
  MonitoringAlert,
  MonitoringAlertCreate,
  MonitoringAlertUpdate,
  ServerLog,
}
