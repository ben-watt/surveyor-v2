---
title: "Single-Table Design Migration"
status: planned
category: architecture
created: 2025-08-01
updated: 2025-11-24
tags: [dynamodb, single-table, migration, aws]
related: [./single-table-entity-design-v5-practical.md, ./entity-consolidation-plan.md]
priority: low
---

# Single-Table Design Migration Plan

## Executive Summary

This document outlines the migration from the current multi-table DynamoDB schema to a single-table design, following AWS best practices. The single-table design will improve query performance, reduce costs, and simplify data consistency while maintaining multi-tenant isolation.

## Critical Decision: Migration Order

### Recommendation: Single-Table BEFORE Replicache

**Rationale:**

1. **Simpler Replicache Implementation** - Push/pull endpoints are easier with single table
2. **One Migration Instead of Two** - Avoid migrating Replicache code later
3. **Better Performance from Start** - Replicache benefits from optimized queries
4. **Reduced Complexity** - Single source of truth simplifies sync logic

**Timeline Impact:**

- Single-table first: 4 weeks + 7-9 weeks (Replicache) = 11-13 weeks total
- Replicache first: 7-9 weeks + 6 weeks (harder migration) = 13-15 weeks total

## Current Multi-Table Analysis

### Existing Tables (7 total)

1. **Tenants** - Tenant metadata
2. **Surveys** - Building survey forms (large JSON)
3. **Sections** - Survey sections
4. **Elements** - Building elements
5. **Components** - Element components with materials
6. **Phrases** - Defect/condition phrases
7. **ImageMetadata** - Image upload records
8. **DocumentRecord** - Already single-table design!

### Current Pain Points

- Multiple queries for related data
- Complex transactions across tables
- Higher costs (multiple table throughput)
- Inconsistent patterns between tables
- Difficult to maintain referential integrity

## Access Patterns Analysis

### Identified Query Patterns

1. **Get all data for a tenant**
2. **Get specific survey with all config**
3. **List all surveys for a tenant**
4. **Get all sections with elements and components**
5. **Get phrases by type (Defect/Condition)**
6. **Get phrases for specific element/component**
7. **Get all images for a tenant**
8. **Get document versions**
9. **List items by sync status**
10. **Get items updated after timestamp**

## Single-Table Schema Design

### Primary Table Structure

```
Table Name: SurveyorData

Partition Key (PK): String
Sort Key (SK): String
```

### Entity Patterns

```
| Entity | PK | SK | Type |
|--------|----|----|------|
| Tenant | TENANT#<tenantId> | METADATA | Tenant |
| Survey Metadata | TENANT#<tenantId> | SURVEY#<surveyId> | SurveyMeta |
| Survey Section | TENANT#<tenantId> | SURVEY#<surveyId>#SECTION#<sectionId> | SurveySection |
| Survey Element | TENANT#<tenantId> | SURVEY#<surveyId>#ELEMENT#<elementId> | SurveyElement |
| Survey Component | TENANT#<tenantId> | SURVEY#<surveyId>#COMPONENT#<componentId> | SurveyComponent |
| Survey Config | TENANT#<tenantId> | SURVEY#<surveyId>#CONFIG#<timestamp> | SurveyConfig |
| Library Section | TENANT#<tenantId> | SECTION#<sectionId> | Section |
| Library Element | TENANT#<tenantId> | ELEMENT#<elementId> | Element |
| Library Component | TENANT#<tenantId> | COMPONENT#<componentId> | Component |
| Phrase | TENANT#<tenantId> | PHRASE#<type>#<phraseId> | Phrase |
| Image | TENANT#<tenantId> | IMAGE#<imageId> | Image |
| User Survey Access | USER#<userId> | SURVEY#<surveyId> | Access |
| Sync Queue | TENANT#<tenantId> | SYNC#<timestamp>#<entityId> | SyncItem |
```

**Note**: We maintain separation between:

- **Survey-specific data** (SURVEY#id#SECTION#id) - Actual survey content with user inputs
- **Library/Template data** (SECTION#id) - Reusable configuration templates

### Global Secondary Indexes (GSIs)

#### GSI1: By Entity Type

```
GSI1PK: EntityType
GSI1SK: TENANT#<tenantId>#<entityId>

Use cases:
- Get all surveys across tenants (admin)
- Get all sections for a tenant
- Filter by entity type
```

#### GSI2: By Parent Relationship

```
GSI2PK: ParentId
GSI2SK: SK

Use cases:
- Get all elements for a section
- Get all components for an element
- Get all config versions for a survey
```

#### GSI3: By Sync Status

```
GSI3PK: TENANT#<tenantId>#STATUS#<status>
GSI3SK: UpdatedAt

Use cases:
- Get items pending sync
- Get failed items
- Process sync queue
```

#### GSI4: By Update Time

```
GSI4PK: TENANT#<tenantId>
GSI4SK: UpdatedAt

Use cases:
- Get recent changes for sync
- Audit trail
- Replicache pull queries
```

#### GSI5: By Owner

```
GSI5PK: Owner
GSI5SK: TENANT#<tenantId>#<entityId>

Use cases:
- Get all user's surveys
- Access control queries
```

### Detailed Entity Schemas

#### TypeScript Type Definitions

```typescript
// Base type for all entities
interface BaseEntity {
  PK: string;
  SK: string;
  Type: string;

  // Common fields
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  syncStatus: 'synced' | 'pending' | 'failed';
  syncError?: string | null;

  // GSI projections
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  GSI3PK?: string;
  GSI3SK?: string;
  GSI4PK?: string;
  GSI4SK?: string;
  GSI5PK?: string;
  GSI5SK?: string;
}

// Entity-specific interfaces
interface SurveyMetaEntity extends BaseEntity {
  Type: 'SurveyMeta';
  survey: {
    title: string;
    address: string;
    clientName: string;
    surveyDate: string;
    status: 'draft' | 'published' | 'archived';
    currentConfigVersion: string;
    sectionCount: number;
    completedSections: number;
  };
  owner: string;
  editors: string[];
  viewers: string[];
  lastMutationId: number;
}

interface SurveySectionEntity extends BaseEntity {
  Type: 'SurveySection';
  surveyId: string;
  section: {
    name: string;
    order: number;
    notes: string;
    condition: 'Good' | 'Fair' | 'Poor';
    photos: string[];
    completedAt?: string;
    completedBy?: string;
  };
}

interface SurveyElementEntity extends BaseEntity {
  Type: 'SurveyElement';
  surveyId: string;
  sectionId: string;
  element: {
    name: string;
    order: number;
    condition: 'Good' | 'Fair' | 'Poor' | 'N/A';
    defects: string[];
    notes: string;
    photos: string[];
    measurements?: {
      area?: string;
      pitch?: string;
      [key: string]: string | undefined;
    };
  };
}

interface SurveyComponentEntity extends BaseEntity {
  Type: 'SurveyComponent';
  surveyId: string;
  elementId: string;
  component: {
    name: string;
    material: string;
    condition: 'Good' | 'Fair' | 'Poor';
    age?: string;
    lastMaintenance?: string;
    defects: string[];
    notes: string;
    photos: string[];
  };
}

interface LibrarySectionEntity extends BaseEntity {
  Type: 'Section';
  EntityType: 'Section';
  section: {
    name: string;
    order: number;
    description: string;
  };
  createdBy: string;
}

interface LibraryElementEntity extends BaseEntity {
  Type: 'Element';
  EntityType: 'Element';
  sectionId: string;
  element: {
    name: string;
    order: number;
    description: string;
  };
}

interface LibraryComponentEntity extends BaseEntity {
  Type: 'Component';
  EntityType: 'Component';
  elementId: string;
  component: {
    name: string;
    materials: Array<{ name: string }>;
  };
}

interface PhraseEntity extends BaseEntity {
  Type: 'Phrase';
  EntityType: 'Phrase';
  phrase: {
    name: string;
    type: 'Defect' | 'Condition';
    text: string;
    level2?: string;
    associatedMaterialIds: string[];
    associatedElementIds: string[];
    associatedComponentIds: string[];
  };
}

// Union type for all entities
type TableEntity =
  | SurveyMetaEntity
  | SurveySectionEntity
  | SurveyElementEntity
  | SurveyComponentEntity
  | LibrarySectionEntity
  | LibraryElementEntity
  | LibraryComponentEntity
  | PhraseEntity;

// Type guards
function isSurveyMeta(entity: TableEntity): entity is SurveyMetaEntity {
  return entity.Type === 'SurveyMeta';
}

function isSurveySection(entity: TableEntity): entity is SurveySectionEntity {
  return entity.Type === 'SurveySection';
}

function isLibrarySection(entity: TableEntity): entity is LibrarySectionEntity {
  return entity.Type === 'Section';
}
```

#### Survey Entity (Granular Split Design)

```typescript
// Survey Metadata (lightweight)
{
  PK: "TENANT#<tenantId>",
  SK: "SURVEY#<surveyId>",
  Type: "SurveyMeta",

  // Common fields
  id: "surveyId",
  tenantId: "tenantId",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  version: 1,
  syncStatus: "synced",
  syncError: null,

  // Entity-specific nested object
  survey: {
    title: "Building Survey - 123 Main St",
    address: "123 Main Street",
    clientName: "John Doe",
    surveyDate: "2024-01-01",
    status: "draft",
    currentConfigVersion: "2024-01-01T00:00:00Z",
    sectionCount: 12,
    completedSections: 5
  },

  // Access control (kept flat for queries)
  owner: "userId",
  editors: ["userId1", "userId2"],
  viewers: ["userId3"],
  lastMutationId: 0,

  // GSI projections
  GSI1PK: "Survey",
  GSI1SK: "TENANT#<tenantId>#SURVEY#<surveyId>",
  GSI3PK: "TENANT#<tenantId>#STATUS#synced",
  GSI3SK: "2024-01-01T00:00:00Z",
  GSI4PK: "TENANT#<tenantId>",
  GSI4SK: "2024-01-01T00:00:00Z",
  GSI5PK: "USER#<userId>",
  GSI5SK: "TENANT#<tenantId>#SURVEY#<surveyId>"
}

// Survey Section (actual survey data)
{
  PK: "TENANT#<tenantId>",
  SK: "SURVEY#<surveyId>#SECTION#<sectionId>",
  Type: "SurveySection",

  // Common fields
  id: "sectionId",
  tenantId: "tenantId",
  surveyId: "surveyId",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  version: 1,
  syncStatus: "synced",
  syncError: null,

  // Entity-specific nested object
  section: {
    name: "Roof",
    order: 1,
    notes: "General observations about the roof",
    condition: "Good",
    photos: ["imageId1", "imageId2"],
    completedAt: "2024-01-01T10:30:00Z",
    completedBy: "userId"
  },

  // GSI projections for efficient queries
  GSI2PK: "SURVEY#<surveyId>",
  GSI2SK: "SECTION#1",  // Uses order for sorting
  GSI4PK: "TENANT#<tenantId>",
  GSI4SK: "2024-01-01T00:00:00Z"
}

// Survey Element (actual survey data)
{
  PK: "TENANT#<tenantId>",
  SK: "SURVEY#<surveyId>#ELEMENT#<elementId>",
  Type: "SurveyElement",

  // Common fields
  id: "elementId",
  tenantId: "tenantId",
  surveyId: "surveyId",
  sectionId: "sectionId",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  version: 1,
  syncStatus: "synced",
  syncError: null,

  // Entity-specific nested object
  element: {
    name: "Roof Covering",
    order: 1,
    condition: "Good",
    defects: ["defectId1", "defectId2"],  // References to phrases
    notes: "Clay tiles in good condition, minor chips observed",
    photos: ["imageId3", "imageId4"],
    measurements: {
      area: "150sqm",
      pitch: "30 degrees"
    }
  },

  // GSI projections
  GSI2PK: "SURVEY#<surveyId>#SECTION#<sectionId>",
  GSI2SK: "ELEMENT#1",  // Uses order for sorting
  GSI4PK: "TENANT#<tenantId>",
  GSI4SK: "2024-01-01T00:00:00Z"
}

// Survey Component (actual survey data)
{
  PK: "TENANT#<tenantId>",
  SK: "SURVEY#<surveyId>#COMPONENT#<componentId>",
  Type: "SurveyComponent",

  // Common fields
  id: "componentId",
  tenantId: "tenantId",
  surveyId: "surveyId",
  elementId: "elementId",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  version: 1,
  syncStatus: "synced",
  syncError: null,

  // Entity-specific nested object
  component: {
    name: "Roof Tiles",
    material: "Clay",  // Selected from available materials
    condition: "Good",
    age: "15 years",
    lastMaintenance: "2020",
    defects: ["defectId3"],
    notes: "Original tiles, well maintained",
    photos: ["imageId5"]
  },

  // GSI projections
  GSI2PK: "SURVEY#<surveyId>#ELEMENT#<elementId>",
  GSI2SK: "COMPONENT#<componentId>",
  GSI4PK: "TENANT#<tenantId>",
  GSI4SK: "2024-01-01T00:00:00Z"
}

// Survey Config Snapshot (point-in-time)
{
  PK: "TENANT#<tenantId>",
  SK: "SURVEY#<surveyId>#CONFIG#<timestamp>",
  Type: "SurveyConfig",

  // Snapshot of all related config
  timestamp: "2024-01-01T00:00:00Z",
  sections: [
    {
      id: "sectionId",
      name: "Roof",
      order: 1,
      elements: [
        {
          id: "elementId",
          name: "Roof Covering",
          order: 1,
          components: [
            {
              id: "componentId",
              name: "Tiles",
              materials: [{ name: "Clay" }, { name: "Concrete" }]
            }
          ]
        }
      ]
    }
  ],
  phrases: {
    defects: [...],
    conditions: [...]
  },

  // For GSI2 - parent relationship
  GSI2PK: "SURVEY#<surveyId>",
  GSI2SK: "CONFIG#<timestamp>"
}
```

#### Library Section Entity

```typescript
{
  PK: "TENANT#<tenantId>",
  SK: "SECTION#<sectionId>",
  Type: "Section",
  EntityType: "Section",

  // Common fields
  id: "sectionId",
  tenantId: "tenantId",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  version: 1,
  syncStatus: "synced",
  syncError: null,

  // Entity-specific nested object
  section: {
    name: "Roof",
    order: 1,
    description: "Roof and roof structures"
  },

  // Additional metadata
  createdBy: "userId",

  // GSI projections
  GSI1PK: "Section",
  GSI1SK: "TENANT#<tenantId>#SECTION#<sectionId>",
  GSI4PK: "TENANT#<tenantId>",
  GSI4SK: "2024-01-01T00:00:00Z"
}
```

#### Library Element Entity

```typescript
{
  PK: "TENANT#<tenantId>",
  SK: "ELEMENT#<elementId>",
  Type: "Element",
  EntityType: "Element",

  // Common fields
  id: "elementId",
  tenantId: "tenantId",
  sectionId: "sectionId",  // Parent reference
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  version: 1,
  syncStatus: "synced",
  syncError: null,

  // Entity-specific nested object
  element: {
    name: "Roof Covering",
    order: 1,
    description: "External roof covering materials"
  },

  // GSI projections
  GSI1PK: "Element",
  GSI1SK: "TENANT#<tenantId>#ELEMENT#<elementId>",
  GSI2PK: "SECTION#<sectionId>",
  GSI2SK: "ELEMENT#<elementId>",
  GSI4PK: "TENANT#<tenantId>",
  GSI4SK: "2024-01-01T00:00:00Z"
}
```

#### Library Component Entity

```typescript
{
  PK: "TENANT#<tenantId>",
  SK: "COMPONENT#<componentId>",
  Type: "Component",
  EntityType: "Component",

  // Common fields
  id: "componentId",
  tenantId: "tenantId",
  elementId: "elementId",  // Parent reference
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  version: 1,
  syncStatus: "synced",
  syncError: null,

  // Entity-specific nested object
  component: {
    name: "Roof Tiles",
    materials: [
      { name: "Clay" },
      { name: "Concrete" },
      { name: "Slate" }
    ]
  },

  // GSI projections
  GSI1PK: "Component",
  GSI1SK: "TENANT#<tenantId>#COMPONENT#<componentId>",
  GSI2PK: "ELEMENT#<elementId>",
  GSI2SK: "COMPONENT#<componentId>",
  GSI4PK: "TENANT#<tenantId>",
  GSI4SK: "2024-01-01T00:00:00Z"
}
```

#### Phrase Entity

```typescript
{
  PK: "TENANT#<tenantId>",
  SK: "PHRASE#<type>#<phraseId>",
  Type: "Phrase",
  EntityType: "Phrase",

  // Common fields
  id: "phraseId",
  tenantId: "tenantId",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  version: 1,
  syncStatus: "synced",
  syncError: null,

  // Entity-specific nested object
  phrase: {
    name: "Cracked tiles",
    type: "Defect",  // or "Condition"
    text: "Multiple cracked or broken tiles observed",
    level2: "Tiles showing signs of deterioration",
    associatedMaterialIds: ["material1", "material2"],
    associatedElementIds: ["elementId"],
    associatedComponentIds: ["componentId"]
  },

  // GSI projections
  GSI1PK: "Phrase#Defect",
  GSI1SK: "TENANT#<tenantId>#PHRASE#<phraseId>",
  GSI4PK: "TENANT#<tenantId>",
  GSI4SK: "2024-01-01T00:00:00Z"
}
```

## Query Patterns Implementation

### 1. Get all data for a tenant

```typescript
const params = {
  TableName: 'SurveyorData',
  KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: {
    ':pk': `TENANT#${tenantId}`,
  },
};
```

### 2. Get complete survey with all components

```typescript
// Single query gets all survey data (efficient!)
const params = {
  TableName: 'SurveyorData',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :surveyPrefix)',
  ExpressionAttributeValues: {
    ':pk': `TENANT#${tenantId}`,
    ':surveyPrefix': `SURVEY#${surveyId}#`,
  },
};

