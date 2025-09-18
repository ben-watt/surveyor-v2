"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { listUserTenants, getPreferredTenant, setPreferredTenant, Tenant } from "../utils/tenant-utils";
import { useRouter } from "next/navigation";

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  loading: boolean;
  error: string | null;
  setCurrentTenant: (tenant: Tenant | null) => Promise<void>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const LOCAL_TENANTS_KEY = 'sv_tenants';
  const LOCAL_CURRENT_TENANT_NAME_KEY = 'sv_current_tenant_name';

  // Load tenants and set the current tenant
  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userTenants = await listUserTenants();
      setTenants(userTenants);

      if (userTenants.length > 0) {
        const preferredTenantName = await getPreferredTenant();

        if (preferredTenantName) {
          const preferredTenant = userTenants.find(t => t.name === preferredTenantName) || null;
          setCurrentTenantState(prev => (prev?.name === preferredTenant?.name ? prev : preferredTenant));
        } else {
          setCurrentTenantState(prev => (prev === null ? prev : null));
        }
      } else {
        setCurrentTenantState(prev => (prev === null ? prev : null));
      }
    } catch (err) {
      console.error("Error loading tenants:", err);
      setError("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  // Set the current tenant and save it as preferred
  const setCurrentTenant = useCallback(async (tenant: Tenant | null) => {
    try {
      setCurrentTenantState(prev => (prev?.name === tenant?.name ? prev : tenant));
      await setPreferredTenant(tenant ? tenant.name : "personal");
      router.push("/home");
    } catch (err) {
      console.error("Error setting preferred tenant:", err);
      setError("Failed to set preferred tenant");
    }
  }, [router]);

  // Refresh the tenant list
  const refreshTenants = useCallback(async () => {
    await loadTenants();
  }, [loadTenants]);

  // Load tenants on initial render
  useEffect(() => {
    try {
      const storedTenantsRaw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_TENANTS_KEY) : null;
      const storedCurrentName = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_CURRENT_TENANT_NAME_KEY) : null;

      if (storedTenantsRaw) {
        const parsed = JSON.parse(storedTenantsRaw) as unknown;
        if (Array.isArray(parsed)) {
          const storedTenants = parsed as Tenant[];
          setTenants(storedTenants);

          if (storedCurrentName) {
            const matched = storedTenants.find(t => t.name === storedCurrentName) || null;
            setCurrentTenantState(matched);
          } else {
            setCurrentTenantState(null);
          }
          setLoading(false);
          return; // Skip network fetch when we have persisted data
        }
      }
    } catch (e) {
      // If parsing fails, fall back to fetching
      console.warn('Failed to read tenants from localStorage; falling back to fetch.');
    }

    loadTenants();
  }, [loadTenants]);

  // Persist tenants and current tenant to localStorage
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(LOCAL_TENANTS_KEY, JSON.stringify(tenants));
      if (currentTenant?.name) {
        localStorage.setItem(LOCAL_CURRENT_TENANT_NAME_KEY, currentTenant.name);
      } else {
        localStorage.removeItem(LOCAL_CURRENT_TENANT_NAME_KEY);
      }
    } catch (e) {
      // Ignore storage errors (quota/permissions)
    }
  }, [tenants, currentTenant]);

  const value = useMemo(
    () => ({
      currentTenant,
      tenants,
      loading,
      error,
      setCurrentTenant,
      refreshTenants,
    }),
    [currentTenant, tenants, loading, error, setCurrentTenant, refreshTenants]
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
} 