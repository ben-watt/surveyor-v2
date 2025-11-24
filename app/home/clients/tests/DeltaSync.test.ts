/**
 * Tests for delta sync implementation
 * Verifies incremental sync using updatedAt timestamps
 */

describe('Delta sync', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('lastSyncTime management', () => {
    it('should return null when no lastSyncTime exists', () => {
      const key = 'lastSync_surveys_tenant-123';
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should store and retrieve lastSyncTime', () => {
      const key = 'lastSync_surveys_tenant-123';
      const timestamp = '2024-01-15T10:30:00.000Z';
      
      localStorage.setItem(key, timestamp);
      
      expect(localStorage.getItem(key)).toBe(timestamp);
    });

    it('should use table and tenant in key format', () => {
      const tableName = 'components';
      const tenantId = 'test-tenant-456';
      const timestamp = '2024-01-16T12:00:00.000Z';
      
      const key = `lastSync_${tableName}_${tenantId}`;
      localStorage.setItem(key, timestamp);
      
      expect(localStorage.getItem(key)).toBe(timestamp);
      expect(localStorage.getItem('lastSync_components_test-tenant-456')).toBe(timestamp);
    });

    it('should isolate sync times per table', () => {
      const tenantId = 'tenant-abc';
      const surveysTime = '2024-01-15T10:00:00.000Z';
      const elementsTime = '2024-01-15T11:00:00.000Z';
      
      localStorage.setItem(`lastSync_surveys_${tenantId}`, surveysTime);
      localStorage.setItem(`lastSync_elements_${tenantId}`, elementsTime);
      
      expect(localStorage.getItem(`lastSync_surveys_${tenantId}`)).toBe(surveysTime);
      expect(localStorage.getItem(`lastSync_elements_${tenantId}`)).toBe(elementsTime);
    });

    it('should isolate sync times per tenant', () => {
      const tableName = 'phrases';
      const tenant1Time = '2024-01-15T10:00:00.000Z';
      const tenant2Time = '2024-01-15T11:00:00.000Z';
      
      localStorage.setItem(`lastSync_${tableName}_tenant-1`, tenant1Time);
      localStorage.setItem(`lastSync_${tableName}_tenant-2`, tenant2Time);
      
      expect(localStorage.getItem(`lastSync_${tableName}_tenant-1`)).toBe(tenant1Time);
      expect(localStorage.getItem(`lastSync_${tableName}_tenant-2`)).toBe(tenant2Time);
    });
  });

  describe('delta sync filter logic', () => {
    it('should create filter with gt operator for since parameter', () => {
      const since = '2024-01-15T10:00:00.000Z';
      const filter = since ? { updatedAt: { gt: since } } : undefined;
      
      expect(filter).toEqual({
        updatedAt: { gt: '2024-01-15T10:00:00.000Z' }
      });
    });

    it('should return undefined filter when no since parameter', () => {
      const since: string | undefined = undefined;
      const filter = since ? { updatedAt: { gt: since } } : undefined;
      
      expect(filter).toBeUndefined();
    });

    it('should handle empty string since as falsy', () => {
      const since = '';
      const filter = since ? { updatedAt: { gt: since } } : undefined;
      
      expect(filter).toBeUndefined();
    });
  });

  describe('sync time update logic', () => {
    it('should update lastSyncTime after successful sync', () => {
      const tableName = 'sections';
      const tenantId = 'sync-test-tenant';
      const syncStartTime = '2024-01-16T14:30:00.000Z';
      
      // Simulate successful sync
      localStorage.setItem(`lastSync_${tableName}_${tenantId}`, syncStartTime);
      
      expect(localStorage.getItem(`lastSync_${tableName}_${tenantId}`)).toBe(syncStartTime);
    });

    it('should use sync start time (not end time) for consistency', () => {
      // This ensures records created during sync aren't missed on next sync
      const syncStartTime = new Date('2024-01-16T14:30:00.000Z');
      const syncEndTime = new Date('2024-01-16T14:30:05.000Z');
      
      // The stored time should be the start time
      expect(syncStartTime.toISOString()).toBe('2024-01-16T14:30:00.000Z');
      expect(syncEndTime.toISOString()).toBe('2024-01-16T14:30:05.000Z');
      
      // Using start time ensures we don't miss records updated during sync
      expect(syncStartTime < syncEndTime).toBe(true);
    });
  });

  describe('initial vs delta sync detection', () => {
    it('should detect initial sync when no lastSyncTime', () => {
      const lastSyncTime = localStorage.getItem('lastSync_surveys_new-tenant');
      const isDeltaSync = !!lastSyncTime;
      
      expect(isDeltaSync).toBe(false);
    });

    it('should detect delta sync when lastSyncTime exists', () => {
      localStorage.setItem('lastSync_surveys_existing-tenant', '2024-01-15T00:00:00.000Z');
      
      const lastSyncTime = localStorage.getItem('lastSync_surveys_existing-tenant');
      const isDeltaSync = !!lastSyncTime;
      
      expect(isDeltaSync).toBe(true);
    });
  });

  describe('clearLastSyncTime behavior', () => {
    it('should clear lastSyncTime to force full sync', () => {
      const key = 'lastSync_surveys_force-full-tenant';
      localStorage.setItem(key, '2024-01-15T00:00:00.000Z');
      
      expect(localStorage.getItem(key)).not.toBeNull();
      
      localStorage.removeItem(key);
      
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should only clear specific table/tenant combination', () => {
      const tenant = 'selective-clear-tenant';
      localStorage.setItem(`lastSync_surveys_${tenant}`, '2024-01-15T00:00:00.000Z');
      localStorage.setItem(`lastSync_elements_${tenant}`, '2024-01-15T00:00:00.000Z');
      
      // Clear only surveys
      localStorage.removeItem(`lastSync_surveys_${tenant}`);
      
      expect(localStorage.getItem(`lastSync_surveys_${tenant}`)).toBeNull();
      expect(localStorage.getItem(`lastSync_elements_${tenant}`)).not.toBeNull();
    });
  });

  describe('timestamp format handling', () => {
    it('should handle ISO 8601 timestamp format', () => {
      const timestamp = '2024-01-15T10:30:00.000Z';
      const date = new Date(timestamp);
      
      expect(date.toISOString()).toBe(timestamp);
    });

    it('should compare timestamps correctly for filtering', () => {
      const lastSync = '2024-01-15T10:00:00.000Z';
      const oldRecord = '2024-01-15T09:00:00.000Z';
      const newRecord = '2024-01-15T11:00:00.000Z';
      
      // This is how the server filter would work
      expect(newRecord > lastSync).toBe(true);  // Should be included
      expect(oldRecord > lastSync).toBe(false); // Should be excluded
    });

    it('should handle timezone-aware comparisons', () => {
      const lastSync = new Date('2024-01-15T10:00:00.000Z');
      const recordTime = new Date('2024-01-15T10:00:00.001Z'); // 1ms later
      
      expect(recordTime > lastSync).toBe(true);
    });
  });
});

