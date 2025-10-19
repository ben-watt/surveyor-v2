# Legend-State Migration Plan: Proof of Concept First

## Executive Summary

This document outlines a practical, low-risk migration from Dexie to Legend-State v3, starting with a small proof of concept to validate the approach before full commitment.

**Goal**: Prove Legend-State v3 can handle your offline-first sync requirements with less code and better performance.

**Legend-State v3 Benefits:**

- Direct observable rendering in React (less boilerplate)
- Enhanced computed with two-way binding
- Legend Kit CLI for rapid development
- Built-in retry with exponential backoff
- Improved TypeScript inference
- ~50-60% code reduction vs Dexie implementation

## Phase 1: Proof of Concept (Week 1)

### Objective

Migrate ONLY the Phrases store to Legend-State while keeping everything else on Dexie. Phrases is ideal because:

- Smaller dataset (~100-500 records)
- Less complex than Surveys
- Clear sync requirements
- Used across the app (good test of integration)

### Implementation Plan

#### Step 1: Install Dependencies (Day 1)

```bash
# Install v3 (currently in beta)
npm install @legendapp/state@beta

# Or use Legend Kit CLI for easier setup
npx @legendapp/kit@latest init
```

#### Step 2: Create Legend-State Store (Day 1-2)

Create `app/home/clients/legendState/phrasesStore.ts`:

```typescript
import { observable, observe } from '@legendapp/state';
import { observablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb';
import { synced } from '@legendapp/state/sync';
import { configureSynced } from '@legendapp/state/sync';
import client from '../AmplifyDataClient';
import { getCurrentTenantId } from '@/app/home/utils/tenant-utils';
import { type Schema } from '@/amplify/data/resource';

// Configure synced with better defaults
configureSynced({
  debounceSet: 1000,
  persist: {
    retrySync: true,
  },
});

type Phrase = Schema['Phrases']['type'];

// Track sync status separately (matching current implementation)
export const phrasesSyncStatus$ = observable<
  Record<
    string,
    {
      status: 'synced' | 'queued' | 'failed' | 'pending_delete';
      error?: string;
      retryCount: number;
      lastAttempt?: string;
    }
  >
>({});

// Helper to fetch all pages (reuse existing logic)
async function fetchAllPhrases(tenantId: string): Promise<Phrase[]> {
  const allItems: Phrase[] = [];
  let nextToken: string | null = null;

  do {
    const response = await client.models.Phrases.list({
      filter: { tenantId: { eq: tenantId } },
      nextToken,
      limit: 100,
    });

    if (response.errors) {
      throw new Error(response.errors.map((e) => e.message).join(', '));
    }

    allItems.push(...response.data);
    nextToken = response.nextToken || null;
  } while (nextToken);

  return allItems;
}

// Main phrases store with Legend-State
export const phrases$ = observable(
  synced({
    // Initial load from server
    get: async () => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return {};

      console.debug('[Legend-State] Loading phrases from server');
      const phrases = await fetchAllPhrases(tenantId);

      // Convert array to object format for Legend-State
      const phrasesMap = phrases.reduce(
        (acc, phrase) => {
          acc[phrase.id] = phrase;
          // Initialize sync status
          phrasesSyncStatus$[phrase.id].set({
            status: 'synced',
            retryCount: 0,
            lastAttempt: new Date().toISOString(),
          });
          return acc;
        },
        {} as Record<string, Phrase>,
      );

      console.debug(`[Legend-State] Loaded ${Object.keys(phrasesMap).length} phrases`);
      return phrasesMap;
    },

    // Handle mutations (create, update, delete)
    set: async ({ value, changes }) => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;

      console.debug(`[Legend-State] Processing ${changes.length} changes`);

      // Process changes in parallel for better performance
      const results = await Promise.allSettled(
        changes.map(async (change) => {
          const id = change.path[0] as string;
          const item = value[id];

          // Update sync status to queued
          phrasesSyncStatus$[id].status.set('queued');

          try {
            // Handle deletes
            if (change.deleted) {
              console.debug(`[Legend-State] Deleting phrase ${id}`);
              await client.models.Phrases.delete({ id });
              delete phrasesSyncStatus$[id];
              return { id, operation: 'delete', success: true };
            }

            // Handle creates (no previous value)
            if (change.prevAtPath === undefined) {
              console.debug(`[Legend-State] Creating phrase ${id}`);
              const result = await client.models.Phrases.create({
                ...item,
                tenantId,
              });

              if (result.errors) {
                throw new Error(result.errors.map((e) => e.message).join(', '));
              }

              phrasesSyncStatus$[id].set({
                status: 'synced',
                retryCount: 0,
                lastAttempt: new Date().toISOString(),
              });
              return { id, operation: 'create', success: true };
            }

            // Handle updates
            console.debug(`[Legend-State] Updating phrase ${id}`);
            const result = await client.models.Phrases.update({
              ...item,
              tenantId,
            });

            if (result.errors) {
              throw new Error(result.errors.map((e) => e.message).join(', '));
            }

            phrasesSyncStatus$[id].set({
              status: 'synced',
              retryCount: 0,
              lastAttempt: new Date().toISOString(),
            });
            return { id, operation: 'update', success: true };
          } catch (error: any) {
            console.error(`[Legend-State] Sync failed for phrase ${id}:`, error);

            const currentRetry = phrasesSyncStatus$[id].retryCount.get() || 0;
            phrasesSyncStatus$[id].set({
              status: 'failed',
              error: error.message,
              retryCount: currentRetry + 1,
              lastAttempt: new Date().toISOString(),
            });

            // Rethrow to trigger Legend-State's retry mechanism
            if (currentRetry < 3) {
              throw error;
            }

            return { id, operation: 'failed', success: false, error: error.message };
          }
        }),
      );

      // Log results
      const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success),
      ).length;
      console.debug(`[Legend-State] Sync complete: ${succeeded} succeeded, ${failed} failed`);
    },

    // Sync configuration
    mode: 'merge', // Merge remote and local changes
    debounceSet: 1000, // Same as current Dexie implementation
    retry: {
      times: 3,
      delay: 1000,
      backoff: 'exponential', // 1s, 2s, 4s
    },

    // Persist to IndexedDB
    persist: {
      plugin: observablePersistIndexedDB(),
      name: 'legendstate_phrases',
      indexedDB: {
        databaseName: 'LegendStateSurveyor',
        version: 1,
        tableNames: ['phrases'],
      },
    },
  }),
);

// Periodic sync (same as current implementation)
let syncInterval: NodeJS.Timeout | null = null;

export function startPhrasesPeriodicSync(intervalMs: number = 30000) {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  syncInterval = setInterval(async () => {
    if (navigator.onLine) {
      console.debug('[Legend-State] Periodic sync triggered');
      try {
        await phrases$.sync();
      } catch (error) {
        console.error('[Legend-State] Periodic sync failed:', error);
      }
    }
  }, intervalMs);

  return () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  };
}

// Manual sync function
export async function forceSyncPhrases() {
  console.debug('[Legend-State] Force sync triggered');

  // Reset failed items to retry
  const failedIds = Object.entries(phrasesSyncStatus$.get())
    .filter(([_, status]) => status.status === 'failed')
    .map(([id]) => id);

  failedIds.forEach((id) => {
    phrasesSyncStatus$[id].status.set('queued');
    phrasesSyncStatus$[id].retryCount.set(0);
  });

  return await phrases$.sync();
}

// Hook for React components
import { useSelector, useComputed } from '@legendapp/state/react';

export function usePhrases() {
  const phrases = useSelector(phrases$);
  const syncStatus = useSelector(phrasesSyncStatus$);

  // Compute hydration status
  const hydrated = useComputed(() => {
    return Object.keys(phrases).length > 0 || navigator.onLine === false;
  });

  // Convert object to array for compatibility
  const phrasesArray = useComputed(() => {
    return Object.values(phrases);
  });

  return {
    hydrated: hydrated.get(),
    phrases: phrasesArray.get(),
    syncStatus: syncStatus,
    // Methods
    addPhrase: async (phrase: Omit<Phrase, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      phrases$[id].set({
        ...phrase,
        id,
        tenantId: await getCurrentTenantId(),
        createdAt: now,
        updatedAt: now,
      } as Phrase);
    },
    updatePhrase: (id: string, updates: Partial<Phrase>) => {
      if (phrases$[id].get()) {
        phrases$[id].assign({
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    deletePhrase: (id: string) => {
      delete phrases$[id];
    },
    forceSync: forceSyncPhrases,
  };
}

// Get phrase by ID
export function getPhrase(id: string): Phrase | undefined {
  return phrases$[id].get();
}

// Get phrases by type
export function getPhrasesByType(type: 'Defect' | 'Condition') {
  const allPhrases = phrases$.get();
  return Object.values(allPhrases).filter((p) => p.type === type);
}
```