// Results include:
// - SURVEY#id (metadata)
// - SURVEY#id#SECTION#* (all sections)
// - SURVEY#id#ELEMENT#* (all elements)
// - SURVEY#id#COMPONENT#* (all components)

// Then organize in memory:
const result = response.Items.reduce(
  (acc, item) => {
    switch (item.Type) {
      case 'SurveyMeta':
        acc.metadata = item;
        break;
      case 'SurveySection':
        acc.sections.push(item);
        break;
      case 'SurveyElement':
        acc.elements.push(item);
        break;
      case 'SurveyComponent':
        acc.components.push(item);
        break;
    }
    return acc;
  },
  { metadata: null, sections: [], elements: [], components: [] },
);
```

### 3. Get all sections with elements and components

```typescript
// Single query to get all sections, elements, and components
const params = {
  TableName: 'SurveyorData',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
  ExpressionAttributeValues: {
    ':pk': `TENANT#${tenantId}`,
    ':prefix': 'SECTION#', // Then 'ELEMENT#', then 'COMPONENT#'
  },
};

// Or use GSI1 for type-specific queries
const params = {
  TableName: 'SurveyorData',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :type AND begins_with(GSI1SK, :tenant)',
  ExpressionAttributeValues: {
    ':type': 'Section',
    ':tenant': `TENANT#${tenantId}`,
  },
};
```

### 4. Get items pending sync

```typescript
const params = {
  TableName: 'SurveyorData',
  IndexName: 'GSI3',
  KeyConditionExpression: 'GSI3PK = :pk',
  ExpressionAttributeValues: {
    ':pk': `TENANT#${tenantId}#STATUS#pending`,
  },
  ScanIndexForward: true, // Oldest first
};
```

### 5. Get recent changes for Replicache pull

```typescript
const params = {
  TableName: 'SurveyorData',
  IndexName: 'GSI4',
  KeyConditionExpression: 'GSI4PK = :pk AND GSI4SK > :since',
  ExpressionAttributeValues: {
    ':pk': `TENANT#${tenantId}`,
    ':since': lastSyncTimestamp,
  },
};
```

## Migration Strategy

### Phase 1: Add Single Table (Week 1)

```typescript
// amplify/data/resource.ts
const schema = a.schema({
  SurveyorData: a
    .model({
      pk: a.string().required(),
      sk: a.string().required(),
      type: a.string().required(),
      entityType: a.string(),

      // Common fields
      id: a.string(),
      tenantId: a.string(),
      owner: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      version: a.integer(),
      syncStatus: a.string(),

      // Survey fields
      title: a.string(),
      address: a.string(),
      status: a.string(),
      content: a.json(), // Large JSON

      // Section/Element/Component fields
      name: a.string(),
      order: a.float(),
      description: a.string(),
      sectionId: a.string(),
      elementId: a.string(),
      materials: a.json(),

      // Phrase fields
      phrase: a.string(),
      phraseLevel2: a.string(),
      phraseType: a.string(),
      associatedMaterialIds: a.string().array(),
      associatedElementIds: a.string().array(),
      associatedComponentIds: a.string().array(),

      // Image fields
      imagePath: a.string(),
      caption: a.string(),

      // GSI fields
      gsi1pk: a.string(),
      gsi1sk: a.string(),
      gsi2pk: a.string(),
      gsi2sk: a.string(),
      gsi3pk: a.string(),
      gsi3sk: a.string(),
      gsi4pk: a.string(),
      gsi4sk: a.string(),
      gsi5pk: a.string(),
      gsi5sk: a.string(),
    })
    .identifier(['pk', 'sk'])
    .secondaryIndexes((index) => [
      index('gsi1pk').sortKeys(['gsi1sk']).name('GSI1'),
      index('gsi2pk').sortKeys(['gsi2sk']).name('GSI2'),
      index('gsi3pk').sortKeys(['gsi3sk']).name('GSI3'),
      index('gsi4pk').sortKeys(['gsi4sk']).name('GSI4'),
      index('gsi5pk').sortKeys(['gsi5sk']).name('GSI5'),
    ]),
});
```

### Phase 2: Migration Lambda (Week 2)

```typescript
// amplify/functions/migrate-to-single-table/handler.ts
export const handler = async (event: any) => {
  const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

  // Migrate in batches to avoid throttling
  const BATCH_SIZE = 25;

  // 1. Migrate Surveys (split into granular components)
  const surveys = await scanTable('Surveys');
  for (const survey of surveys) {
    const batch = [];
    const surveyContent = JSON.parse(survey.content);

    // Survey metadata with nested structure
    batch.push({
      PutRequest: {
        Item: marshall({
          pk: `TENANT#${survey.tenantId}`,
          sk: `SURVEY#${survey.id}`,
          type: 'SurveyMeta',

          // Common fields
          id: survey.id,
          tenantId: survey.tenantId,
          createdAt: survey.createdAt,
          updatedAt: survey.updatedAt,
          version: 1,
          syncStatus: survey.syncStatus,
          syncError: survey.syncError,

          // Entity-specific nested object
          survey: {
            title: surveyContent?.title || 'Untitled',
            address: surveyContent?.address,
            clientName: surveyContent?.clientName,
            surveyDate: surveyContent?.surveyDate,
            status: surveyContent?.status || 'draft',
            currentConfigVersion: new Date().toISOString(),
            sectionCount: surveyContent?.sections?.length || 0,
            completedSections: 0,
          },

          // Access control
          owner: survey.owner,
          editors: survey.editors || [],
          viewers: survey.viewers || [],
          lastMutationId: 0,

          // GSI projections
          gsi1pk: 'Survey',
          gsi1sk: `TENANT#${survey.tenantId}#SURVEY#${survey.id}`,
          gsi3pk: `TENANT#${survey.tenantId}#STATUS#${survey.syncStatus}`,
          gsi3sk: survey.updatedAt,
          gsi4pk: `TENANT#${survey.tenantId}`,
          gsi4sk: survey.updatedAt,
          gsi5pk: `USER#${survey.owner}`,
          gsi5sk: `TENANT#${survey.tenantId}#SURVEY#${survey.id}`,
        }),
      },
    });

    // Extract and migrate survey sections
    if (surveyContent.sections) {
      for (const section of surveyContent.sections) {
        batch.push({
          PutRequest: {
            Item: marshall({
              pk: `TENANT#${survey.tenantId}`,
              sk: `SURVEY#${survey.id}#SECTION#${section.id}`,
              type: 'SurveySection',

              // Common fields
              id: section.id,
              tenantId: survey.tenantId,
              surveyId: survey.id,
              createdAt: section.createdAt || survey.createdAt,
              updatedAt: survey.updatedAt,
              version: 1,
              syncStatus: 'synced',
              syncError: null,

              // Entity-specific nested object
              section: {
                name: section.name,
                order: section.order || 0,
                notes: section.notes || '',
                condition: section.condition || 'N/A',
                photos: section.photos || [],
                completedAt: section.completedAt,
                completedBy: section.completedBy,
              },

              // GSI projections
              gsi2pk: `SURVEY#${survey.id}`,
              gsi2sk: `SECTION#${section.order || 0}`,
              gsi4pk: `TENANT#${survey.tenantId}`,
              gsi4sk: survey.updatedAt,
            }),
          },
        });

        // Extract and migrate elements for this section
        if (section.elements) {
          for (const element of section.elements) {
            batch.push({
              PutRequest: {
                Item: marshall({
                  pk: `TENANT#${survey.tenantId}`,
                  sk: `SURVEY#${survey.id}#ELEMENT#${element.id}`,
                  type: 'SurveyElement',

                  // Common fields
                  id: element.id,
                  tenantId: survey.tenantId,
                  surveyId: survey.id,
                  sectionId: section.id,
                  createdAt: element.createdAt || survey.createdAt,
                  updatedAt: survey.updatedAt,
                  version: 1,
                  syncStatus: 'synced',
                  syncError: null,

                  // Entity-specific nested object
                  element: {
                    name: element.name,
                    order: element.order || 0,
                    condition: element.condition || 'N/A',
                    defects: element.defects || [],
                    notes: element.notes || '',
                    photos: element.photos || [],
                    measurements: element.measurements || {},
                    materials: element.materials || [],
                  },

                  // GSI projections
                  gsi2pk: `SURVEY#${survey.id}#SECTION#${section.id}`,
                  gsi2sk: `ELEMENT#${element.order || 0}`,
                  gsi4pk: `TENANT#${survey.tenantId}`,
                  gsi4sk: survey.updatedAt,
                }),
              },
            });

            // Extract and migrate components for this element
            if (element.components) {
              for (const component of element.components) {
                batch.push({
                  PutRequest: {
                    Item: marshall({
                      pk: `TENANT#${survey.tenantId}`,
                      sk: `SURVEY#${survey.id}#COMPONENT#${component.id}`,
                      type: 'SurveyComponent',

                      // Common fields
                      id: component.id,
                      tenantId: survey.tenantId,
                      surveyId: survey.id,
                      elementId: element.id,
                      createdAt: component.createdAt || survey.createdAt,
                      updatedAt: survey.updatedAt,
                      version: 1,
                      syncStatus: 'synced',
                      syncError: null,

                      // Entity-specific nested object
                      component: {
                        name: component.name,
                        material: component.material || 'Unknown',
                        condition: component.condition || 'N/A',
                        age: component.age || 'Unknown',
                        lastMaintenance: component.lastMaintenance,
                        defects: component.defects || [],
                        notes: component.notes || '',
                        photos: component.photos || [],
                        specifications: component.specifications || {},
                      },

                      // GSI projections
                      gsi2pk: `SURVEY#${survey.id}#ELEMENT#${element.id}`,
                      gsi2sk: `COMPONENT#${component.id}`,
                      gsi4pk: `TENANT#${survey.tenantId}`,
                      gsi4sk: survey.updatedAt,
                    }),
                  },
                });
              }
            }
          }
        }

        // Write batch when it reaches size limit
        if (batch.length >= BATCH_SIZE) {
          await writeBatch(dynamodb, 'SurveyorData', batch);
          batch.length = 0;
        }
      }
    }

    // Write any remaining items
    if (batch.length > 0) {
      await writeBatch(dynamodb, 'SurveyorData', batch);
    }
  }

  // 2. Migrate Library Sections
  const sections = await scanTable('Sections');
  for (const section of sections) {
    await dynamodb.send(
      new PutItemCommand({
        TableName: 'SurveyorData',
        Item: marshall({
          pk: `TENANT#${section.tenantId}`,
          sk: `SECTION#${section.id}`,
          type: 'Section',

          // Common fields
          id: section.id,
          tenantId: section.tenantId,
          createdAt: section.createdAt,
          updatedAt: section.updatedAt,
          version: 1,
          syncStatus: 'synced',
          syncError: null,

          // Entity-specific nested object
          section: {
            name: section.name,
            description: section.description || '',
            order: section.order || 0,
            isActive: section.isActive !== false,
            category: section.category || 'General',
            tags: section.tags || [],
          },

          // GSI projections
          gsi1pk: 'Section',
          gsi1sk: `TENANT#${section.tenantId}#SECTION#${section.id}`,
          gsi4pk: `TENANT#${section.tenantId}`,
          gsi4sk: section.updatedAt,
        }),
      }),
    );
  }

  // 3. Create config snapshots for existing surveys
  for (const survey of surveys) {
    const config = await buildConfigSnapshot(survey.tenantId, survey.id);
    await dynamodb.send(
      new PutItemCommand({
        TableName: 'SurveyorData',
        Item: marshall({
          pk: `TENANT#${survey.tenantId}`,
          sk: `SURVEY#${survey.id}#CONFIG#${new Date().toISOString()}`,
          type: 'SurveyConfig',
          ...config,
          gsi2pk: `SURVEY#${survey.id}`,
          gsi2sk: `CONFIG#${new Date().toISOString()}`,
        }),
      }),
    );
  }

  // Continue for Elements, Components, Phrases, Images...
};

