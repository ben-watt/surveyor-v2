# Minimal Yjs Integration Plan - Text Fields Only

## Overview

This plan outlines a minimal, low-risk integration of Yjs CRDTs into Surveyor V2, focusing exclusively on collaborative text editing. The approach enables real-time collaborative editing for text fields while preserving all existing functionality and maintaining backward compatibility.

## Executive Summary

**Goal**: Enable collaborative editing for text fields (notes, recommendations) without disrupting existing architecture

**Approach**:

- Add one new table for Yjs text documents
- Create simple abstraction layer for collaborative text
- Gradual rollout with feature flags
- Zero changes to existing entity structure

**Timeline**: 5 weeks for full implementation
**Risk Level**: Very Low (existing functionality unchanged)

## Phase 1: Foundation Setup (Week 1)

### 1.1 Dependencies

```bash
npm install yjs y-websocket
npm install --save-dev @types/yjs
```

### 1.2 Database Schema Extension

Add one new table to existing Dexie schema:

```typescript
// Update app/home/clients/Dexie.ts
db.version(4).stores({
  // All existing tables remain unchanged
  surveyElements:
    'id, tenantId, surveyId, elementTemplateId, sectionTemplateId, updatedAt, syncStatus, [tenantId+surveyId]',
  surveyComponents:
    'id, tenantId, surveyId, surveyElementId, componentTemplateId, updatedAt, syncStatus, [tenantId+surveyId]',
  // ... other existing tables

  // NEW: Single table for collaborative text fields
  yjsTextFields:
    'id, entityId, entityType, fieldName, tenantId, yjsState, currentText, updatedAt, syncStatus, [tenantId+entityId+fieldName]',
});

interface YjsTextField {
  id: string; // Format: "entityType:entityId:fieldName"
  entityId: string; // Reference to parent entity (e.g., surveyElement.id)
  entityType: string; // "SurveyElement", "SurveyComponent", etc.
  fieldName: string; // "notes", "recommendations", etc.
  tenantId: string;
  yjsState: Uint8Array; // Binary Yjs document state
  currentText: string; // Computed text value for queries/display
  updatedAt: string;
  syncStatus: SyncStatus; // Reuse existing sync status enum
}
```

### 1.3 Core Text Field Manager

Create `app/home/clients/yjsTextFieldManager.ts`:

```typescript
import * as Y from 'yjs';
import { db } from './Dexie';
import { SyncStatus } from './Dexie';
import { getCurrentTenantId, getCurrentUserId } from '../utils/tenant-utils';
import { surveyElementStore } from './surveyStore';

class YjsTextFieldManager {
  private docs = new Map<string, Y.Doc>();
  private saveTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Get or create a collaborative text document for a specific field
   */
  async getTextDocument(entityId: string, entityType: string, fieldName: string): Promise<Y.Text> {
    const key = `${entityType}:${entityId}:${fieldName}`;

    if (!this.docs.has(key)) {
      const doc = new Y.Doc();

      // Load existing state from IndexedDB
      const existing = await db.yjsTextFields.where({ entityId, entityType, fieldName }).first();

      if (existing?.yjsState) {
        Y.applyUpdate(doc, existing.yjsState);
      }

      // Set up auto-save on changes
      doc.on('update', (update: Uint8Array) => {
        this.debouncedSave(entityId, entityType, fieldName, doc);
      });

      this.docs.set(key, doc);
    }

    return this.docs.get(key)!.getText(fieldName);
  }

  /**
   * Debounced save to prevent excessive writes
   */
  private debouncedSave(entityId: string, entityType: string, fieldName: string, doc: Y.Doc) {
    const key = `${entityType}:${entityId}:${fieldName}`;

    // Clear existing timeout
    if (this.saveTimeouts.has(key)) {
      clearTimeout(this.saveTimeouts.get(key)!);
    }

    // Set new timeout
    this.saveTimeouts.set(
      key,
      setTimeout(() => {
        this.saveUpdate(entityId, entityType, fieldName, doc);
        this.saveTimeouts.delete(key);
      }, 1000),
    ); // 1 second debounce
  }

  /**
   * Save Yjs document state to IndexedDB and update main entity
   */
  private async saveUpdate(entityId: string, entityType: string, fieldName: string, doc: Y.Doc) {
    try {
      const currentText = doc.getText(fieldName).toString();
      const tenantId = await getCurrentTenantId();

      if (!tenantId) {
        console.warn('No tenant ID available, skipping Yjs save');
        return;
      }

      const yjsFieldRecord: YjsTextField = {
        id: `${entityType}:${entityId}:${fieldName}`,
        entityId,
        entityType,
        fieldName,
        tenantId,
        yjsState: Y.encodeStateAsUpdate(doc),
        currentText,
        updatedAt: new Date().toISOString(),
        syncStatus: SyncStatus.Queued,
      };

      // Save to yjsTextFields table
      await db.yjsTextFields.put(yjsFieldRecord);

      // Update the computed field in the main entity
      await this.updateMainEntityField(entityId, entityType, fieldName, currentText);
    } catch (error) {
      console.error('Error saving Yjs update:', error);
    }
  }

  /**
   * Update the computed text field in the main entity for queries/display
   */
  private async updateMainEntityField(
    entityId: string,
    entityType: string,
    fieldName: string,
    text: string,
  ) {
    try {
      if (entityType === 'SurveyElement') {
        await surveyElementStore.update(entityId, (draft) => {
          (draft as any)[fieldName] = text;
          draft.updatedAt = new Date().toISOString();
        });
      }
      // Add other entity types as needed:
      // else if (entityType === 'SurveyComponent') { ... }
    } catch (error) {
      console.error('Error updating main entity field:', error);
    }
  }

  /**
   * Clean up document from memory (call when component unmounts)
   */
  cleanup(entityId: string, entityType: string, fieldName: string) {
    const key = `${entityType}:${entityId}:${fieldName}`;

    // Clear any pending saves
    if (this.saveTimeouts.has(key)) {
      clearTimeout(this.saveTimeouts.get(key)!);
      this.saveTimeouts.delete(key);
    }

    // Remove from memory
    this.docs.delete(key);
  }
}

export const yjsTextManager = new YjsTextFieldManager();
```

### 1.4 Feature Flag Configuration

Create `app/home/utils/collaborativeFeatures.ts`:

```typescript
// Configuration for which fields support collaboration
export const COLLABORATIVE_FIELDS = {
  SurveyElement: ['notes'], // Start with just notes field
  // SurveyComponent: ['recommendations'], // Add later
  // Checklist: ['description'], // Add later
} as const;

export type CollaborativeEntityType = keyof typeof COLLABORATIVE_FIELDS;
export type CollaborativeFieldName<T extends CollaborativeEntityType> =
  (typeof COLLABORATIVE_FIELDS)[T][number];

/**
 * Check if a field supports collaboration
 */
export function isCollaborativeField(entityType: string, fieldName: string): boolean {
  const fields = COLLABORATIVE_FIELDS[entityType as CollaborativeEntityType];
  return fields?.includes(fieldName as any) ?? false;
}

/**
 * Feature flag to enable/disable collaboration globally
 */
export const COLLABORATION_ENABLED =
  process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_COLLABORATION === 'true';
```

## Phase 2: React Integration (Week 2)

### 2.1 Collaborative Text Hook

