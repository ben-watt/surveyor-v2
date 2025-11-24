---
title: "CRDT Integration Plan"
status: planned
category: architecture
created: 2025-09-01
updated: 2025-11-24
tags: [crdt, collaboration, sync]
related: [./minimal-yjs-integration-plan.md, ./legend-state-migration-comparison.md]
priority: low
---

# CRDT Integration Plan for Surveyor V2

## Executive Summary

This document explores integrating Conflict-Free Replicated Data Types (CRDTs) into the Surveyor V2 application to enable true collaborative editing and improved conflict resolution. Based on research of current CRDT libraries and our existing single-table entity design, this plan outlines implementation strategies, benefits, challenges, and recommended approaches.

## Current Architecture Context

Our existing architecture (defined in `single-table-entity-design-v3.md`) uses:

- **Local-first** design with IndexedDB (Dexie)
- **Single-table DynamoDB** design with composite keys
- **Sync queue** mechanism with last-write-wins conflict resolution
- **Strongly-typed TypeScript** entities with template/instance separation

## What are CRDTs?

Conflict-Free Replicated Data Types (CRDTs) are data structures that can be updated concurrently across multiple replicas without requiring coordination between replicas and without conflicts. They guarantee that all replicas will eventually converge to the same state.

### Key CRDT Properties

1. **Commutativity**: Operations can be applied in any order
2. **Associativity**: Grouping of operations doesn't matter
3. **Idempotency**: Applying the same operation multiple times has no additional effect
4. **Eventual Consistency**: All replicas converge to the same state

## CRDT Library Analysis

### 1. json-joy

**Version**: 17.20.0 (actively maintained)
**Language**: TypeScript-native
**Focus**: JSON data structures with collaborative editing

**Pros**:

- Native TypeScript support with comprehensive type definitions
- Fastest list CRDT implementation in JavaScript
- Full JSON implementation as CRDT
- Performance-optimized codecs (CBOR, MessagePack, etc.)
- JSON-like data model fits our entity structure

**Cons**:

- Relatively new library (less battle-tested)
- Smaller community compared to Yjs/Automerge
- Documentation still developing

**Best fit for**: Our JSON-based entity structures, especially for collaborative form editing

### 2. Yjs

**Version**: 13.6.27 (mature, stable)
**Language**: JavaScript with TypeScript support
**Focus**: Collaborative applications with rich text editing

**Pros**:

- Most mature and battle-tested CRDT library
- Excellent performance (fastest CRDT by benchmarks)
- Rich ecosystem with 627+ dependent packages
- Strong editor integrations (ProseMirror, TipTap, Monaco, etc.)
- Proven in production applications (JupyterLab, etc.)
- Network-agnostic (P2P support)

**Cons**:

- Shared types (Y.Map, Y.Array) require migration from plain objects
- Learning curve for existing codebase integration
- Primarily designed for text/rich-content collaboration

**Best fit for**: Rich text fields (notes, recommendations, descriptions)

### 3. Automerge

**Version**: 2.0 (production-ready rewrite)
**Language**: Rust core with JavaScript/TypeScript bindings
**Focus**: JSON-like data structures for local-first apps

**Pros**:

- JSON-like API familiar to JavaScript developers
- Excellent TypeScript support
- WebAssembly performance via Rust core
- Comprehensive change tracking and history
- Strong local-first application focus

**Cons**:

- Performance can be slower than Yjs for large documents
- WebAssembly bundle size considerations
- More complex setup for simple use cases

**Best fit for**: Complex entity relationships and document versioning

### 4. Loro

**Version**: Active development
**Language**: Rust with JavaScript bindings
**Focus**: Rich text with high performance

**Pros**:

- Combines Peritext and Fugue algorithms
- Optimized for rich text style merging
- Low memory footprint
- High performance via generic-btree

**Cons**:

- Less mature than Yjs/Automerge
- Primarily focused on rich text
- Limited TypeScript ecosystem

**Best fit for**: Rich text editing in inspection notes

### 5. Diamond Types

**Language**: Rust with bindings
**Focus**: Plain text editing

**Pros**:

- High performance for plain text
- P2P network support

**Cons**:

- Limited to plain text only
- Less feature-complete than alternatives