#### Step 3: Create Migration Bridge (Day 2)

Create `app/home/clients/legendState/migrationBridge.ts`:

```typescript
import { observe } from '@legendapp/state';
import { phrases$, phrasesSyncStatus$ } from './phrasesStore';
import { db } from '../Dexie';
import { SyncStatus } from '../Dexie';

// Feature flag to control which store is active
export const USE_LEGEND_STATE_PHRASES = process.env.NEXT_PUBLIC_USE_LEGEND_STATE_PHRASES === 'true';

// Sync Legend-State changes back to Dexie during migration
export function setupMigrationBridge() {
  if (!USE_LEGEND_STATE_PHRASES) return;

  console.log('[Migration] Setting up Legend-State to Dexie bridge for phrases');

  // Watch for changes in Legend-State and mirror to Dexie
  const unsubscribe = observe(phrases$, async ({ changes }) => {
    for (const change of changes) {
      const id = change.path[0] as string;

      try {
        if (change.deleted) {
          // Mark as deleted in Dexie
          const existing = await db.phrases.get(id);
          if (existing) {
            await db.phrases.put({
              ...existing,
              syncStatus: SyncStatus.PendingDelete,
              updatedAt: new Date().toISOString(),
            });
          }
        } else {
          // Update or create in Dexie
          const phrase = phrases$[id].get();
          const syncStatus = phrasesSyncStatus$[id].get();

          await db.phrases.put({
            ...phrase,
            syncStatus:
              syncStatus?.status === 'synced'
                ? SyncStatus.Synced
                : syncStatus?.status === 'failed'
                  ? SyncStatus.Failed
                  : SyncStatus.Queued,
            syncError: syncStatus?.error,
          });
        }
      } catch (error) {
        console.error(`[Migration] Failed to sync phrase ${id} to Dexie:`, error);
      }
    }
  });

  return unsubscribe;
}

// One-time data migration from Dexie to Legend-State
export async function migrateDexieToLegendState() {
  console.log('[Migration] Starting one-time migration from Dexie to Legend-State');

  try {
    // Get all phrases from Dexie
    const dexiePhrases = await db.phrases.toArray();
    console.log(`[Migration] Found ${dexiePhrases.length} phrases in Dexie`);

    // Batch update Legend-State
    const batch: Record<string, any> = {};
    for (const phrase of dexiePhrases) {
      if (phrase.syncStatus !== SyncStatus.PendingDelete) {
        batch[phrase.id] = phrase;
      }
    }

    // Update all at once
    phrases$.set(batch);

    // Set sync status
    for (const phrase of dexiePhrases) {
      if (phrase.syncStatus !== SyncStatus.PendingDelete) {
        phrasesSyncStatus$[phrase.id].set({
          status:
            phrase.syncStatus === SyncStatus.Synced
              ? 'synced'
              : phrase.syncStatus === SyncStatus.Failed
                ? 'failed'
                : 'queued',
          error: phrase.syncError || undefined,
          retryCount: 0,
          lastAttempt: phrase.updatedAt,
        });
      }
    }

    console.log('[Migration] Migration complete');
    return true;
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    return false;
  }
}
```

#### Step 4: Update React Components (Day 3)

Create a wrapper hook in `app/home/clients/legendState/usePhrasesCompat.ts`:

```typescript
import { USE_LEGEND_STATE_PHRASES } from './migrationBridge';
import { usePhrases as useLegendStatePhrases } from './phrasesStore';
import { phraseStore } from '../Database'; // Your existing Dexie store

// Compatibility hook that switches between stores based on feature flag
export function usePhrasesCompat() {
  const legendState = useLegendStatePhrases();
  const dexie = phraseStore.useList();

  if (USE_LEGEND_STATE_PHRASES) {
    // Return Legend-State data in Dexie-compatible format
    return {
      hydrated: legendState.hydrated,
      phrases: legendState.phrases,
      add: legendState.addPhrase,
      update: legendState.updatePhrase,
      remove: legendState.deletePhrase,
      sync: legendState.forceSync,
    };
  } else {
    // Return existing Dexie implementation
    const [hydrated, phrases] = dexie;
    return {
      hydrated,
      phrases,
      add: phraseStore.add,
      update: phraseStore.update,
      remove: phraseStore.remove,
      sync: phraseStore.forceSync,
    };
  }
}
```

### Testing Plan (Day 4-5)

#### 1. Unit Tests

Create `app/home/clients/legendState/tests/phrasesStore.test.ts`:

```typescript
import { phrases$, phrasesSyncStatus$, forceSyncPhrases } from '../phrasesStore';
import { getCurrentTenantId } from '@/app/home/utils/tenant-utils';

jest.mock('@/app/home/utils/tenant-utils');
jest.mock('../AmplifyDataClient');

describe('Legend-State Phrases Store', () => {
  beforeEach(() => {
    phrases$.set({});
    phrasesSyncStatus$.set({});
    (getCurrentTenantId as jest.Mock).mockResolvedValue('test-tenant');
  });

  test('should add phrase optimistically', () => {
    const id = 'test-id';
    phrases$[id].set({
      id,
      name: 'Test Phrase',
      type: 'Defect',
      text: 'Test text',
    });

    expect(phrases$[id].name.get()).toBe('Test Phrase');
  });

  test('should track sync status', async () => {
    const id = 'test-id';
    phrasesSyncStatus$[id].set({
      status: 'queued',
      retryCount: 0,
    });

    expect(phrasesSyncStatus$[id].status.get()).toBe('queued');
  });

  test('should handle offline mode', () => {
    // Test that changes are queued when offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const id = 'offline-test';
    phrases$[id].set({ id, name: 'Offline phrase' });

    // Should be stored locally
    expect(phrases$[id].get()).toBeDefined();
  });
});
```

#### 2. Integration Tests

- Test offline → online transitions
- Test sync with real Amplify sandbox
- Test conflict resolution
- Test performance with 500+ phrases

#### 3. A/B Testing Setup

```typescript
// In your app initialization
import { setupMigrationBridge, migrateDexieToLegendState } from './legendState/migrationBridge';

export async function initializeStores() {
  // Check if user is in test group (10% rollout)
  const userId = await getCurrentUser();
  const isTestGroup = hashUserId(userId) % 100 < 10;

  if (isTestGroup) {
    process.env.NEXT_PUBLIC_USE_LEGEND_STATE_PHRASES = 'true';

    // Perform one-time migration
    const migrated = localStorage.getItem('phrases_migrated_to_legend');
    if (!migrated) {
      await migrateDexieToLegendState();
      localStorage.setItem('phrases_migrated_to_legend', 'true');
    }

    // Setup bridge for safety
    setupMigrationBridge();

    // Start periodic sync
    startPhrasesPeriodicSync();
  }
}
```

### Success Metrics (Day 5)

Track these metrics to validate the POC:

1. **Performance Metrics**

   - Initial load time (should be same or better)
   - Sync time (should be faster due to parallel operations)
   - Bundle size impact (should save ~30KB when Dexie is removed)
   - Memory usage (should be lower)

2. **Reliability Metrics**

   - Sync success rate (target: >99%)
   - Data consistency between clients
   - Offline/online transition success
   - Conflict resolution accuracy