Create `app/home/hooks/useCollaborativeText.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { yjsTextManager } from '../clients/yjsTextFieldManager';
import { isCollaborativeField, COLLABORATION_ENABLED } from '../utils/collaborativeFeatures';

export function useCollaborativeText(
  entityId: string,
  entityType: string,
  fieldName: string,
  fallbackValue: string = '',
): [string, (text: string) => void, Y.Text | null, boolean] {
  const [text, setText] = useState(fallbackValue);
  const [yText, setYText] = useState<Y.Text | null>(null);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const observerRef = useRef<() => void>();

  useEffect(() => {
    const shouldUseCollaboration =
      COLLABORATION_ENABLED && isCollaborativeField(entityType, fieldName);

    setIsCollaborative(shouldUseCollaboration);

    if (!shouldUseCollaboration) {
      setText(fallbackValue);
      return;
    }

    const initCollaborativeText = async () => {
      try {
        const yTextDoc = await yjsTextManager.getTextDocument(entityId, entityType, fieldName);
        setYText(yTextDoc);
        setText(yTextDoc.toString() || fallbackValue);

        // Observe changes from other users
        const observer = () => {
          setText(yTextDoc.toString());
        };

        yTextDoc.observe(observer);
        observerRef.current = () => yTextDoc.unobserve(observer);
      } catch (error) {
        console.error('Error initializing collaborative text:', error);
        // Fall back to regular text
        setText(fallbackValue);
        setIsCollaborative(false);
      }
    };

    initCollaborativeText();

    // Cleanup on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current();
      }
      if (shouldUseCollaboration) {
        yjsTextManager.cleanup(entityId, entityType, fieldName);
      }
    };
  }, [entityId, entityType, fieldName, fallbackValue]);

  const updateText = useCallback(
    (newText: string) => {
      if (isCollaborative && yText) {
        // Update via Yjs (collaborative)
        yText.delete(0, yText.length);
        yText.insert(0, newText);
      } else {
        // Update via regular state (fallback)
        setText(newText);
        // Note: Non-collaborative updates should be handled by the component
        // using existing store methods
      }
    },
    [isCollaborative, yText],
  );

  return [text, updateText, yText, isCollaborative];
}
```

### 2.2 Enhanced Text Components

Create `app/home/components/CollaborativeTextarea.tsx`:

```typescript
import React from 'react'
import { useCollaborativeText } from '../hooks/useCollaborativeText'

interface CollaborativeTextareaProps {
  entityId: string
  entityType: string
  fieldName: string
  placeholder?: string
  fallbackValue?: string
  onNonCollaborativeChange?: (value: string) => void
  className?: string
  rows?: number
}

export function CollaborativeTextarea({
  entityId,
  entityType,
  fieldName,
  placeholder,
  fallbackValue = '',
  onNonCollaborativeChange,
  className,
  rows = 4
}: CollaborativeTextareaProps) {
  const [text, updateText, yText, isCollaborative] = useCollaborativeText(
    entityId,
    entityType,
    fieldName,
    fallbackValue
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value

    if (isCollaborative) {
      updateText(newValue)
    } else {
      // Fall back to prop-based change handler
      onNonCollaborativeChange?.(newValue)
    }
  }

  return (
    <div className="relative">
      <textarea
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${className} ${isCollaborative ? 'border-blue-300' : 'border-gray-300'}`}
        rows={rows}
      />
      {isCollaborative && (
        <div className="absolute top-1 right-1 text-xs text-blue-500 bg-blue-50 px-1 rounded">
          Collaborative
        </div>
      )}
    </div>
  )
}
```

### 2.3 Component Updates

Update existing components to use collaborative text:

```typescript
// Update app/home/components/SurveyElementForm.tsx
import { CollaborativeTextarea } from './CollaborativeTextarea'