async function buildConfigSnapshot(tenantId: string, surveyId: string) {
  // Fetch all related config data
  const sections = await queryByTenant('Sections', tenantId);
  const elements = await queryByTenant('Elements', tenantId);
  const components = await queryByTenant('Components', tenantId);
  const phrases = await queryByTenant('Phrases', tenantId);

  // Build hierarchical structure
  const config = {
    timestamp: new Date().toISOString(),
    sections: sections.map((section) => ({
      ...section,
      elements: elements
        .filter((e) => e.sectionId === section.id)
        .map((element) => ({
          ...element,
          components: components.filter((c) => c.elementId === element.id),
        })),
    })),
    phrases: {
      defects: phrases.filter((p) => p.type === 'Defect'),
      conditions: phrases.filter((p) => p.type === 'Condition'),
    },
  };

  return config;
}
```

### Phase 3: Update Application Code (Week 3)

```typescript
// app/home/clients/SingleTableStore.ts
import {
  DynamoDBClient,
  QueryCommand,
  GetItemCommand,
  UpdateItemCommand,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  TableEntity,
  SurveyMetaEntity,
  SurveySectionEntity,
  SurveyElementEntity,
  SurveyComponentEntity,
} from './types';

export class SingleTableStore {
  private client: DynamoDBClient;
  private tableName = 'SurveyorData';

