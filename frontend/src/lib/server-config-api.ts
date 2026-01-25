import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client'
import type {
  ServerOverviewInfo,
  PackageUpdateRequest,
  PackageUpdateResponse,
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
  serviceName: string
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
  serviceName: string,
  config: string
): Promise<{ success: boolean }> {
  // Stub for future implementation
  return { success: true }
}

// =============================================================================
// Type Exports
// =============================================================================

export type { ServerOverviewInfo, PackageUpdateRequest, PackageUpdateResponse, StackServiceInfo }