function SurveyElementForm({ surveyElement }: { surveyElement: SurveyElement }) {
  // Existing non-collaborative fields remain unchanged
  const [condition, setCondition] = useState(surveyElement.condition)
  const [age, setAge] = useState(surveyElement.age)

  const handleNonCollaborativeNotesChange = (notes: string) => {
    // Fallback for when collaboration is disabled
    surveyElementStore.update(surveyElement.id, { notes })
  }

  return (
    <form className="space-y-4">
      {/* Existing fields work exactly the same */}
      <div>
        <label>Condition</label>
        <select
          value={condition}
          onChange={e => {
            setCondition(e.target.value as any)
            surveyElementStore.update(surveyElement.id, {
              condition: e.target.value as any
            })
          }}
        >
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
      </div>

      <div>
        <label>Age</label>
        <input
          type="number"
          value={age || ''}
          onChange={e => {
            const newAge = Number(e.target.value)
            setAge(newAge)
            surveyElementStore.update(surveyElement.id, { age: newAge })
          }}
        />
      </div>

      {/* NEW: Collaborative notes field */}
      <div>
        <label>Notes</label>
        <CollaborativeTextarea
          entityId={surveyElement.id}
          entityType="SurveyElement"
          fieldName="notes"
          fallbackValue={surveyElement.notes || ''}
          onNonCollaborativeChange={handleNonCollaborativeNotesChange}
          placeholder="Enter inspection notes..."
          className="w-full p-2 border rounded"
          rows={4}
        />
      </div>

      {/* Other existing fields... */}
    </form>
  )
}
```

## Phase 3: Backend Integration (Week 3)

### 3.1 Amplify Schema Extension

Update `amplify/data/resource.ts`:

```typescript
export const data = defineData({
  schema: a.schema({
    // All existing models remain unchanged
    SurveyElement: a.model({
      id: a.id().required(),
      tenantId: a.string().required(),
      // ... all existing fields stay the same
      notes: a.string(),
      recommendations: a.string(),
    }),

    // NEW: Simple model for collaborative text fields
    YjsTextField: a
      .model({
        id: a.id().required(),
        entityId: a.string().required(),
        entityType: a.string().required(),
        fieldName: a.string().required(),
        tenantId: a.string().required(),
        yjsState: a.string().required(), // Base64 encoded binary data
        currentText: a.string(),
        updatedAt: a.datetime().required(),
      })
      .authorization((allow) => [
        allow.group('global-admin'),
        allow.ownerDefinedIn('tenantId').to(['create', 'read', 'update', 'delete']),
      ]),
  }),
});
```

### 3.2 Enhanced Sync Engine

Update `app/home/clients/sync.ts`:

```typescript
// Extend existing sync engine to handle Yjs text fields
class EnhancedSyncEngine extends SyncEngine {
  async syncEntity(entity: BaseEntity): Promise<void> {
    // 1. Sync the main entity using existing logic
    await super.syncEntity(entity);

    // 2. Sync any collaborative text fields for this entity
    if (COLLABORATION_ENABLED) {
      await this.syncYjsTextFields(entity.id, entity.entityType);
    }
  }

  private async syncYjsTextFields(entityId: string, entityType: string): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;

      // Get all unsync'd Yjs text fields for this entity
      const pendingFields = await db.yjsTextFields
        .where({ entityId, entityType, tenantId })
        .and((field) => field.syncStatus === SyncStatus.Queued)
        .toArray();

      for (const field of pendingFields) {
        await this.syncSingleYjsTextField(field);
      }
    } catch (error) {
      console.error('Error syncing Yjs text fields:', error);
    }
  }

  private async syncSingleYjsTextField(field: YjsTextField): Promise<void> {
    try {
      // Convert binary to base64 for GraphQL
      const yjsStateBase64 = btoa(String.fromCharCode(...field.yjsState));

      const response = await client.models.YjsTextField.create({
        id: field.id,
        entityId: field.entityId,
        entityType: field.entityType,
        fieldName: field.fieldName,
        tenantId: field.tenantId,
        yjsState: yjsStateBase64,
        currentText: field.currentText,
        updatedAt: field.updatedAt,
      });

      if (response.errors) {
        // Mark as failed
        await db.yjsTextFields.update(field.id, {
          syncStatus: SyncStatus.Failed,
          syncError: response.errors.map((e) => e.message).join(', '),
        });
      } else {
        // Mark as synced
        await db.yjsTextFields.update(field.id, {
          syncStatus: SyncStatus.Synced,
          syncError: undefined,
        });
      }
    } catch (error) {
      console.error('Error syncing Yjs text field:', error);
      await db.yjsTextFields.update(field.id, {
        syncStatus: SyncStatus.Failed,
        syncError: error.message,
      });
    }
  }

  async downloadYjsTextFields(entityId: string, entityType: string): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;

      const response = await client.models.YjsTextField.list({
        filter: {
          and: [
            { entityId: { eq: entityId } },
            { entityType: { eq: entityType } },
            { tenantId: { eq: tenantId } },
          ],
        },
      });

      if (response.errors) {
        console.error('Error downloading Yjs text fields:', response.errors);
        return;
      }

      for (const remoteField of response.data) {
        // Convert base64 back to binary
        const yjsState = new Uint8Array(
          atob(remoteField.yjsState)
            .split('')
            .map((c) => c.charCodeAt(0)),
        );

        await db.yjsTextFields.put({
          id: remoteField.id,
          entityId: remoteField.entityId,
          entityType: remoteField.entityType,
          fieldName: remoteField.fieldName,
          tenantId: remoteField.tenantId,
          yjsState,
          currentText: remoteField.currentText || '',
          updatedAt: remoteField.updatedAt,
          syncStatus: SyncStatus.Synced,
        });
      }
    } catch (error) {
      console.error('Error downloading Yjs text fields:', error);
    }
  }
}