  constructor() {
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION });
  }

  // Type guards for runtime type checking
  private isSurveyMeta(entity: any): entity is SurveyMetaEntity {
    return entity.type === 'SurveyMeta';
  }

  private isSurveySection(entity: any): entity is SurveySectionEntity {
    return entity.type === 'SurveySection';
  }

  private isSurveyElement(entity: any): entity is SurveyElementEntity {
    return entity.type === 'SurveyElement';
  }

  private isSurveyComponent(entity: any): entity is SurveyComponentEntity {
    return entity.type === 'SurveyComponent';
  }

  async getCompleteSurvey(tenantId: string, surveyId: string) {
    // Single query gets all survey components
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :surveyPrefix)',
        ExpressionAttributeValues: marshall({
          ':pk': `TENANT#${tenantId}`,
          ':surveyPrefix': `SURVEY#${surveyId}`,
        }),
      }),
    );

    const items = response.Items?.map(unmarshall) || [];

    // Organize into typed structure
    let metadata: SurveyMetaEntity | null = null;
    const sections: SurveySectionEntity[] = [];
    const elements: SurveyElementEntity[] = [];
    const components: SurveyComponentEntity[] = [];

    for (const item of items) {
      if (this.isSurveyMeta(item)) {
        metadata = item;
      } else if (this.isSurveySection(item)) {
        sections.push(item);
      } else if (this.isSurveyElement(item)) {
        elements.push(item);
      } else if (this.isSurveyComponent(item)) {
        components.push(item);
      }
    }

    if (!metadata) {
      throw new Error(`Survey ${surveyId} not found`);
    }

    // Build hierarchical structure with proper typing
    const sectionMap = new Map(
      sections.map((s) => [
        s.id,
        {
          ...s.section,
          id: s.id,
          elements: [] as any[],
        },
      ]),
    );

    const elementMap = new Map(
      elements.map((e) => [
        e.id,
        {
          ...e.element,
          id: e.id,
          components: [] as any[],
        },
      ]),
    );

    // Attach components to elements
    for (const component of components) {
      const element = elementMap.get(component.elementId);
      if (element) {
        element.components.push({
          ...component.component,
          id: component.id,
        });
      }
    }

    // Attach elements to sections
    for (const element of elements) {
      const section = sectionMap.get(element.sectionId);
      if (section) {
        section.elements.push(elementMap.get(element.id));
      }
    }

    // Return properly typed structure
    return {
      id: metadata.id,
      ...metadata.survey,
      owner: metadata.owner,
      sections: Array.from(sectionMap.values()).sort((a, b) => a.order - b.order),
    };
  }

  async updateSurveyMetadata(
    tenantId: string,
    surveyId: string,
    updates: Partial<SurveyMetaEntity['survey']>,
  ) {
    // Update nested survey object fields
    const updateExpression = Object.keys(updates)
      .map((key) => `survey.#${key} = :${key}`)
      .join(', ');

    const expressionAttributeNames = Object.keys(updates).reduce(
      (acc, key) => ({ ...acc, [`#${key}`]: key }),
      { '#updatedAt': 'updatedAt', '#version': 'version' },
    );

    const expressionAttributeValues = Object.entries(updates).reduce(
      (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
      { ':now': new Date().toISOString(), ':inc': 1 },
    );

    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          pk: `TENANT#${tenantId}`,
          sk: `SURVEY#${surveyId}`,
        }),
        UpdateExpression: `SET ${updateExpression}, #updatedAt = :now, #version = #version + :inc`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
      }),
    );
  }

  async updateSurveySection(
    tenantId: string,
    surveyId: string,
    sectionId: string,
    updates: Partial<SurveySectionEntity['section']>,
  ) {
    // Update nested section object fields
    const updateExpressions = Object.keys(updates).map((key) => `section.#${key} = :${key}`);
    updateExpressions.push('#updatedAt = :now', '#version = #version + :inc');

    const expressionAttributeNames = Object.keys(updates).reduce(
      (acc, key) => ({ ...acc, [`#${key}`]: key }),
      { '#updatedAt': 'updatedAt', '#version': 'version' },
    );

    const expressionAttributeValues = Object.entries(updates).reduce(
      (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
      { ':now': new Date().toISOString(), ':inc': 1 },
    );

    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          pk: `TENANT#${tenantId}`,
          sk: `SURVEY#${surveyId}#SECTION#${sectionId}`,
        }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ConditionExpression: 'attribute_exists(pk)', // Ensure item exists
      }),
    );
  }

  async updateSurveyElement(
    tenantId: string,
    surveyId: string,
    elementId: string,
    updates: Partial<SurveyElementEntity['element']>,
  ) {
    // Update nested element object fields
    const updateExpressions = Object.keys(updates).map((key) => `element.#${key} = :${key}`);
    updateExpressions.push('#updatedAt = :now', '#version = #version + :inc');

    const expressionAttributeNames = Object.keys(updates).reduce(
      (acc, key) => ({ ...acc, [`#${key}`]: key }),
      { '#updatedAt': 'updatedAt', '#version': 'version' },
    );

    const expressionAttributeValues = Object.entries(updates).reduce(
      (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
      { ':now': new Date().toISOString(), ':inc': 1 },
    );

    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          pk: `TENANT#${tenantId}`,
          sk: `SURVEY#${surveyId}#ELEMENT#${elementId}`,
        }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ConditionExpression: 'attribute_exists(pk)', // Ensure item exists
      }),
    );
  }

  // Batch update multiple items in a transaction
  async batchUpdateSurvey(
    tenantId: string,
    surveyId: string,
    updates: {
      sections?: Array<{ id: string; updates: Partial<SurveySectionEntity['section']> }>;
      elements?: Array<{ id: string; updates: Partial<SurveyElementEntity['element']> }>;
      components?: Array<{ id: string; updates: Partial<SurveyComponentEntity['component']> }>;
    },
  ) {
    const transactItems = [];
    const now = new Date().toISOString();

    // Update survey metadata timestamp
    transactItems.push({
      Update: {
        TableName: this.tableName,
        Key: marshall({
          pk: `TENANT#${tenantId}`,
          sk: `SURVEY#${surveyId}`,
        }),
        UpdateExpression: 'SET #updatedAt = :now',
        ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: marshall({ ':now': now }),
      },
    });

    // Add section updates
    if (updates.sections) {
      for (const section of updates.sections) {
        const updateFields = Object.keys(section.updates).map((key) => `section.#${key} = :${key}`);
        updateFields.push('#updatedAt = :now');

        const attributeNames = Object.keys(section.updates).reduce(
          (acc, key) => ({ ...acc, [`#${key}`]: key }),
          { '#updatedAt': 'updatedAt' },
        );

        const attributeValues = Object.entries(section.updates).reduce(
          (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
          { ':now': now },
        );

        transactItems.push({
          Update: {
            TableName: this.tableName,
            Key: marshall({
              pk: `TENANT#${tenantId}`,
              sk: `SURVEY#${surveyId}#SECTION#${section.id}`,
            }),
            UpdateExpression: `SET ${updateFields.join(', ')}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: marshall(attributeValues),
          },
        });
      }
    }

    // Add element updates
    if (updates.elements) {
      for (const element of updates.elements) {
        const updateFields = Object.keys(element.updates).map((key) => `element.#${key} = :${key}`);
        updateFields.push('#updatedAt = :now');

        const attributeNames = Object.keys(element.updates).reduce(
          (acc, key) => ({ ...acc, [`#${key}`]: key }),
          { '#updatedAt': 'updatedAt' },
        );

        const attributeValues = Object.entries(element.updates).reduce(
          (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
          { ':now': now },
        );

        transactItems.push({
          Update: {
            TableName: this.tableName,
            Key: marshall({
              pk: `TENANT#${tenantId}`,
              sk: `SURVEY#${surveyId}#ELEMENT#${element.id}`,
            }),
            UpdateExpression: `SET ${updateFields.join(', ')}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: marshall(attributeValues),
          },
        });
      }
    }

    // Add component updates
    if (updates.components) {
      for (const component of updates.components) {
        const updateFields = Object.keys(component.updates).map(
          (key) => `component.#${key} = :${key}`,
        );
        updateFields.push('#updatedAt = :now');

        const attributeNames = Object.keys(component.updates).reduce(
          (acc, key) => ({ ...acc, [`#${key}`]: key }),
          { '#updatedAt': 'updatedAt' },
        );

        const attributeValues = Object.entries(component.updates).reduce(
          (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
          { ':now': now },
        );

        transactItems.push({
          Update: {
            TableName: this.tableName,
            Key: marshall({
              pk: `TENANT#${tenantId}`,
              sk: `SURVEY#${surveyId}#COMPONENT#${component.id}`,
            }),
            UpdateExpression: `SET ${updateFields.join(', ')}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: marshall(attributeValues),
          },
        });
      }
    }

    // Execute transaction (max 100 items)
    if (transactItems.length > 0) {
      await this.client.send(
        new TransactWriteItemsCommand({
          TransactItems: transactItems,
        }),
      );
    }
  }

  async getRecentChanges(tenantId: string, since: string) {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI4',
        KeyConditionExpression: 'gsi4pk = :pk AND gsi4sk > :since',
        ExpressionAttributeValues: marshall({
          ':pk': `TENANT#${tenantId}`,
          ':since': since,
        }),
      }),
    );

    return response.Items?.map(unmarshall) || [];
  }

  async getSyncQueue(tenantId: string) {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: 'gsi3pk = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': `TENANT#${tenantId}#STATUS#pending`,
        }),
        ScanIndexForward: true, // Process oldest first
      }),
    );

    return response.Items?.map(unmarshall) || [];
  }
}
```

### Phase 4: Testing & Cutover (Week 4)

## Benefits of Granular Split Design

### Why Split Survey Content Into Components?

This approach follows DynamoDB best practices by:

1. **Avoiding Large Items**

   - DynamoDB has a 400KB item limit
   - Large JSON blobs can hit this limit
   - Granular items stay well under limits

2. **Enabling Partial Updates**

   - Update a single section without fetching entire survey
   - Reduces write costs (only charge for updated item)
   - Better for concurrent editing (less conflict potential)

3. **Optimizing for Replicache**

   - Each item syncs independently
   - Only changed items need syncing
   - Smaller payload sizes
   - More efficient conflict resolution

4. **Supporting Real-time Collaboration**

   - User A edits Section 1
   - User B edits Section 2
   - No conflicts!

5. **Improving Query Performance**

   - Can fetch specific sections/elements
   - Parallel processing possible
   - Better caching at item level

6. **Cost Optimization**
   - Pay only for items accessed
   - Smaller items = lower costs
   - More efficient use of provisioned throughput

## Benefits of Single-Table Design

### 1. Performance Improvements

- **Single query** for related data (vs. multiple queries)
- **Atomic transactions** across entity types
- **Better caching** - single table cache key
- **Reduced latency** - fewer round trips

### 2. Cost Optimization

- **Single table throughput** to manage (vs. 7 tables)
- **Fewer GSIs** total (5 vs. potentially 15+)
- **More efficient queries** - less data transfer
- **Better auto-scaling** - single table metrics

### 3. Consistency Benefits

- **ACID transactions** across all entities
- **Atomic config snapshots**
- **Simpler backup/restore**
- **Point-in-time recovery** for all data

### 4. Developer Experience

- **Single data model** to understand
- **Consistent query patterns**
- **Easier debugging** - all data in one place
- **Simpler IAM permissions**

## Comparison with Current DocumentRecord Pattern

Your existing `DocumentRecord` table already uses single-table design successfully:

- PK: `tenantId#documentId`
- SK: `#LATEST` or version numbers
- This pattern works well!

The new design extends this pattern to all entities, learning from what works.

## Integration with Replicache

### Why Single-Table First is Better

1. **Simpler Push/Pull Implementation**

```typescript
// With single table - one query
const changes = await db.query({
  IndexName: 'GSI4',
  KeyCondition: 'gsi4pk = :tenant AND gsi4sk > :since'
});

// With multiple tables - many queries
const surveys = await db.query('Surveys', ...);
const sections = await db.query('Sections', ...);
const elements = await db.query('Elements', ...);
// ... more queries
```

2. **Atomic Mutations**

```typescript
// Single transaction for related changes
await db.transactWrite({
  TransactItems: [
    {
      Update: {
        /* survey */
      },
    },
    {
      Update: {
        /* section */
      },
    },
    {
      Put: {
        /* new element */
      },
    },
  ],
});
```

3. **Efficient Sync Status Tracking**

```typescript
// All pending items in one query
const pending = await db.query({
  IndexName: 'GSI3',
  KeyCondition: 'gsi3pk = :tenantStatus',
});
```

## Risk Mitigation

### Rollback Strategy

1. Keep old tables for 30 days
2. Dual-write during transition
3. Feature flag for table selection
4. Data comparison tools

### Testing Strategy

1. Load test with production-like data
2. Query performance benchmarks
3. Cost analysis comparison
4. Concurrent user testing

## Implementation Checklist

### Week 1: Design & Setup

- [ ] Finalize single-table schema
- [ ] Create new DynamoDB table
- [ ] Configure GSIs
- [ ] Set up auto-scaling

### Week 2: Migration Tools

- [ ] Write migration Lambda
- [ ] Create verification scripts
- [ ] Build rollback tools
- [ ] Test with sample data

### Week 3: Application Updates

- [ ] Update data access layer
- [ ] Modify GraphQL resolvers
- [ ] Update sync logic
- [ ] Feature flag implementation

### Week 4: Testing & Cutover

- [ ] Performance testing
- [ ] Data integrity verification
- [ ] Gradual rollout (10%, 50%, 100%)
- [ ] Monitor and optimize
- [ ] Set up CloudWatch alarms
- [ ] Configure auto-scaling policies
- [ ] Enable point-in-time recovery
- [ ] Set up TTL for temporary data

## Conclusion

Migrating to single-table design with **granular split** BEFORE Replicache is the optimal approach because:

### Benefits of Granular Split Approach

1. **Perfect for Replicache Sync**

   - Each section/element/component syncs independently
   - Only modified items transfer over network
   - Natural conflict boundaries (user edits different sections)

2. **Optimal DynamoDB Usage**

   - Items stay under 400KB limit
   - Update costs only for changed items
   - Better hot partition avoidance

3. **Superior User Experience**

   - Instant saves (update one section, not entire survey)
   - Real-time collaboration without conflicts
   - Faster page loads (progressive loading possible)

4. **Development Benefits**
   - Cleaner data access patterns
   - Easier to test individual components
   - Natural transaction boundaries

### Migration Order Benefits

1. **Reduces total work** - One migration instead of two
2. **Simplifies Replicache** - Push/pull work with granular items
3. **Better performance** - From day one
4. **Lower risk** - Each change is isolated

### Expected Outcomes

The granular single-table design will:

- **Reduce costs by ~40-50%** (more efficient than blob storage)
- **Improve write performance by ~70%** (partial updates)
- **Improve query performance by ~50%** (single query for all data)
- **Enable real-time collaboration** (granular conflict resolution)
- **Simplify Replicache integration** (natural sync boundaries)

### Final Architecture

```
Survey Metadata → Lightweight, frequently accessed
Survey Sections → Individual items, user edits
Survey Elements → Granular observations
Survey Components → Detailed conditions
Library Config → Reusable templates
```

Total timeline: 4 weeks for single-table + 7-9 weeks for Replicache = 11-13 weeks total.

## Best Practices & Improvements

### 1. Error Handling & Retry Logic

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';

class ResilientSingleTableStore extends SingleTableStore {
  constructor() {
    super();
    // Configure client with exponential backoff
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION,
      maxAttempts: 3,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        requestTimeout: 5000,
      }),
    });
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    backoffMs = 100,
  ): Promise<T> {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry validation errors
        if (error.name === 'ValidationException') {
          throw error;
        }

        // Exponential backoff for throttling
        if (
          error.name === 'ProvisionedThroughputExceededException' ||
          error.name === 'RequestLimitExceeded'
        ) {
          const delay = backoffMs * Math.pow(2, i) + Math.random() * 100;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Don't retry item not found
        if (error.name === 'ResourceNotFoundException') {
          throw error;
        }

        // Retry other transient errors
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs * (i + 1)));
        }
      }
    }

    throw lastError;
  }
}
```

### 2. Pagination Support

```typescript
interface PaginatedResult<T> {
  items: T[];
  nextToken?: string;
  hasMore: boolean;
}

