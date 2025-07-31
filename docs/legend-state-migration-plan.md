# Legend State Migration Plan

## Overview

This document outlines the migration strategy from our custom Dexie-based sync engine to Legend State, followed by entity table consolidation. The migration prioritizes risk management through incremental phases.

## Current Architecture

### Custom Sync Engine
- **Location**: `app/home/clients/Dexie.ts` (lines 94-517)
- **Features**: Manual sync logic with queued/failed/synced states, 30-second periodic sync, optimistic updates, multi-tenant isolation
- **Complexity**: ~400 lines of custom sync logic

### Data Stores
- **Survey Store**: Complex JSON content with auto-save
- **Entity Stores**: Sections, Elements, Components, Phrases (simple CRUD)
- **Document Store**: Versioning system with S3 content storage
- **Image Store**: Progressive upload queue

## Migration Strategy: Legend State First, Then Entity Consolidation

### Why This Order?
1. **Risk Management**: Validate Legend State with existing structure before data model changes
2. **Incremental Validation**: Prove sync engine works with AWS Amplify backend
3. **Easier Rollback**: Can revert sync changes without affecting data model
4. **Learning Curve**: Master Legend State patterns before tackling hierarchy complexity

## Phase 1: Sections Store Migration (Week 1-2)

**Goal**: Prove Legend State integration with simplest store

### Current Implementation
```typescript
// app/home/clients/Database.ts:238-274
export const sectionStore = CreateDexieHooks<Section, CreateSection, UpdateSection>(
  db, "sections", {
    list: async () => client.models.Sections.list(),
    create: async (data) => client.models.Sections.create(await withTenantId(data)),
    update: async (data) => client.models.Sections.update(await withTenantId(data)),
    delete: async (id) => client.models.Sections.delete({ id, tenantId })
  }
);
```

### Legend State Implementation
```typescript
// app/home/clients/SectionStore.ts (NEW FILE)
import { observable } from '@legendapp/state';
import { syncedCrud } from '@legendapp/state/sync-plugins/crud';
import { ObservablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb';
import { withTenantId, getCurrentTenantId } from '@/app/home/utils/tenant-utils';
import client from './AmplifyDataClient';

export const sections$ = observable(syncedCrud({
  list: async () => {
    const response = await client.models.Sections.list();
    if (response.errors) {
      throw new Error(response.errors.map(e => e.message).join(", "));
    }
    return response.data.map(item => ({
      id: item.id,
      name: item.name,
      order: item.order || 0,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
      tenantId: item.tenantId,
    }));
  },
  
  create: async (data) => {
    const serverData = await withTenantId(data);
    const response = await client.models.Sections.create(serverData);
    if (response.errors) {
      throw new Error(response.errors.map(e => e.message).join(", "));
    }
    return {
      id: response.data.id,
      name: response.data.name,
      order: response.data.order || 0,
      updatedAt: response.data.updatedAt,
      createdAt: response.data.createdAt,
      tenantId: response.data.tenantId,
    };
  },
  
  update: async (data) => {
    const serverData = await withTenantId(data);
    const response = await client.models.Sections.update(serverData);
    if (response.errors) {
      throw new Error(response.errors.map(e => e.message).join(", "));
    }
    return {
      id: response.data.id,
      name: response.data.name,
      order: response.data.order || 0,
      updatedAt: response.data.updatedAt,
      createdAt: response.data.createdAt,
      tenantId: response.data.tenantId,
    };
  },
  
  delete: async (id) => {
    const tenantId = await getCurrentTenantId();
    const response = await client.models.Sections.delete({ id, tenantId: tenantId || "" });
    if (response.errors) {
      throw new Error(response.errors.map(e => e.message).join(", "));
    }
  },
  
  persist: {
    plugin: ObservablePersistIndexedDB,
    name: 'sections',
    retrySync: true
  },
  
  retry: {
    infinite: true,
    backoff: 'exponential',
    maxDelay: 30000
  },
  
  debounceSet: 2000,
  changesSince: 'last-sync',
  fieldUpdatedAt: 'updatedAt'
}));

// React hooks for backward compatibility
export const useSections = () => {
  return sections$.use();
};

export const useSection = (id: string) => {
  return sections$[id].use();
};
```