3. **Developer Experience**
   - Lines of code (should be 40% less)
   - Type safety (should be equal or better)
   - Debugging ease (Legend-State DevTools)

## Phase 2: Expand Coverage (Week 2-3)

If POC succeeds, expand to other stores in order of complexity:

### Priority Order

1. **Components** (Week 2) - Similar to Phrases
2. **Elements** (Week 2) - Slightly more complex
3. **Sections** (Week 3) - Has relationships
4. **Images** (Week 3) - Has upload queue
5. **Surveys** (Week 4) - Most complex, do last

### Migration Pattern

For each store:

1. Create Legend-State store following phrases pattern
2. Add migration bridge
3. Create compatibility hook
4. Update components with feature flag
5. Test thoroughly
6. Monitor metrics

## Phase 3: Full Migration (Week 4-5)

Once all stores are migrated and tested:

1. **Remove Dexie** (Week 4)

   - Remove migration bridges
   - Remove compatibility hooks
   - Update all components to use Legend-State directly
   - Remove Dexie dependencies

2. **Optimize** (Week 5)
   - Add real-time updates if needed
   - Optimize sync strategies per store
   - Add advanced features (computed values, etc.)

## Risk Mitigation

### Rollback Plan

1. **Feature flags** - Can disable Legend-State instantly
2. **Data bridge** - Keeps Dexie in sync during migration
3. **Gradual rollout** - Start with 10% of users
4. **Monitoring** - CloudWatch alarms for sync failures

### Safety Checks

- [ ] Both stores stay in sync during migration
- [ ] No data loss during transitions
- [ ] Performance doesn't degrade
- [ ] All tests pass with both stores

## Go/No-Go Decision Points

### After POC (End of Week 1)

**GO if:**

- Sync works reliably (>99% success)
- Performance is same or better
- No data inconsistencies
- Team is comfortable with Legend-State patterns

**NO-GO if:**

- Sync failures >1%
- Performance degradation >10%
- Data inconsistencies found
- Team finds it too complex

### After Phase 2 (End of Week 3)

**GO if:**

- All stores migrated successfully
- A/B test shows positive results
- No increase in user complaints
- Bundle size reduced by >20KB

**NO-GO if:**

- Any store has critical issues
- User complaints increase
- Performance metrics decline

## Implementation Checklist

### Week 1: Phrases POC

- [ ] Install Legend-State dependencies
- [ ] Create phrases Legend-State store
- [ ] Implement migration bridge
- [ ] Add compatibility hook
- [ ] Write unit tests
- [ ] Test offline scenarios
- [ ] Test sync reliability
- [ ] Measure performance metrics
- [ ] Document findings
- [ ] Make Go/No-Go decision

### Week 2-3: Expand (if GO)

- [ ] Migrate Components store
- [ ] Migrate Elements store
- [ ] Migrate Sections store
- [ ] Migrate Images store
- [ ] Update all related components
- [ ] Run integration tests
- [ ] Monitor production metrics
- [ ] Gather team feedback

### Week 4-5: Complete (if GO)

- [ ] Migrate Surveys store
- [ ] Remove Dexie dependencies
- [ ] Remove migration bridges
- [ ] Update all imports
- [ ] Full regression testing
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Team training

## Expected Outcomes

### After POC (Week 1)

- Phrases work with Legend-State
- 40% less code for phrases store
- Sync is more reliable
- Clear path forward validated

### After Full Migration (Week 5)

- 30KB bundle size reduction
- 50% less sync-related code
- Better offline performance
- Improved developer experience
- Foundation for real-time features

## Next Steps

1. **Get team buy-in** on the approach
2. **Set up feature flags** infrastructure
3. **Schedule POC sprint** (1 week)
4. **Begin with Phrases store** implementation
5. **Daily progress checks** during POC
6. **Decision meeting** at end of Week 1

## Questions to Answer During POC

1. How does Legend-State handle 500+ phrases?
2. What's the offline storage limit?
3. How does conflict resolution work in practice?
4. Can we maintain backward compatibility?
5. What's the actual bundle size impact?
6. How hard is debugging with Legend-State?
7. Does TypeScript inference work well?
8. Can we implement soft deletes easily?