// Replace existing sync engine
export const syncEngine = new EnhancedSyncEngine();
```

## Phase 4: Testing & Rollout (Week 4)

### 4.1 Unit Tests

Create `tests/yjsTextFieldManager.test.ts`:

```typescript
import { yjsTextManager } from '../app/home/clients/yjsTextFieldManager';
import { db } from '../app/home/clients/Dexie';

describe('YjsTextFieldManager', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  test('creates new text document', async () => {
    const yText = await yjsTextManager.getTextDocument('test-id', 'SurveyElement', 'notes');
    expect(yText.toString()).toBe('');
  });

  test('preserves text content', async () => {
    const yText1 = await yjsTextManager.getTextDocument('test-id', 'SurveyElement', 'notes');
    yText1.insert(0, 'Test content');

    // Simulate page reload by getting the document again
    const yText2 = await yjsTextManager.getTextDocument('test-id', 'SurveyElement', 'notes');
    expect(yText2.toString()).toBe('Test content');
  });

  test('handles concurrent edits', async () => {
    const yText1 = await yjsTextManager.getTextDocument('test-id', 'SurveyElement', 'notes');
    const yText2 = await yjsTextManager.getTextDocument('test-id', 'SurveyElement', 'notes');

    yText1.insert(0, 'Hello ');
    yText2.insert(6, 'World');

    expect(yText1.toString()).toBe('Hello World');
    expect(yText2.toString()).toBe('Hello World');
  });
});
```

### 4.2 Integration Tests

Create `tests/integration/collaborative-editing.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CollaborativeTextarea } from '../app/home/components/CollaborativeTextarea'

describe('Collaborative Editing Integration', () => {
  test('falls back to non-collaborative mode when disabled', async () => {
    const handleChange = jest.fn()

    render(
      <CollaborativeTextarea
        entityId="test-id"
        entityType="SurveyElement"
        fieldName="notes"
        fallbackValue="Initial text"
        onNonCollaborativeChange={handleChange}
      />
    )

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Updated text' } })

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith('Updated text')
    })
  })

  test('shows collaborative indicator when enabled', async () => {
    // Mock collaboration enabled
    process.env.NEXT_PUBLIC_ENABLE_COLLABORATION = 'true'

    render(
      <CollaborativeTextarea
        entityId="test-id"
        entityType="SurveyElement"
        fieldName="notes"
        fallbackValue="Initial text"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Collaborative')).toBeInTheDocument()
    })
  })
})
```

### 4.3 Gradual Feature Rollout

```typescript
// Update app/home/utils/collaborativeFeatures.ts for gradual rollout
export const COLLABORATIVE_FIELDS = {
  SurveyElement: [
    'notes', // Week 4: Enable for all users
    // 'recommendations', // Week 5: Enable next
  ],
  // SurveyComponent: ['notes'], // Week 6: Add new entity type
} as const;

// Environment-based rollout
export const COLLABORATION_ENABLED =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_ENABLE_COLLABORATION === 'true' ||
  // Gradual rollout by tenant
  (process.env.NEXT_PUBLIC_COLLABORATION_PILOT_TENANTS || '')
    .split(',')
    .includes(getCurrentTenantId());
```

## Phase 5: Rich Text & Real-time Features (Week 5)

### 5.1 TipTap Integration

Create `app/home/components/CollaborativeRichTextEditor.tsx`:

```typescript
import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import * as Y from 'yjs'
import { yjsTextManager } from '../clients/yjsTextFieldManager'