### Migration Checklist
- [ ] Install Legend State dependencies
- [ ] Create new SectionStore.ts
- [ ] Add feature flag for new vs old store
- [ ] Update components to use new hooks
- [ ] Test offline sync behavior
- [ ] Test multi-tenant isolation
- [ ] Validate error handling
- [ ] Performance testing
- [ ] Remove old section store code

## Phase 2: Remaining Entity Stores (Week 3-4)

Apply the same pattern to:
- **Elements Store** (`app/home/clients/Database.ts:185-223`)
- **Components Store** (`app/home/clients/Database.ts:130-168`)
- **Phrases Store** (`app/home/clients/Database.ts:295-329`)

### Template Pattern
```typescript
// app/home/clients/{Entity}Store.ts
export const {entities}$ = observable(syncedCrud({
  // Same pattern as sections but with entity-specific fields
  list: async () => { /* ... */ },
  create: async (data) => { /* ... */ },
  update: async (data) => { /* ... */ },
  delete: async (id) => { /* ... */ },
  persist: { name: '{entities}', retrySync: true },
  retry: { infinite: true },
  debounceSet: 2000,
  changesSince: 'last-sync',
  fieldUpdatedAt: 'updatedAt'
}));
```

## Phase 3: Entity Consolidation Design (Week 5-6)

### Unified Entity Model
```typescript
// types/Entity.ts
export interface Entity {
  id: string;
  type: 'section' | 'element' | 'component' | 'phrase';
  parentId?: string; // For hierarchical relationships
  name: string;
  order?: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  
  // Type-specific data as discriminated union
  data: SectionData | ElementData | ComponentData | PhraseData;
}

export interface SectionData {
  type: 'section';
}

export interface ElementData {
  type: 'element';
  sectionId: string;
  description?: string;
}

export interface ComponentData {
  type: 'component';
  elementId: string;
  materials?: string[];
}

export interface PhraseData {
  type: 'phrase';
  phraseType: string;
  phrase: string;
  phraseLevel2?: string;
  owner?: string;
  associatedMaterialIds?: string[];
  associatedElementIds?: string[];
  associatedComponentIds?: string[];
}
```

### Amplify Schema Changes
```typescript
// amplify/data/resource.ts
const schema = a.schema({
  // Replace Sections, Elements, Components, Phrases with:
  Entities: a
    .model({
      id: a.id().required(),
      type: a.enum(['section', 'element', 'component', 'phrase']),
      parentId: a.id(),
      name: a.string().required(),
      order: a.integer(),
      data: a.json().required(), // Type-specific data
      tenantId: a.string().required(),
    })
    .authorization(allow => [
      allow.group("global-admin"),
      allow.groupsDefinedIn("tenantId")
    ])
    .secondaryIndexes(index => [
      index("tenantId").sortKeys(["type", "order"]),
      index("parentId")
    ]),
  
  // Keep existing models during transition
  // ... existing Sections, Elements, Components, Phrases
});
```

## Phase 4: Unified Entity Store (Week 7-8)

