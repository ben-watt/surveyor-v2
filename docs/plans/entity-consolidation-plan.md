---
title: "Entity Consolidation Plan"
status: planned
category: architecture
created: 2025-08-01
updated: 2025-11-24
tags: [dynamodb, schema, entities, flexibility]
related: [./single-table-design-migration.md, ./single-table-entity-design-v5-practical.md]
priority: low
---

# Entity Consolidation & Dynamic Entity System Plan

## Overview

This document outlines a plan to consolidate the current entity types (Sections, Elements, Components, Phrases) into a generic, flexible entity system that allows users to create custom entity types and define their own data structures.

## Current Architecture Analysis

### Existing Entity Types

Currently, the system has these hard-coded entity types:

- **Sections**: Container entities with order
- **Elements**: Items within sections with descriptions
- **Components**: Sub-items of elements with materials
- **Phrases**: Text snippets associated with various entities

### Current Limitations

- Fixed entity types in the schema
- Hard-coded relationships
- Limited flexibility for custom fields
- Cannot create new entity types without code changes
- Rigid hierarchical structure

## Proposed Generic Entity Architecture

### Core Tables

#### 1. Entities Table

A single table for all entity data with flexible JSON storage:

```typescript
interface Entity {
  id: string;
  tenantId: string;
  entityType: string; // 'section', 'element', 'phrase', or user-defined
  name: string;
  description?: string;
  data: Record<string, any>; // Flexible JSON for custom fields
  metadata: {
    order?: number;
    version: number;
    tags?: string[];
    visibility?: 'public' | 'private' | 'team';
    owner: string;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
  };
  syncStatus: string;
  syncError?: string;
}
```

#### 2. EntityTypes Table

Define custom entity types and their schemas:

```typescript
interface EntityType {
  id: string;
  tenantId: string;
  typeName: string; // e.g., 'section', 'element', 'inspection-point'
  displayName: string;
  pluralName: string;
  icon?: string;
  color?: string;
  schema: {
    fields: FieldDefinition[];
    validations?: ValidationRule[];
    computedFields?: ComputedField[];
  };
  permissions: {
    create: string[]; // Role names
    read: string[];
    update: string[];
    delete: string[];
  };
  ui: {
    listView?: ViewConfig;
    detailView?: ViewConfig;
    formView?: FormConfig;
  };
  createdAt: string;
  updatedAt: string;
}

interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'reference';
  label: string;
  required?: boolean;
  defaultValue?: any;
  options?: any[]; // For select fields
  validation?: ValidationRule;
  ui?: {
    component: string; // Component to use for rendering
    props?: Record<string, any>;
  };
}
```

#### 3. Relationships Table

Store all entity relationships in a dedicated table:

```typescript
interface Relationship {
  id: string;
  tenantId: string;
  relationshipType: string; // 'parent-child', 'reference', 'many-to-many'
  sourceEntityId: string;
  sourceEntityType: string;
  targetEntityId: string;
  targetEntityType: string;
  metadata?: {
    order?: number;
    role?: string; // e.g., 'primary', 'secondary'
    attributes?: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}
```

#### 4. RelationshipTypes Table

Define relationship types and their rules:

```typescript
interface RelationshipType {
  id: string;
  tenantId: string;
  typeName: string;
  displayName: string;
  sourceEntityTypes: string[]; // Allowed source types
  targetEntityTypes: string[]; // Allowed target types
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-many';
  rules: {
    cascadeDelete?: boolean;
    requireTarget?: boolean;
    maxTargets?: number;
    minTargets?: number;
  };
  ui: {
    sourceLabel: string;
    targetLabel: string;
    showInSourceDetail?: boolean;
    showInTargetDetail?: boolean;
  };
}
```

### Migration Strategy

#### Phase 1: Database Schema Migration

Map existing entities to the new structure:

```typescript
// Migration example for Sections
const migrateSection = (section: OldSection): Entity => ({
  id: section.id,
  tenantId: section.tenantId,
  entityType: 'section',
  name: section.name,
  description: section.description,
  data: {
    // Any section-specific fields
  },
  metadata: {
    order: section.order,
    version: 1,
    owner: section.owner || 'system',
    createdBy: 'migration',
    createdAt: section.createdAt,
    updatedBy: 'migration',
    updatedAt: section.updatedAt,
  },
  syncStatus: section.syncStatus,
  syncError: section.syncError,
});

// Migrate relationships
const migrateElementToSection = (element: OldElement): Relationship => ({
  id: `rel_${element.sectionId}_${element.id}`,
  tenantId: element.tenantId,
  relationshipType: 'parent-child',
  sourceEntityId: element.sectionId,
  sourceEntityType: 'section',
  targetEntityId: element.id,
  targetEntityType: 'element',
  metadata: {
    order: element.order,
  },
  createdAt: element.createdAt,
  updatedAt: element.updatedAt,
});
```

