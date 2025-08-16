# Real-time Subscriptions Implementation Plan

## Overview
This document outlines the plan to implement AWS Amplify real-time subscriptions in the surveyor application to enable live updates across multiple users and devices.

## Current Architecture
The application currently uses:
- **Offline-first** approach with IndexedDB (Dexie) as primary storage
- **Periodic sync** every 5 minutes
- **Manual sync triggers** on online events and CRUD operations
- **Multi-tenant isolation** with composite keys (`tenantId#id`)

## Proposed Real-time Architecture

### 1. Subscription Manager (`app/home/clients/SubscriptionManager.ts`)

Create a centralized manager for all GraphQL subscriptions:

```typescript
import client from './AmplifyDataClient';
import { getCurrentTenantId } from '../utils/tenant-utils';

export class SubscriptionManager {
  private subscriptions: Map<string, any> = new Map();
  private isConnected: boolean = false;
  
  async start() {
    if (this.isConnected) return;
    
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;
    
    this.startSurveySubscriptions(tenantId);
    this.startComponentSubscriptions(tenantId);
    this.startElementSubscriptions(tenantId);
    this.startPhraseSubscriptions(tenantId);
    this.startSectionSubscriptions(tenantId);
    
    this.isConnected = true;
  }
  
  stop() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
    this.isConnected = false;
  }
  
  private startSurveySubscriptions(tenantId: string) {
    // onCreate subscription
    const createSub = client.models.Surveys
      .onCreate({ filter: { tenantId: { eq: tenantId } } })
      .subscribe({
        next: (data) => this.handleSurveyCreate(data),
        error: (err) => console.error('[Subscription] Survey onCreate error:', err)
      });
    
    // onUpdate subscription  
    const updateSub = client.models.Surveys
      .onUpdate({ filter: { tenantId: { eq: tenantId } } })
      .subscribe({
        next: (data) => this.handleSurveyUpdate(data),
        error: (err) => console.error('[Subscription] Survey onUpdate error:', err)
      });
    
    // onDelete subscription
    const deleteSub = client.models.Surveys
      .onDelete({ filter: { tenantId: { eq: tenantId } } })
      .subscribe({
        next: (data) => this.handleSurveyDelete(data),
        error: (err) => console.error('[Subscription] Survey onDelete error:', err)
      });
    
    this.subscriptions.set('surveys-create', createSub);
    this.subscriptions.set('surveys-update', updateSub);
    this.subscriptions.set('surveys-delete', deleteSub);
  }
  
  // Handler methods to be implemented
  private handleSurveyCreate(data: any) { /* ... */ }
  private handleSurveyUpdate(data: any) { /* ... */ }
  private handleSurveyDelete(data: any) { /* ... */ }
}
```

### 2. Enhanced Dexie Store Interface

Update `DexieStore` interface in `Dexie.ts`:

```typescript
export interface DexieStore<T, TCreate> {
  // Existing methods...
  
  // New subscription methods
  startSubscriptions: () => Promise<void>;
  stopSubscriptions: () => void;
  handleRemoteCreate: (item: T) => Promise<void>;
  handleRemoteUpdate: (item: T) => Promise<void>;
  handleRemoteDelete: (id: string) => Promise<void>;
}
```

### 3. Integration with Dexie Hooks

Modify `CreateDexieHooks` to support real-time updates:

```typescript
function CreateDexieHooks<T extends TableEntity, TCreate, TUpdate>(
  db: Dexie,
  tableName: string,
  remoteHandlers: DexieRemoteHandlers<T, TCreate, TUpdate>
): DexieStore<T, TCreate> {
  
  let subscriptionManager: SubscriptionManager | null = null;
  
  const handleRemoteCreate = async (remoteItem: T) => {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;
    
    // Check if item already exists locally
    const existing = await table.get(remoteItem.id);
    if (!existing) {
      // Add to IndexedDB with Synced status (no need to sync back)
      await table.put({
        ...remoteItem,
        tenantId,
        syncStatus: SyncStatus.Synced,
        lastRemoteUpdate: new Date().toISOString()
      });
      
      console.debug(`[Subscription] Added ${remoteItem.id} to ${tableName}`);
    }
  };
  
  const handleRemoteUpdate = async (remoteItem: T) => {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;
    
    const local = await table.get(remoteItem.id);
    
    // Only update if remote is newer and not locally modified
    if (local && local.syncStatus === SyncStatus.Synced) {
      await table.put({
        ...remoteItem,
        tenantId,
        syncStatus: SyncStatus.Synced,
        lastRemoteUpdate: new Date().toISOString()
      });
      
      console.debug(`[Subscription] Updated ${remoteItem.id} in ${tableName}`);
    }
  };
  
  const handleRemoteDelete = async (id: string) => {
    const local = await table.get(id);
    
    // Only delete if not locally modified
    if (local && local.syncStatus === SyncStatus.Synced) {
      await table.delete(id);
      console.debug(`[Subscription] Deleted ${id} from ${tableName}`);
    }
  };
  
  const startSubscriptions = async () => {
    if (!subscriptionManager) {
      subscriptionManager = new SubscriptionManager(
        tableName,
        { onCreate: handleRemoteCreate, onUpdate: handleRemoteUpdate, onDelete: handleRemoteDelete }
      );
    }
    await subscriptionManager.start();
  };
  
  const stopSubscriptions = () => {
    subscriptionManager?.stop();
    subscriptionManager = null;
  };
  
  // Return enhanced store object
  return {
    // ... existing methods
    startSubscriptions,
    stopSubscriptions,
    handleRemoteCreate,
    handleRemoteUpdate,
    handleRemoteDelete
  };
}
```