```typescript
// app/home/clients/EntityStore.ts
export const entities$ = observable(syncedCrud({
  list: async () => {
    const response = await client.models.Entities.list();
    if (response.errors) {
      throw new Error(response.errors.map(e => e.message).join(", "));
    }
    return response.data;
  },
  
  create: async (data) => {
    const serverData = await withTenantId(data);
    const response = await client.models.Entities.create(serverData);
    if (response.errors) {
      throw new Error(response.errors.map(e => e.message).join(", "));
    }
    return response.data;
  },
  
  update: async (data) => {
    const serverData = await withTenantId(data);
    const response = await client.models.Entities.update(serverData);
    if (response.errors) {
      throw new Error(response.errors.map(e => e.message).join(", "));
    }
    return response.data;
  },
  
  delete: async (id) => {
    const tenantId = await getCurrentTenantId();
    const response = await client.models.Entities.delete({ id, tenantId: tenantId || "" });
    if (response.errors) {
      throw new Error(response.errors.map(e => e.message).join(", "));
    }
  },
  
  persist: {
    plugin: ObservablePersistIndexedDB,
    name: 'entities',
    retrySync: true
  },
  
  retry: { infinite: true },
  debounceSet: 2000,
  changesSince: 'last-sync',
  fieldUpdatedAt: 'updatedAt'
}));

// Computed observables for type-specific access
export const sections$ = computed(() => 
  entities$.get()?.filter(e => e.type === 'section')
    .sort((a, b) => (a.order || 0) - (b.order || 0)) ?? []
);

export const elements$ = computed(() => 
  entities$.get()?.filter(e => e.type === 'element')
    .sort((a, b) => (a.order || 0) - (b.order || 0)) ?? []
);

export const components$ = computed(() => 
  entities$.get()?.filter(e => e.type === 'component') ?? []
);

export const phrases$ = computed(() => 
  entities$.get()?.filter(e => e.type === 'phrase') ?? []
);

// Hierarchical queries
export const getElementsForSection = (sectionId: string) => 
  computed(() => 
    entities$.get()?.filter(e => 
      e.type === 'element' && e.parentId === sectionId
    ).sort((a, b) => (a.order || 0) - (b.order || 0)) ?? []
  );

export const getComponentsForElement = (elementId: string) => 
  computed(() => 
    entities$.get()?.filter(e => 
      e.type === 'component' && e.parentId === elementId
    ) ?? []
  );
```

## Dependencies

### Legend State Installation
```bash
npm install @legendapp/state
npm install @legendapp/state-react  # For React integration
npm install @legendapp/state-persist-plugins-indexeddb  # For IndexedDB persistence
```

### Required Peer Dependencies
```bash
npm install indexeddb  # For IndexedDB persistence plugin
```

## Risk Mitigation

### Feature Flags
```typescript
// app/home/utils/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_LEGEND_STATE_SECTIONS: process.env.NODE_ENV === 'development',
  USE_LEGEND_STATE_ELEMENTS: false,
  USE_LEGEND_STATE_COMPONENTS: false,
  USE_LEGEND_STATE_PHRASES: false,
  USE_UNIFIED_ENTITIES: false,
} as const;
```

### Parallel Testing
- Run both sync engines simultaneously during development
- Compare data consistency between approaches
- Performance benchmarking with realistic data loads

### Rollback Strategy
1. **Phase 1-2 Rollback**: Revert to original Dexie stores via feature flags
2. **Phase 3-4 Rollback**: Keep separate entity tables, disable unified model
3. **Data Migration**: Scripts to convert between data formats if needed

## Future Considerations

### Advanced Legend State Features
- **Real-time Updates**: Consider `subscribe` functions for live data
- **Optimistic Updates**: Built-in optimistic UI updates
- **Conflict Resolution**: Automatic handling of concurrent modifications
- **Diff Syncing**: `changesSince: 'last-sync'` for bandwidth optimization

### Complex Store Migration (Later Phases)
- **Survey Store**: Complex JSON content with auto-save patterns
- **Document Store**: Versioning system may need custom sync logic  
- **Image Store**: Upload queue requires specialized handling

## Success Metrics

### Performance
- Sync latency < 2 seconds for typical operations
- Memory usage reduction from fine-grained reactivity
- Bundle size impact assessment

### Reliability
- Zero data loss during migration
- Offline sync reliability > 99%
- Multi-tenant data isolation maintained

### Developer Experience
- Reduced sync-related bug reports
- Faster feature development for data operations
- Improved debugging with Legend State dev tools

## Timeline Summary

| Phase | Duration | Scope | Risk Level |
|-------|----------|-------|------------|
| 1 | Week 1-2 | Sections store migration | Low |
| 2 | Week 3-4 | Elements, Components, Phrases migration | Medium |
| 3 | Week 5-6 | Entity consolidation design | Medium |
| 4 | Week 7-8 | Unified entity implementation | High |

**Total Duration**: 8 weeks  
**Milestone Reviews**: End of each phase  
**Go/No-Go Decisions**: After Phases 1 and 2