### Dynamic Entity Creation UI

#### Entity Type Builder

Allow users to create new entity types through UI:

```typescript
// Component for building entity types
const EntityTypeBuilder = () => {
  const [entityType, setEntityType] = useState<EntityType>({
    typeName: '',
    displayName: '',
    schema: { fields: [] },
    permissions: {},
    ui: {},
  });

  const addField = (field: FieldDefinition) => {
    setEntityType(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: [...prev.schema.fields, field],
      },
    }));
  };

  // UI for drag-and-drop field builder
  return (
    <div>
      <FieldPalette onAddField={addField} />
      <FieldList fields={entityType.schema.fields} />
      <Preview entityType={entityType} />
    </div>
  );
};
```

### Query System

#### Generic Query Builder

Flexible querying across entity types:

```typescript
interface EntityQuery {
  entityType?: string | string[];
  filters?: Filter[];
  relationships?: {
    include?: string[]; // Include related entities
    depth?: number; // How deep to traverse
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  pagination?: {
    limit: number;
    offset: number;
  };
}

// Example usage
const query: EntityQuery = {
  entityType: 'element',
  filters: [
    { field: 'data.status', operator: 'eq', value: 'active' },
    { field: 'metadata.tags', operator: 'contains', value: 'priority' },
  ],
  relationships: {
    include: ['parent_section', 'child_components'],
    depth: 2,
  },
  sort: [{ field: 'metadata.order', direction: 'asc' }],
};
```

### Sync Strategy Updates

#### Enhanced Dexie Store

Update the local store to handle generic entities:

```typescript
const db = new Dexie('GenericEntities') as Dexie & {
  entities: EntityTable<Entity, 'id', 'tenantId'>;
  entityTypes: EntityTable<EntityType, 'id', 'tenantId'>;
  relationships: EntityTable<Relationship, 'id', 'tenantId'>;
  relationshipTypes: EntityTable<RelationshipType, 'id', 'tenantId'>;
};

db.version(1).stores({
  entities: 'id, tenantId, entityType, [tenantId+entityType], metadata.order',
  entityTypes: 'id, tenantId, typeName',
  relationships: 'id, tenantId, sourceEntityId, targetEntityId, [sourceEntityId+relationshipType]',
  relationshipTypes: 'id, tenantId, typeName',
});
```

### Benefits of This Architecture

1. **Flexibility**: Users can create any entity type they need
2. **Scalability**: Single table design scales better
3. **Maintainability**: Less code duplication
4. **Extensibility**: Easy to add new features to all entity types
5. **Consistency**: Uniform API across all entity types
6. **Performance**: Better query optimization opportunities
7. **User Empowerment**: No-code entity creation

### Implementation Phases

#### Phase 1: Core Infrastructure (Weeks 1-2)

- [ ] Design and create new database schema
- [ ] Implement Entity and Relationship models
- [ ] Create migration scripts for existing data
- [ ] Update Amplify schema definitions

#### Phase 2: Data Access Layer (Weeks 3-4)

- [ ] Build generic CRUD operations for entities
- [ ] Implement relationship management
- [ ] Create query builder system
- [ ] Update sync logic for generic entities

#### Phase 3: Entity Type Management (Weeks 5-6)

- [ ] Build EntityType CRUD operations
- [ ] Create UI for entity type builder
- [ ] Implement field type system
- [ ] Add validation framework

#### Phase 4: Migration & Testing (Weeks 7-8)

- [ ] Migrate existing entities to new structure
- [ ] Update all existing components to use new API
- [ ] Comprehensive testing of all features
- [ ] Performance optimization

#### Phase 5: Advanced Features (Weeks 9-10)

- [ ] Implement computed fields
- [ ] Add advanced relationship types
- [ ] Create template system for common entity types
- [ ] Build import/export functionality

### API Examples

#### Creating a Custom Entity Type