## Success Criteria

The migration is successful if:

- ✅ All existing functionality works
- ✅ Sync is more reliable (>99% success rate)
- ✅ Bundle size reduced by >30KB
- ✅ Code is 40% smaller
- ✅ Performance is same or better
- ✅ Team prefers Legend-State
- ✅ Users notice no negative changes

## Legend-State v3 Code Reduction Analysis

### Current Dexie Implementation (~500 lines per store)

- Store definition: ~150 lines
- Sync logic: ~200 lines
- Hook/utility functions: ~100 lines
- Error handling/retry: ~50 lines

### Legend-State v3 Implementation (~200 lines per store)

- Store with built-in sync: ~80 lines
- Hook with v3 improvements: ~50 lines
- Utilities: ~30 lines
- Error handling (built-in): ~40 lines

### Key v3 Features Reducing Code

1. **Direct Observable Rendering**

```typescript
// Old (v2 or React Hook Form)
const [value, setValue] = useState(observable$.get());
useEffect(() => observable$.subscribe(setValue), []);

// v3: Direct rendering
const Component = observer(() => {
  return <div>{observable$}</div>; // Renders directly!
});
```

2. **Two-Way Computed Binding**

```typescript
// v3: Computed that can be written to
const fullName = computed({
  get: () => `${firstName$.get()} ${lastName$.get()}`,
  set: (value) => {
    const [first, last] = value.split(' ');
    firstName$.set(first);
    lastName$.set(last);
  },
});
```

3. **Built-in Retry with Exponential Backoff**

```typescript
// No need for custom retry logic
synced({
  retry: {
    times: 3,
    delay: 1000,
    backoff: 'exponential', // Automatic 1s, 2s, 4s
  },
});
```

4. **Legend Kit Components**

```typescript
// v3: Bindable components for forms
import { Bindable } from '@legendapp/state/react-components';

<Bindable.input $value={phrase$.name} />
// Replaces React Hook Form's register/control
```

5. **Improved TypeScript Inference**

```typescript
// v3: Better type inference
const store$ = observable({
  phrases: {} as Record<string, Phrase>,
  // Types are automatically inferred deeply
});

// Access with full type safety
store$.phrases[id].name; // TypeScript knows this is string
```

### Real Code Reduction Examples

**Sync Queue Management**

```typescript
// Dexie: 150+ lines for queue management
class SyncQueue {
  async addToQueue(item) {
    /* 20 lines */
  }
  async processQueue() {
    /* 50 lines */
  }
  async retryFailed() {
    /* 30 lines */
  }
  async handleConflicts() {
    /* 50 lines */
  }
}

// Legend-State v3: Built-in
synced({
  mode: 'merge',
  retry: { times: 3, backoff: 'exponential' },
  // Queue, retry, conflicts handled automatically
});
```

**Offline Detection**

```typescript
// Dexie: 30+ lines
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);
// Plus state management for offline status

// Legend-State v3: Automatic
synced({
  persist: { retrySync: true },
  // Handles online/offline automatically
});
```

### Bundle Size Impact

- **Remove Dexie**: -50KB
- **Add Legend-State v3**: +20KB
- **Net reduction**: ~30KB

### Developer Experience Improvements

1. **Less Boilerplate**: No manual subscription management
2. **DevTools**: Legend-State DevTools for debugging
3. **Testing**: Simpler mocking with observables
4. **Performance**: Fine-grained reactivity = fewer re-renders

## Conclusion

Legend-State v3 offers approximately **50-60% code reduction** compared to the current Dexie implementation, primarily through:

- Built-in sync and retry mechanisms
- Direct observable rendering
- Automatic offline handling
- Two-way computed bindings
- Better TypeScript inference

This incremental approach minimizes risk while proving value quickly. Starting with Phrases gives us a full end-to-end test without risking critical Survey data. The migration bridge ensures we can roll back instantly if needed.

**Recommended Action**: Start the Phrases POC immediately (1 week effort) to validate the approach with real code and real data. Use Legend-State v3 (@beta) for maximum code reduction.