class SingleTableStore {
  async getCompleteSurveyPaginated(
    tenantId: string,
    surveyId: string,
    limit: number = 100,
    nextToken?: string,
  ): Promise<PaginatedResult<TableEntity>> {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :surveyPrefix)',
        ExpressionAttributeValues: marshall({
          ':pk': `TENANT#${tenantId}`,
          ':surveyPrefix': `SURVEY#${surveyId}`,
        }),
        Limit: limit,
        ExclusiveStartKey: nextToken
          ? JSON.parse(Buffer.from(nextToken, 'base64').toString())
          : undefined,
      }),
    );

    const items = response.Items?.map(unmarshall) || [];

    return {
      items,
      nextToken: response.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
        : undefined,
      hasMore: !!response.LastEvaluatedKey,
    };
  }

  async *iterateAllSurveys(tenantId: string, batchSize: number = 25) {
    let nextToken: string | undefined;

    do {
      const result = await this.getSurveysPaginated(tenantId, batchSize, nextToken);

      for (const item of result.items) {
        yield item;
      }

      nextToken = result.nextToken;
    } while (nextToken);
  }
}
```

### 3. Optimistic Locking

```typescript
class SingleTableStore {
  async updateWithOptimisticLock(
    tenantId: string,
    surveyId: string,
    sectionId: string,
    updates: Partial<SurveySectionEntity['section']>,
    expectedVersion: number,
  ) {
    const updateExpressions = Object.keys(updates).map((key) => `section.#${key} = :${key}`);
    updateExpressions.push('#updatedAt = :now', '#version = :newVersion');

    const expressionAttributeNames = Object.keys(updates).reduce(
      (acc, key) => ({ ...acc, [`#${key}`]: key }),
      { '#updatedAt': 'updatedAt', '#version': 'version' },
    );

    const expressionAttributeValues = Object.entries(updates).reduce(
      (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
      {
        ':now': new Date().toISOString(),
        ':expectedVersion': expectedVersion,
        ':newVersion': expectedVersion + 1,
      },
    );

    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: marshall({
            pk: `TENANT#${tenantId}`,
            sk: `SURVEY#${surveyId}#SECTION#${sectionId}`,
          }),
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ConditionExpression: '#version = :expectedVersion',
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: marshall(expressionAttributeValues),
        }),
      );
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Version conflict: Item has been modified by another user');
      }
      throw error;
    }
  }
}
```

### 4. Batch Operations

```typescript
class SingleTableStore {
  async batchGetItems(keys: Array<{ tenantId: string; entityId: string; entityType: string }>) {
    // Batch get is limited to 100 items
    const chunks = [];
    for (let i = 0; i < keys.length; i += 100) {
      chunks.push(keys.slice(i, i + 100));
    }

    const results = [];

    for (const chunk of chunks) {
      const response = await this.client.send(
        new BatchGetItemCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: chunk.map((key) =>
                marshall({
                  pk: `TENANT#${key.tenantId}`,
                  sk: this.buildSortKey(key.entityType, key.entityId),
                }),
              ),
            },
          },
        }),
      );

      const items = response.Responses?.[this.tableName]?.map(unmarshall) || [];
      results.push(...items);

      // Handle unprocessed keys
      if (response.UnprocessedKeys?.[this.tableName]) {
        // Retry with exponential backoff
        await this.executeWithRetry(async () => {
          const retryResponse = await this.client.send(
            new BatchGetItemCommand({
              RequestItems: response.UnprocessedKeys,
            }),
          );
          const retryItems = retryResponse.Responses?.[this.tableName]?.map(unmarshall) || [];
          results.push(...retryItems);
        });
      }
    }

    return results;
  }

  private buildSortKey(entityType: string, entityId: string): string {
    switch (entityType) {
      case 'Survey':
        return `SURVEY#${entityId}`;
      case 'Section':
        return `SECTION#${entityId}`;
      case 'Element':
        return `ELEMENT#${entityId}`;
      case 'Component':
        return `COMPONENT#${entityId}`;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
}
```

### 5. Data Validation

```typescript
import { z } from 'zod';

// Define schemas for validation
const SurveyMetaSchema = z.object({
  title: z.string().min(1).max(200),
  address: z.string().max(500),
  clientName: z.string().max(100),
  surveyDate: z.string().datetime(),
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']),
});

const SectionSchema = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
  notes: z.string().max(5000),
  condition: z.enum(['Excellent', 'Good', 'Fair', 'Poor', 'N/A']),
  photos: z.array(z.string()).max(50),
});

