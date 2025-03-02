'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { getCurrentTenantId, listUserTenants, setPreferredTenant, Tenant } from './tenant-utils';

interface TenantContextType {
  currentTenantId: string | null;
  tenants: Tenant[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => Promise<boolean>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTenantData = async () => {
    try {
      setIsLoading(true);
      // Get current tenant ID
      const tenantId = await getCurrentTenantId();
      setCurrentTenantId(tenantId);
      
      // Get list of available tenants
      const tenantsList = await listUserTenants();
      setTenants(tenantsList);
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, []);

  const switchTenant = async (tenantId: string): Promise<boolean> => {
    try {
      await setPreferredTenant(tenantId);
      setCurrentTenantId(tenantId);
      return true;
    } catch (error) {
      console.error('Error switching tenant:', error);
      return false;
    }
  };

  const refreshTenants = async (): Promise<void> => {
    await loadTenantData();
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenantId,
        tenants,
        isLoading,
        switchTenant,
        refreshTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Helper hook to get tenant filter for queries
export function useTenantFilter() {
  const { currentTenantId } = useTenant();
  return currentTenantId ? { tenantId: currentTenantId } : {};
} 