interface CollaborativeRichTextEditorProps {
  entityId: string
  entityType: string
  fieldName: string
  fallbackValue?: string
  onNonCollaborativeChange?: (html: string) => void
}

export function CollaborativeRichTextEditor({
  entityId,
  entityType,
  fieldName,
  fallbackValue = '',
  onNonCollaborativeChange
}: CollaborativeRichTextEditorProps) {
  const [yText, setYText] = useState<Y.Text>()
  const [isCollaborative, setIsCollaborative] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: fallbackValue,
    onUpdate: ({ editor }) => {
      if (isCollaborative && yText) {
        // Update Yjs document
        const html = editor.getHTML()
        yText.delete(0, yText.length)
        yText.insert(0, html)
      } else {
        // Fallback to prop-based updates
        onNonCollaborativeChange?.(editor.getHTML())
      }
    }
  })

  useEffect(() => {
    const shouldUseCollaboration = COLLABORATION_ENABLED &&
      isCollaborativeField(entityType, fieldName)

    setIsCollaborative(shouldUseCollaboration)

    if (shouldUseCollaboration) {
      const initCollaborativeEditor = async () => {
        const yTextDoc = await yjsTextManager.getTextDocument(entityId, entityType, fieldName)
        setYText(yTextDoc)

        // Update editor when Yjs text changes
        yTextDoc.observe(() => {
          if (editor && !editor.isFocused) {
            editor.commands.setContent(yTextDoc.toString())
          }
        })

        // Set initial content
        if (yTextDoc.toString()) {
          editor?.commands.setContent(yTextDoc.toString())
        }
      }

      initCollaborativeEditor()
    }
  }, [entityId, entityType, fieldName, editor])

  return (
    <div className="border rounded-lg">
      <div className="border-b p-2 bg-gray-50 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`px-2 py-1 rounded ${editor?.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
            Bold
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 rounded ${editor?.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
            Italic
          </button>
        </div>
        {isCollaborative && (
          <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
            Collaborative
          </span>
        )}
      </div>
      <EditorContent editor={editor} className="p-4 min-h-[100px]" />
    </div>
  )
}
```

### 5.2 WebSocket Provider (Optional)

For real-time synchronization, add WebSocket support:

```typescript
// Create app/home/clients/yjsWebSocketProvider.ts
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

class YjsWebSocketManager {
  private providers = new Map<string, WebsocketProvider>();

  getProvider(
    entityId: string,
    entityType: string,
    fieldName: string,
    doc: Y.Doc,
  ): WebsocketProvider {
    const key = `${entityType}:${entityId}:${fieldName}`;

    if (!this.providers.has(key)) {
      const provider = new WebsocketProvider(
        process.env.NEXT_PUBLIC_YJS_WEBSOCKET_URL || 'ws://localhost:1234',
        key,
        doc,
      );

      this.providers.set(key, provider);
    }

    return this.providers.get(key)!;
  }

  cleanup(entityId: string, entityType: string, fieldName: string) {
    const key = `${entityType}:${entityId}:${fieldName}`;
    const provider = this.providers.get(key);

    if (provider) {
      provider.disconnect();
      this.providers.delete(key);
    }
  }
}