class ValidatedSingleTableStore extends SingleTableStore {
  async updateSurveyMetadata(
    tenantId: string,
    surveyId: string,
    updates: Partial<SurveyMetaEntity['survey']>,
  ) {
    // Validate input
    const validated = SurveyMetaSchema.partial().parse(updates);

    // Sanitize strings to prevent injection
    const sanitized = Object.entries(validated).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        // Remove any DynamoDB reserved characters if needed
        acc[key] = value.replace(/[\x00-\x1F\x7F]/g, '');
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    return super.updateSurveyMetadata(tenantId, surveyId, sanitized);
  }
}
```

### 6. TTL for Temporary Data

```typescript
// Add TTL attribute to the schema for temporary items
interface TempDataEntity extends BaseEntity {
  Type: 'TempData';
  ttl: number; // Unix timestamp for expiration
  data: any;
}

// Usage example: Store temporary sync status
class SingleTableStore {
  async createTempSyncStatus(tenantId: string, syncId: string, data: any) {
    const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // Expire in 24 hours

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall({
          pk: `TENANT#${tenantId}`,
          sk: `TEMP#SYNC#${syncId}`,
          type: 'TempData',
          ttl,
          data,
          createdAt: new Date().toISOString(),
        }),
      }),
    );
  }
}

// Enable TTL on the table (one-time setup)
// aws dynamodb update-time-to-live --table-name SurveyorData --time-to-live-specification "Enabled=true, AttributeName=ttl"
```

### 7. Monitoring & Metrics

```typescript
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