**Best fit for**: Simple text fields only

## Integration Strategies

### Strategy 1: Hybrid Approach (Recommended)

Use different CRDT libraries for different data types based on their strengths:

```typescript
// Entity structure with CRDT fields
interface SurveyElement extends BaseEntity {
  // Traditional fields (non-collaborative)
  id: string;
  tenantId: string;
  surveyId: string;
  elementTemplateId: string;

  // CRDT fields for collaborative editing
  notes: YText; // Yjs for rich text
  recommendations: YText; // Yjs for rich text
  defects: YArray<string>; // Yjs for list operations
  photos: YArray<string>; // Yjs for list operations

  // Simple fields that could use json-joy CRDT
  condition: JsonCRDT<'excellent' | 'good' | 'fair' | 'poor' | 'failed'>;
  isInspected: JsonCRDT<boolean>;

  // Metadata (non-collaborative)
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}
```

### Strategy 2: Full json-joy Migration

Migrate entire entity structure to json-joy CRDT:

```typescript
import { Model } from 'json-joy/lib/json-crdt';

interface SurveyElementCRDT {
  // All fields become part of CRDT document
  doc: Model<{
    id: string;
    tenantId: string;
    surveyId: string;
    elementTemplateId: string;
    name: string;
    description?: string;
    order: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
    age?: number;
    remainingLife?: number;
    defects: string[];
    recommendations: string;
    notes?: string;
    photos: string[];
    isInspected: boolean;
    inspectedAt?: string;
    inspectedBy?: string;
  }>;
}
```

### Strategy 3: Yjs-Focused Approach

Use Yjs shared types for all collaborative fields:

```typescript
import { Doc, Map as YMap, Array as YArray, Text as YText } from 'yjs';

class SurveyElementYjs {
  private doc: Doc;
  private yMap: YMap<any>;

  constructor(initialData: SurveyElement) {
    this.doc = new Doc();
    this.yMap = this.doc.getMap('surveyElement');

    // Initialize with existing data
    this.yMap.set('notes', new YText(initialData.notes || ''));
    this.yMap.set('recommendations', new YText(initialData.recommendations || ''));
    this.yMap.set('defects', new YArray());
    this.yMap.set('photos', new YArray());
    this.yMap.set('condition', initialData.condition);
    this.yMap.set('isInspected', initialData.isInspected);
  }

  // Getters and setters for type-safe access
  get notes(): YText {
    return this.yMap.get('notes');
  }
  get recommendations(): YText {
    return this.yMap.get('recommendations');
  }
  get defects(): YArray<string> {
    return this.yMap.get('defects');
  }
  get photos(): YArray<string> {
    return this.yMap.get('photos');
  }

  // Convert to plain object for storage/sync
  toPlainObject(): SurveyElement {
    return {
      // ... other fields
      notes: this.notes.toString(),
      recommendations: this.recommendations.toString(),
      defects: this.defects.toArray(),
      photos: this.photos.toArray(),
      condition: this.yMap.get('condition'),
      isInspected: this.yMap.get('isInspected'),
    };
  }
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

1. **Add CRDT dependencies**

   ```bash
   npm install yjs json-joy
   ```

2. **Create CRDT abstraction layer**

   ```typescript
   // Abstract CRDT interface for different implementations
   interface CRDTDocument<T> {
     getValue(): T;
     update(changes: Partial<T>): void;
     merge(other: CRDTDocument<T>): void;
     getChanges(): Uint8Array;
     applyChanges(changes: Uint8Array): void;
     subscribe(callback: (value: T) => void): () => void;
   }
   ```

3. **Update Dexie schema for CRDT storage**

   ```typescript
   db.version(4).stores({
     // Existing tables
     surveyElements:
       'id, tenantId, surveyId, elementTemplateId, sectionTemplateId, updatedAt, syncStatus, [tenantId+surveyId]',

     // New CRDT data tables
     crdtDocuments: 'id, entityType, entityId, tenantId, docData, updatedAt, syncStatus',
     crdtChanges: '++id, entityId, entityType, changes, timestamp, userId, syncStatus',
   });
   ```

### Phase 2: Core CRDT Integration (Week 3-4)

1. **Implement CRDT document manager**

   ```typescript
   class CRDTDocumentManager {
     private docs = new Map<string, CRDTDocument<any>>();

     async getDocument<T>(entityId: string, entityType: string): Promise<CRDTDocument<T>> {
       const key = `${entityType}:${entityId}`;
       if (!this.docs.has(key)) {
         const doc = await this.loadFromIndexedDB<T>(entityId, entityType);
         this.docs.set(key, doc);
       }
       return this.docs.get(key);
     }

     async syncDocument(entityId: string, entityType: string): Promise<void> {
       const doc = await this.getDocument(entityId, entityType);
       const changes = doc.getChanges();

       // Upload changes to server
       await this.uploadChanges(entityId, entityType, changes);

       // Download and apply remote changes
       const remoteChanges = await this.downloadChanges(entityId, entityType);
       remoteChanges.forEach((change) => doc.applyChanges(change));
     }
   }
   ```

2. **Update sync mechanism for CRDT**

   ```typescript
   // Enhanced sync to handle CRDT operations
   class CRDTSyncEngine extends SyncEngine {
     async syncEntity(entity: BaseEntity): Promise<void> {
       // Sync traditional fields
       await super.syncEntity(entity);

       // Sync CRDT documents
       if (entity.id && this.hasCRDTFields(entity)) {
         await this.crdtManager.syncDocument(entity.id, entity.entityType);
       }
     }

     private hasCRDTFields(entity: BaseEntity): boolean {
       // Check if entity has CRDT-enabled fields
       return ['SurveyElement', 'SurveyComponent', 'Checklist'].includes(entity.entityType);
     }
   }
   ```

### Phase 3: UI Integration (Week 5-6)

1. **Create React hooks for CRDT data**

   ```typescript
   function useCRDTDocument<T>(
     entityId: string,
     entityType: string,
   ): [T | null, (update: Partial<T>) => void] {
     const [value, setValue] = useState<T | null>(null);
     const docRef = useRef<CRDTDocument<T>>();

     useEffect(() => {
       const loadDoc = async () => {
         docRef.current = await crdtManager.getDocument<T>(entityId, entityType);
         setValue(docRef.current.getValue());

         return docRef.current.subscribe((newValue) => {
           setValue(newValue);
         });
       };

       return loadDoc();
     }, [entityId, entityType]);

     const updateValue = useCallback((update: Partial<T>) => {
       if (docRef.current) {
         docRef.current.update(update);
       }
     }, []);

     return [value, updateValue];
   }
   ```

2. **Collaborative editing components**

   ```typescript
   function CollaborativeTextEditor({ entityId, field }: { entityId: string; field: string }) {
     const [yText, setYText] = useState<YText>();
     const editorRef = useRef<Editor>();

     useEffect(() => {
       const doc = crdtManager.getYjsDocument(entityId);
       const text = doc.getText(field);
       setYText(text);

       // Bind to TipTap editor
       if (editorRef.current) {
         editorRef.current.configure({
           extensions: [
             Collaboration.configure({
               document: doc,
             }),
             CollaborationCursor.configure({
               provider: yProviderRef.current,
             }),
           ],
         });
       }
     }, [entityId, field]);

     return <EditorContent editor={editorRef.current} />;
   }
   ```

### Phase 4: Testing & Optimization (Week 7-8)

1. **CRDT conflict resolution testing**
2. **Performance optimization**
3. **Offline/online scenario testing**
4. **Memory usage optimization**

## Benefits of CRDT Integration

### 1. True Collaborative Editing

- Multiple users can edit the same survey simultaneously
- Real-time updates without conflicts
- Collaborative rich text editing in notes and recommendations

### 2. Better Conflict Resolution

- Automatic merging of concurrent changes
- No more "last write wins" data loss
- Semantic conflict resolution for different field types

### 3. Enhanced Offline Support

- Changes merge seamlessly when coming back online
- No need for complex conflict resolution UI
- Better user experience during network interruptions

### 4. Improved User Experience

- Real-time collaboration indicators
- Presence awareness (see who's editing what)
- Undo/redo across collaborative sessions

### 5. Data Integrity

- Guaranteed convergence of all replicas
- No lost updates from concurrent modifications
- Better audit trail with change attribution

## Challenges and Considerations

### 1. Performance Impact

- **Memory overhead**: CRDT documents require additional memory for operation history
- **Network traffic**: More frequent synchronization of fine-grained changes
- **Processing cost**: Merging operations can be computationally expensive

**Mitigation**:

- Implement document compaction/pruning strategies
- Use efficient binary encodings (CBOR, MessagePack)
- Batch operations and use debouncing for network sync

### 2. Storage Complexity

- **IndexedDB schema changes**: Additional tables for CRDT documents and operations
- **Backup/restore**: Need to preserve CRDT operation history
- **Migration**: Complex migration from existing data structure

**Mitigation**:

- Gradual migration strategy with fallback to traditional sync
- Implement CRDT document compaction
- Separate CRDT storage from traditional entity storage

### 3. Learning Curve

- **Developer complexity**: Team needs to understand CRDT concepts
- **Debugging**: More complex debugging with distributed state
- **Testing**: Need for sophisticated conflict testing scenarios

**Mitigation**:

- Comprehensive documentation and training
- Abstract CRDT complexity behind simple APIs
- Automated testing for common conflict scenarios

### 4. Library Dependencies

- **Bundle size**: Additional JavaScript/WebAssembly dependencies
- **Maintenance**: Keeping up with CRDT library updates
- **Vendor lock-in**: Dependency on specific CRDT implementations

**Mitigation**:

- Use tree-shaking and code splitting
- Abstract behind interfaces to allow library switching
- Contribute to open-source CRDT ecosystem

### 5. Type Safety Challenges

- **CRDT type integration**: Maintaining TypeScript safety with CRDT operations
- **Serialization**: Type-safe conversion between CRDT and plain objects
- **Schema evolution**: Handling entity schema changes in CRDT documents

**Mitigation**:

- Strong typing abstractions for CRDT operations
- Automated type generation for CRDT schemas
- Version-aware CRDT document handling

## Recommended Approach

### Phase 1: Start with Hybrid Strategy

1. **Begin with rich text fields** using Yjs for maximum benefit:

   - Survey element notes
   - Recommendations
   - Checklist item descriptions

2. **Use json-joy for simple collaborative fields**:

   - Checkbox states
   - Condition selections
   - Simple string arrays (defects, photos)

3. **Keep traditional sync for complex relationships**:
   - Entity relationships
   - Template references
   - Audit metadata

### Phase 2: Gradual Expansion

1. **Add collaborative lists** (defects, photos) using Yjs arrays
2. **Implement presence indicators** showing who's editing what
3. **Add collaborative forms** for property details

### Phase 3: Advanced Features

1. **Real-time cursors** in text editors
2. **Conflict-free undo/redo** across sessions
3. **Branching/merging** for survey versions

## Alternative Approaches

### 1. Operational Transformation (OT)

Instead of CRDTs, use OT libraries like ShareJS:

**Pros**: More mature ecosystem, better performance for text
**Cons**: Requires central server, more complex conflict resolution

### 2. Event Sourcing with CRDTs

Combine event sourcing with CRDT state:

**Pros**: Complete audit trail, time-travel debugging
**Cons**: More complex implementation, higher storage requirements

### 3. Custom Merge Strategies

Implement domain-specific merge logic:

**Pros**: Tailored to surveyor workflow, simpler implementation
**Cons**: Limited to specific use cases, requires manual conflict resolution

## Conclusion

Integrating CRDTs into Surveyor V2 offers significant benefits for collaborative editing and conflict resolution, particularly valuable for multi-user survey scenarios. The recommended hybrid approach allows gradual adoption while minimizing risks and maximizing benefits.

**Key Recommendations**:

1. Start with **Yjs for rich text fields** (notes, recommendations)
2. Use **json-joy for simple collaborative data** (conditions, checklists)
3. Implement **gradual migration strategy** with fallback support
4. Focus on **developer experience** with strong abstractions
5. Plan for **performance optimization** from the beginning

The investment in CRDT integration will pay dividends in user experience, data integrity, and collaborative capabilities, positioning Surveyor V2 as a leading collaborative inspection platform.