export const yjsWebSocketManager = new YjsWebSocketManager();
```

## Implementation Checklist

### Week 1: Foundation

- [ ] Add Yjs dependencies
- [ ] Create YjsTextField table in Dexie schema
- [ ] Implement YjsTextFieldManager class
- [ ] Create feature flag configuration
- [ ] Write unit tests for text field manager

### Week 2: React Integration

- [ ] Create useCollaborativeText hook
- [ ] Build CollaborativeTextarea component
- [ ] Update SurveyElementForm to use collaborative notes
- [ ] Add visual indicators for collaborative fields
- [ ] Test fallback behavior when collaboration disabled

### Week 3: Backend Integration

- [ ] Add YjsTextField model to Amplify schema
- [ ] Extend sync engine to handle Yjs fields
- [ ] Implement upload/download of Yjs documents
- [ ] Test offline/online sync scenarios
- [ ] Deploy backend changes

### Week 4: Testing & Rollout

- [ ] Write comprehensive integration tests
- [ ] Test concurrent editing scenarios
- [ ] Enable feature for pilot tenants
- [ ] Monitor performance and error rates
- [ ] Document troubleshooting procedures

### Week 5: Rich Text & Advanced Features

- [ ] Implement CollaborativeRichTextEditor with TipTap
- [ ] Add formatting toolbar
- [ ] Optional: Set up WebSocket provider for real-time sync
- [ ] Add user presence indicators
- [ ] Expand to additional fields (recommendations)

## Benefits

### Immediate Benefits (Week 1-2)

- **Zero Risk**: Existing functionality completely unchanged
- **Simple Testing**: Single field type, single entity type
- **Easy Rollback**: Feature flags allow instant disable
- **Familiar API**: Components look almost identical to existing ones

### Medium-term Benefits (Week 3-4)

- **Conflict-free Editing**: Multiple users can edit simultaneously without data loss
- **Better User Experience**: Real-time collaborative editing
- **Preserved Queries**: Computed text fields maintain existing search/filter functionality
- **Incremental Adoption**: Add more fields/entities gradually

### Long-term Benefits (Week 5+)

- **Rich Collaboration**: Advanced text editing with formatting
- **Real-time Sync**: Immediate updates across all connected users
- **Extensible Platform**: Foundation for other collaborative features
- **Competitive Advantage**: Professional collaborative survey editing

## Risk Mitigation

### Technical Risks

- **Binary Storage**: Yjs documents are binary - handled by Base64 encoding for GraphQL
- **Memory Usage**: Documents kept in memory - cleanup implemented on component unmount
- **Sync Complexity**: Additional sync layer - falls back to existing sync patterns

### Business Risks

- **User Confusion**: Clear visual indicators show collaborative vs. non-collaborative fields
- **Performance Impact**: Debounced saves and efficient binary encoding minimize overhead
- **Data Loss**: Computed text fields in main entities ensure queries continue working

### Mitigation Strategies

- **Feature Flags**: Instant rollback capability if issues arise
- **Gradual Rollout**: Pilot with select tenants before full deployment
- **Fallback Behavior**: Non-collaborative mode preserves all existing functionality
- **Comprehensive Testing**: Unit, integration, and end-to-end test coverage

## Success Metrics

### Technical Metrics

- **Zero regression** in existing functionality
- **<100ms latency** for collaborative text updates
- **<5% increase** in bundle size
- **>99% uptime** for collaborative features

### User Experience Metrics

- **Reduced conflict resolution** support tickets
- **Increased concurrent editing** sessions
- **Positive user feedback** on collaborative features
- **No increase in data loss** incidents

### Business Metrics

- **Improved team productivity** for multi-user surveys
- **Competitive differentiation** in sales processes
- **Foundation for premium features** (real-time collaboration tier)

## Future Enhancements

### Short-term (Next 2-3 months)

- Expand to more text fields (recommendations, descriptions)
- Add collaborative arrays (defects list, photos list)
- Implement user presence indicators
- Add collaborative undo/redo

### Medium-term (Next 6 months)

- Real-time cursors in text editors
- Collaborative forms (condition selections, checkboxes)
- Comment system on survey elements
- Conflict resolution UI for edge cases

### Long-term (Next year)

- Voice comments and annotations
- Video collaboration features
- Branching/merging for survey versions
- Advanced analytics on collaboration patterns

## Conclusion

This minimal Yjs integration plan provides a low-risk path to collaborative editing while preserving all existing functionality. The phased approach allows for careful testing and gradual adoption, ensuring that any issues can be quickly resolved without impact to current users.

The foundation established in this plan creates a platform for future collaborative features while delivering immediate value through conflict-free text editing in survey notes and recommendations.

Key success factors:

1. **Incremental implementation** with feature flags
2. **Comprehensive testing** at each phase
3. **Clear fallback behavior** when collaboration is disabled
4. **Minimal changes** to existing codebase
5. **Strong abstraction layer** for future enhancements