```typescript
const inspectionPointType = await entityTypeStore.create({
  typeName: 'inspection_point',
  displayName: 'Inspection Point',
  pluralName: 'Inspection Points',
  schema: {
    fields: [
      {
        name: 'location',
        type: 'string',
        label: 'Location',
        required: true,
      },
      {
        name: 'severity',
        type: 'string',
        label: 'Severity',
        options: ['Low', 'Medium', 'High', 'Critical'],
        ui: { component: 'Select' },
      },
      {
        name: 'photos',
        type: 'array',
        label: 'Photos',
        ui: { component: 'ImageUpload' },
      },
      {
        name: 'notes',
        type: 'string',
        label: 'Notes',
        ui: { component: 'RichTextEditor' },
      },
    ],
  },
});
```

#### Creating an Entity Instance

```typescript
const entity = await entityStore.create({
  entityType: 'inspection_point',
  name: 'Roof Inspection Point 1',
  data: {
    location: 'North-East Corner',
    severity: 'High',
    photos: ['photo1.jpg', 'photo2.jpg'],
    notes: 'Significant wear observed...',
  },
});
```

#### Creating Relationships

```typescript
const relationship = await relationshipStore.create({
  relationshipType: 'inspection_contains',
  sourceEntityId: surveyId,
  sourceEntityType: 'survey',
  targetEntityId: entity.id,
  targetEntityType: 'inspection_point',
  metadata: { order: 1 },
});
```

### UI Component Architecture

#### Generic Entity List Component

```typescript
const EntityList = ({ entityType }: { entityType: string }) => {
  const [entities] = useEntities({ entityType });
  const typeDefinition = useEntityType(entityType);

  return (
    <DataTable
      columns={generateColumns(typeDefinition)}
      data={entities}
      onRowClick={(entity) => navigate(`/entity/${entity.id}`)}
    />
  );
};
```

#### Generic Entity Form Component

```typescript
const EntityForm = ({ entityType, entityId }: Props) => {
  const typeDefinition = useEntityType(entityType);
  const [entity] = useEntity(entityId);
  const form = useForm(generateSchema(typeDefinition));

  return (
    <DynamicForm
      schema={typeDefinition.schema}
      data={entity?.data}
      onSubmit={(data) => saveEntity({ ...entity, data })}
    />
  );
};
```

### Performance Considerations

1. **Indexing Strategy**

   - Index on entityType for type-specific queries
   - Composite index on tenantId + entityType
   - Index on commonly queried data fields

2. **Query Optimization**

   - Implement query result caching
   - Use pagination for large datasets
   - Optimize relationship loading (N+1 prevention)

3. **Data Validation**
   - Client-side validation before sync
   - Server-side schema validation
   - Type checking for data fields

### Security Considerations

1. **Permission System**

   - Role-based access per entity type
   - Field-level permissions
   - Relationship permissions

2. **Data Validation**

   - Schema validation on all CRUD operations
   - Sanitization of user-defined schemas
   - Prevention of injection attacks

3. **Tenant Isolation**
   - Strict filtering by tenantId
   - Validation of cross-tenant references
   - Audit logging for all operations

### Migration Path

1. **Backward Compatibility**

   - Keep old tables during transition
   - Dual-write to both systems
   - Gradual migration of features

2. **Data Migration**

   - Automated migration scripts
   - Validation of migrated data
   - Rollback capability

3. **Feature Flags**
   - Toggle between old and new systems
   - Gradual rollout to users
   - A/B testing of new features

### Future Enhancements

1. **AI-Powered Features**

   - Auto-suggest entity types based on usage
   - Smart field recommendations
   - Relationship discovery

2. **Advanced Querying**

   - GraphQL-like query language
   - Saved queries and views
   - Real-time query subscriptions

3. **Workflow Integration**

   - Entity state machines
   - Approval workflows
   - Automated actions

4. **Analytics & Reporting**
   - Entity analytics dashboard
   - Custom report builder
   - Data export capabilities

## Conclusion

This consolidation plan transforms the rigid entity system into a flexible, user-definable platform that can adapt to any surveying or inspection need. By moving to a generic entity model with dynamic type definitions, users gain the power to create custom data structures without code changes, while maintaining the robustness and performance of the current system.

The phased implementation approach ensures a smooth transition with minimal disruption, while the backward compatibility strategy protects existing data and workflows. This architecture positions the application for long-term growth and adaptability to changing business requirements.