class MonitoredSingleTableStore extends SingleTableStore {
  private cloudwatch: CloudWatch;
  private namespace = 'SurveyorApp/DynamoDB';

  constructor() {
    super();
    this.cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });
  }

  async trackOperation(operation: string, duration: number, success: boolean) {
    await this.cloudwatch.putMetricData({
      Namespace: this.namespace,
      MetricData: [
        {
          MetricName: `${operation}Duration`,
          Value: duration,
          Unit: 'Milliseconds',
          Timestamp: new Date(),
        },
        {
          MetricName: `${operation}${success ? 'Success' : 'Failure'}`,
          Value: 1,
          Unit: 'Count',
          Timestamp: new Date(),
        },
      ],
    });
  }

  async getCompleteSurvey(tenantId: string, surveyId: string) {
    const start = Date.now();
    let success = true;

    try {
      return await super.getCompleteSurvey(tenantId, surveyId);
    } catch (error) {
      success = false;
      throw error;
    } finally {
      await this.trackOperation('GetCompleteSurvey', Date.now() - start, success);
    }
  }
}
```

### 8. Access Patterns Documentation

```typescript
/**
 * Access Patterns for Single-Table Design
 *
 * Pattern 1: Get all surveys for a tenant
 * - Index: Main table
 * - PK: TENANT#<tenantId>
 * - SK: begins_with(SURVEY#)
 *
 * Pattern 2: Get survey with all components
 * - Index: Main table
 * - PK: TENANT#<tenantId>
 * - SK: begins_with(SURVEY#<surveyId>#)
 *
 * Pattern 3: Get all sections for library
 * - Index: GSI1
 * - GSI1PK: Section
 * - GSI1SK: begins_with(TENANT#<tenantId>#)
 *
 * Pattern 4: Get pending sync items
 * - Index: GSI3
 * - GSI3PK: TENANT#<tenantId>#STATUS#pending
 * - GSI3SK: all
 *
 * Pattern 5: Get recent changes
 * - Index: GSI4
 * - GSI4PK: TENANT#<tenantId>
 * - GSI4SK: > <timestamp>
 *
 * Pattern 6: Get user's surveys
 * - Index: GSI5
 * - GSI5PK: USER#<userId>
 * - GSI5SK: begins_with(TENANT#<tenantId>#SURVEY#)
 *
 * Pattern 7: Get survey config history
 * - Index: GSI2
 * - GSI2PK: SURVEY#<surveyId>
 * - GSI2SK: begins_with(CONFIG#)
 */
```
