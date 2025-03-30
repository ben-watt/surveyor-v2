import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { useTenant } from '../contexts/TenantContext';
import { Schema } from '@/amplify/data/resource';

// Create a client for data operations
const client = generateClient<Schema>();

/**
 * Hook to fetch data with tenant context
 * This hook will automatically filter data based on the current tenant
 */
export function useTenantData<T>(
  fetchFunction: (tenantId: string | null) => Promise<T>,
  dependencies: any[] = []
) {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Pass the current tenant ID to the fetch function
      const result = await fetchFunction(currentTenant?.name || null);
      
      setData(result);
    } catch (err) {
      console.error('Error fetching tenant data:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    return () => {
      // Cleanup is handled by the isMounted check in fetchData
    };
  }, [currentTenant?.name, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Helper function to add tenant filter to queries
 */
export function withTenantFilter<T>(
  queryFn: (filter?: any) => Promise<T>,
  tenantId: string | null
): Promise<T> {
  if (!tenantId) {
    return queryFn();
  }
  
  // Add tenant filter to the query
  return queryFn({
    tenantId: { eq: tenantId }
  });
}

/**
 * Example usage:
 * 
 * // In a component:
 * const { data: surveys, loading } = useTenantData(
 *   (tenantId) => withTenantFilter(
 *     (filter) => client.models.Surveys.list(filter),
 *     tenantId
 *   )
 * );
 */ 