### 4. Layout Component Integration

Update `app/home/layout.tsx`:

```typescript
useEffect(() => {
  // ... existing code
  
  // Start subscriptions after initial sync
  const startSubscriptions = async () => {
    // Wait for initial sync to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (navigator.onLine) {
      console.log("[Layout] Starting real-time subscriptions");
      await Promise.all([
        surveyStore.startSubscriptions(),
        componentStore.startSubscriptions(),
        elementStore.startSubscriptions(),
        phraseStore.startSubscriptions(),
        sectionStore.startSubscriptions(),
        imageMetadataStore.startSubscriptions(),
      ]);
    }
  };
  
  startSubscriptions();
  
  // Handle online/offline for subscriptions
  const handleOnline = () => {
    // ... existing sync code
    
    // Restart subscriptions
    startSubscriptions();
  };
  
  const handleOffline = () => {
    // Stop subscriptions when offline
    surveyStore.stopSubscriptions();
    componentStore.stopSubscriptions();
    elementStore.stopSubscriptions();
    phraseStore.stopSubscriptions();
    sectionStore.stopSubscriptions();
    imageMetadataStore.stopSubscriptions();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    // ... existing cleanup
    
    // Stop all subscriptions
    surveyStore.stopSubscriptions();
    componentStore.stopSubscriptions();
    elementStore.stopSubscriptions();
    phraseStore.stopSubscriptions();
    sectionStore.stopSubscriptions();
    imageMetadataStore.stopSubscriptions();
  };
}, []);
```

### 5. Conflict Resolution Strategy

Add version tracking to prevent conflicts:

```typescript
type TableEntity = {
  id: string;
  updatedAt: string;
  syncStatus: string;
  syncError?: string | undefined | null;
  tenantId: string;
  version?: number; // Add version field
  lastRemoteUpdate?: string; // Track subscription updates
}
```

#### Conflict Resolution Rules:
1. **Remote Create**: Always accept if item doesn't exist locally
2. **Remote Update**: Accept if local item is in `Synced` status
3. **Remote Delete**: Accept if local item is in `Synced` status
4. **Local Changes**: Always preserve if `syncStatus` is `Queued` or `Failed`
5. **Version Conflicts**: Use timestamp comparison as tiebreaker

### 6. Visual Feedback Components

Create a real-time status indicator:

```typescript
// app/home/components/RealtimeStatus.tsx
export const RealtimeStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span className="text-xs text-gray-600">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
};
```

### 7. Benefits

- **Instant Updates**: Changes appear immediately across all connected clients
- **Reduced Sync Frequency**: Can increase periodic sync interval to 10-15 minutes
- **Better Collaboration**: Users see each other's changes in real-time
- **Reduced Server Load**: Fewer polling requests
- **Improved UX**: No need to manually refresh or wait for sync

### 8. Implementation Phases

#### Phase 1: Infrastructure (Week 1)
- [ ] Create SubscriptionManager class
- [ ] Update Dexie interfaces
- [ ] Add subscription lifecycle methods

#### Phase 2: Integration (Week 2)
- [ ] Integrate with existing stores
- [ ] Update layout component
- [ ] Add connection management

#### Phase 3: Conflict Resolution (Week 3)
- [ ] Implement version tracking
- [ ] Add conflict resolution logic
- [ ] Test multi-user scenarios

#### Phase 4: UI/UX (Week 4)
- [ ] Add real-time status indicators
- [ ] Implement update notifications
- [ ] Add collaborative features

### 9. Testing Strategy

#### Unit Tests
- Subscription manager lifecycle
- Conflict resolution logic
- Version tracking

#### Integration Tests
- Multi-user update scenarios
- Online/offline transitions
- Subscription reconnection

#### E2E Tests
- Real-time collaboration flow
- Data consistency across clients
- Performance under load

### 10. Performance Considerations

- **WebSocket Connections**: Monitor connection overhead
- **Subscription Limits**: AWS AppSync limits (100 concurrent connections per API key)
- **Data Volume**: Consider pagination for large datasets
- **Rate Limiting**: Implement throttling for high-frequency updates

### 11. Security Considerations

- **Tenant Isolation**: Filter subscriptions by tenantId
- **Authorization**: Leverage Amplify's built-in auth rules
- **Data Validation**: Validate all incoming subscription data
- **Connection Security**: Use WSS (WebSocket Secure) protocol

### 12. Monitoring & Observability

Add logging for:
- Subscription connection status
- Update frequency metrics
- Conflict resolution events
- Error rates and types

### 13. Rollback Plan

If issues arise:
1. Feature flag to disable subscriptions
2. Fall back to existing sync mechanism
3. Clear subscription-related data from IndexedDB
4. Increase periodic sync frequency temporarily

### 14. Future Enhancements

- **Presence Awareness**: Show who's currently viewing/editing
- **Cursor Positions**: Show other users' cursor positions in forms
- **Typing Indicators**: Show when others are typing
- **Change Highlights**: Visually highlight recently changed items
- **Audit Trail**: Track who made what changes via subscriptions

## Conclusion

This implementation will transform the surveyor app from a periodic-sync model to a real-time collaborative application while maintaining the robust offline-first architecture. The phased approach ensures minimal disruption to existing functionality while progressively enhancing the user experience.