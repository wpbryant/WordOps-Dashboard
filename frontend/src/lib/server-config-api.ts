import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client'
import type {
  ServerOverviewInfo,
  PackageUpdateRequest,
  PackageUpdateResponse,
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
// Type Exports
// =============================================================================

export type { ServerOverviewInfo, PackageUpdateRequest, PackageUpdateResponse }
