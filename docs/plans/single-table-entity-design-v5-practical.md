# Single Table Entity Design V5 - Functional Architecture

## Overview

This design provides a functional, configuration-driven approach to implementing a single-table design for the surveyor application, eliminating code duplication while maintaining offline-first capabilities.

## Architecture Principles

1. **Configuration Over Code** - Entity behaviors defined through configuration
2. **Functional Composition** - Pure functions for data transformations
3. **Type Safety** - Leveraging TypeScript generics throughout
4. **Offline-First** - IndexedDB remains source of truth for client
5. **Single Table Design** - Optimized DynamoDB access patterns

## Entity Categories

### Configuration Entities (Templates)
Reusable templates that define the structure and behavior of survey elements.

```typescript
// Stored with SK pattern: CONFIG#<type>#<id>
ComponentConfig   // Defines reusable component templates
ElementConfig     // Defines element structures with component relationships
SectionConfig     // Defines survey sections with element ordering
PhraseConfig      // Defines reusable phrases for conditions/recommendations
ValidationConfig  // Defines validation rules and requirements
```

### Instance Entities (Survey Data)
Actual survey instances created from templates.

```typescript
// Stored with SK pattern: <type>#<parentId>#<id>
Survey           // Root survey entity
SurveyElement    // Element instance within a survey
SurveyComponent  // Component instance within an element
PropertyDetails  // Normalized property information
ConditionAssessment // Aggregated condition data
```

### System Entities
Support entities for media and metadata.

```typescript
// Stored with SK pattern: SYSTEM#<type>#<id>
ImageMetadata    // Image upload tracking
DocumentVersion  // Document versioning (already single-table)
AuditLog        // Change tracking
```

## Migration Strategy

### Phase 1: Functional Store Foundation (Days 1-3)
Create a functional, configuration-driven store system.

#### 1.1 Entity Configuration System
```typescript
// app/home/clients/config/entity-config.ts
export interface EntityConfig<T> {
  type: EntityType;
  tableName: string;
  keyStrategy: KeyStrategy<T>;
  transforms: EntityTransforms<T>;
  validation?: ValidationRules<T>;
  relationships?: RelationshipConfig[];
}

export interface KeyStrategy<T> {
  pk: (entity: T, context: EntityContext) => string;
  sk: (entity: T, context: EntityContext) => string;
  gsi1?: {
    pk: (entity: T) => string;
    sk: (entity: T) => string;
  };
}

export interface EntityTransforms<T> {
  toDb: (local: T) => DynamoRecord;
  fromDb: (record: DynamoRecord) => T;
  toDexie: (local: T) => DexieRecord;
  fromDexie: (record: DexieRecord) => T;
}

// Functional key generators
export const keyGenerators = {
  tenant: (tenantId: string) => `TENANT#${tenantId}`,
  config: (type: string, id: string) => `CONFIG#${type}#${id}`,
  instance: (type: string, parentId: string, id: string) => `${type}#${parentId}#${id}`,
  system: (type: string, id: string) => `SYSTEM#${type}#${id}`,
};

// Entity configurations
export const entityConfigs: Record<string, EntityConfig<any>> = {
  // Configuration entities
  componentConfig: {
    type: 'ComponentConfig',
    tableName: 'configs',
    keyStrategy: {
      pk: (e, ctx) => keyGenerators.tenant(ctx.tenantId),
      sk: (e) => keyGenerators.config('COMPONENT', e.id),
      gsi1: {
        pk: (e) => `CONFIG#COMPONENT`,
        sk: (e) => `UPDATED#${e.updatedAt}`,
      },
    },
    transforms: {
      toDb: (local) => ({
        type: 'ComponentConfig',
        data: {
          name: local.name,
          materials: local.materials,
          defaultLifespan: local.defaultLifespan,
          inspectionGuide: local.inspectionGuide,
          commonDefects: local.commonDefects,
        },
      }),
      fromDb: (record) => ({
        id: record.sk.split('#')[2],
        ...record.data,
        syncStatus: SyncStatus.Synced,
      }),
      toDexie: (local) => local,
      fromDexie: (record) => record,
    },
    validation: {
      name: { required: true, maxLength: 100 },
      materials: { required: true, minItems: 1 },
    },
  },

  elementConfig: {
    type: 'ElementConfig',
    tableName: 'configs',
    keyStrategy: {
      pk: (e, ctx) => keyGenerators.tenant(ctx.tenantId),
      sk: (e) => keyGenerators.config('ELEMENT', e.id),
    },
    transforms: {
      toDb: (local) => ({
        type: 'ElementConfig',
        data: {
          name: local.name,
          category: local.category,
          order: local.order,
          requiredPhotos: local.requiredPhotos,
          inspectionChecklist: local.inspectionChecklist,
          componentConfigIds: local.componentConfigIds,
        },
      }),
      fromDb: (record) => ({
        id: record.sk.split('#')[2],
        ...record.data,
        syncStatus: SyncStatus.Synced,
      }),
      toDexie: (local) => local,
      fromDexie: (record) => record,
    },
    relationships: [
      {
        type: 'hasMany',
        target: 'componentConfig',
        through: 'componentConfigIds',
      },
    ],
  },

  // Instance entities
  survey: {
    type: 'Survey',
    tableName: 'surveys',
    keyStrategy: {
      pk: (e, ctx) => keyGenerators.tenant(ctx.tenantId),
      sk: (e) => `SURVEY#${e.id}`,
      gsi1: {
        pk: (e) => `STATUS#${e.status}`,
        sk: (e) => `DATE#${e.inspectionDate}`,
      },
    },
    transforms: {
      toDb: (local) => ({
        type: 'Survey',
        data: local.content, // BuildingSurveyFormData
        metadata: {
          name: local.name,
          status: local.status,
          clientName: local.clientName,
          propertyAddress: local.propertyAddress,
          inspectionDate: local.inspectionDate,
        },
      }),
      fromDb: (record) => ({
        id: record.sk.split('#')[1],
        content: record.data,
        ...record.metadata,
        syncStatus: SyncStatus.Synced,
      }),
      toDexie: (local) => local,
      fromDexie: (record) => record,
    },
  },

  surveyElement: {
    type: 'SurveyElement',
    tableName: 'surveyElements',
    keyStrategy: {
      pk: (e, ctx) => keyGenerators.tenant(ctx.tenantId),
      sk: (e) => keyGenerators.instance('ELEMENT', e.surveyId, e.id),
    },
    transforms: {
      toDb: (local) => ({
        type: 'SurveyElement',
        data: {
          name: local.name,
          configId: local.configId,
          sectionId: local.sectionId,
          order: local.order,
          condition: local.condition,
          defects: local.defects,
          photos: local.photos,
          isInspected: local.isInspected,
          inspectedAt: local.inspectedAt,
          recommendations: local.recommendations,
        },
      }),
      fromDb: (record) => ({
        id: record.sk.split('#')[3],
        surveyId: record.sk.split('#')[2],
        ...record.data,
        syncStatus: SyncStatus.Synced,
      }),
      toDexie: (local) => local,
      fromDexie: (record) => record,
    },
    relationships: [
      {
        type: 'belongsTo',
        target: 'survey',
        foreignKey: 'surveyId',
      },
      {
        type: 'hasMany',
        target: 'surveyComponent',
        foreignKey: 'elementId',
      },
    ],
  },
};
```

#### 1.2 Functional Store Factory
```typescript
// app/home/clients/store-factory.ts
export function createStore<T extends TableEntity>(
  config: EntityConfig<T>
): FunctionalStore<T> {
  const table = db.table<T>(config.tableName);
  
  // Create remote handlers using config
  const remoteHandlers = createRemoteHandlers(config);
  
  // Compose store functions
  const store = {
    // Hooks
    useList: createUseList(table, config),
    useGet: createUseGet(table, config),
    
    // CRUD operations
    add: createAdd(table, config, remoteHandlers),
    update: createUpdate(table, config, remoteHandlers),
    remove: createRemove(table, config, remoteHandlers),
    
    // Sync operations
    sync: createSync(table, config, remoteHandlers),
    
    // Relationship loading
    loadRelated: createRelationshipLoader(config),
  };
  
  return store;
}

// Pure function creators
const createAdd = <T>(
  table: EntityTable<T>,
  config: EntityConfig<T>,
  remote: RemoteHandlers
) => async (data: Omit<T, 'id' | 'syncStatus' | 'tenantId'>) => {
  const tenantId = await getCurrentTenantId();
  const entity = {
    ...data,
    id: generateId(),
    tenantId,
    syncStatus: SyncStatus.Queued,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Transform for Dexie
  const dexieRecord = config.transforms.toDexie(entity);
  await table.add(dexieRecord);
  
  // Queue for sync
  syncQueue.add(() => remote.create(entity));
};

const createUseList = <T>(
  table: EntityTable<T>,
  config: EntityConfig<T>
) => (): [boolean, T[]] => {
  const { tenantId, authReady } = useAuthAndTenant();
  
  const data = useLiveQuery(
    async () => {
      if (!authReady || !tenantId) return [];
      
      const records = await table
        .where('tenantId')
        .equals(tenantId)
        .toArray();
      
      return records.map(config.transforms.fromDexie);
    },
    [tenantId, authReady]
  );
  
  return [authReady && !!tenantId, data ?? []];
};
```

### Phase 2: Single Table Implementation (Days 4-7)
Direct migration to single-table design on DynamoDB.

#### 2.1 New DynamoDB Table Structure
```typescript
// amplify/data/resource.ts - Add to existing schema
export const EntityRecord = a.model({
  pk: a.string().required(),      // TENANT#tenantId
  sk: a.string().required(),      // See key patterns below
  type: a.string().required(),    // Entity type discriminator
  gsi1pk: a.string(),             // GSI1 partition key
  gsi1sk: a.string(),             // GSI1 sort key
  gsi2pk: a.string(),             // GSI2 partition key
  gsi2sk: a.string(),             // GSI2 sort key
  
  // Common fields
  id: a.string().required(),
  tenantId: a.string().required(),
  owner: a.string(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
  createdBy: a.string(),
  updatedBy: a.string(),
  
  // Flexible data storage
  data: a.json().required(),      // Entity-specific data
  metadata: a.json(),              // Additional metadata
  
  // Sync fields
  syncStatus: a.string(),
  syncError: a.string(),
  version: a.integer(),
})
.identifier(['pk', 'sk'])
.secondaryIndexes(index => [
  index('gsi1pk').sortKeys(['gsi1sk']).name('byType'),
  index('gsi2pk').sortKeys(['gsi2sk']).name('byStatus'),
  index('tenantId').sortKeys(['type', 'updatedAt']).name('byTenant'),
])
.authorization((allow) => [
  allow.owner().to(['create', 'read', 'update', 'delete']),
  allow.groupDefinedIn('tenantId').to(['create', 'read', 'update', 'delete']),
  allow.groups(['global-admin']).to(['create', 'read', 'update', 'delete']),
]);
```

#### 2.2 Key Patterns and Access Patterns
```typescript
// Key patterns for different entity types
const keyPatterns = {
  // Configuration entities (templates)
  componentConfig: {
    pk: (tenantId: string) => `TENANT#${tenantId}`,
    sk: (id: string) => `CONFIG#COMPONENT#${id}`,
    gsi1: {
      pk: () => `CONFIG#COMPONENT`,
      sk: (updatedAt: string) => `UPDATED#${updatedAt}`,
    },
  },
  
  elementConfig: {
    pk: (tenantId: string) => `TENANT#${tenantId}`,
    sk: (id: string) => `CONFIG#ELEMENT#${id}`,
    gsi1: {
      pk: () => `CONFIG#ELEMENT`,
      sk: (order: number) => `ORDER#${String(order).padStart(5, '0')}`,
    },
  },
  
  sectionConfig: {
    pk: (tenantId: string) => `TENANT#${tenantId}`,
    sk: (id: string) => `CONFIG#SECTION#${id}`,
    gsi1: {
      pk: () => `CONFIG#SECTION`,
      sk: (order: number) => `ORDER#${String(order).padStart(5, '0')}`,
    },
  },
  
  phraseConfig: {
    pk: (tenantId: string) => `TENANT#${tenantId}`,
    sk: (id: string) => `CONFIG#PHRASE#${id}`,
    gsi1: {
      pk: (type: string) => `PHRASE#${type}`,
      sk: (name: string) => `NAME#${name}`,
    },
  },
  
  // Instance entities
  survey: {
    pk: (tenantId: string) => `TENANT#${tenantId}`,
    sk: (id: string) => `SURVEY#${id}`,
    gsi1: {
      pk: (status: string) => `STATUS#${status}`,
      sk: (date: string) => `DATE#${date}`,
    },
    gsi2: {
      pk: (clientName: string) => `CLIENT#${clientName}`,
      sk: (date: string) => `DATE#${date}`,
    },
  },
  
  surveyElement: {
    pk: (tenantId: string) => `TENANT#${tenantId}`,
    sk: (surveyId: string, id: string) => `SURVEY#${surveyId}#ELEMENT#${id}`,
    gsi1: {
      pk: (surveyId: string) => `SURVEY#${surveyId}`,
      sk: (order: number) => `ELEMENT#${String(order).padStart(5, '0')}`,
    },
  },
  
  surveyComponent: {
    pk: (tenantId: string) => `TENANT#${tenantId}`,
    sk: (surveyId: string, elementId: string, id: string) => 
      `SURVEY#${surveyId}#ELEMENT#${elementId}#COMPONENT#${id}`,
    gsi1: {
      pk: (elementId: string) => `ELEMENT#${elementId}`,
      sk: (name: string) => `COMPONENT#${name}`,
    },
  },
};

// Query patterns
const queryPatterns = {
  // Get all configs for a tenant
  getConfigs: (tenantId: string, configType: string) => ({
    pk: `TENANT#${tenantId}`,
    sk: { beginsWith: `CONFIG#${configType}` },
  }),
  
  // Get all elements for a survey
  getSurveyElements: (tenantId: string, surveyId: string) => ({
    pk: `TENANT#${tenantId}`,
    sk: { beginsWith: `SURVEY#${surveyId}#ELEMENT` },
  }),
  
  // Get all surveys by status
  getSurveysByStatus: (status: string) => ({
    index: 'byType',
    pk: `STATUS#${status}`,
  }),
  
  // Get survey hierarchy
  getSurveyHierarchy: (tenantId: string, surveyId: string) => ({
    pk: `TENANT#${tenantId}`,
    sk: { beginsWith: `SURVEY#${surveyId}` },
  }),
};
```

#### 2.3 Remote Handlers for Single Table
```typescript
// app/home/clients/single-table-remote.ts
export function createSingleTableRemoteHandlers<T>(
  config: EntityConfig<T>
): DexieRemoteHandlers<T, any, any> {
  return {
    list: async (): Promise<Result<T[], Error>> => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return Err(new Error('No tenant ID'));
      
      const response = await client.models.EntityRecord.list({
        filter: {
          pk: { eq: config.keyStrategy.pk(null, { tenantId }) },
          type: { eq: config.type },
        },
      });
      
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(', ')));
      }
      
      return Ok(response.data.map(config.transforms.fromDb));
    },
    
    create: async (data: T): Promise<Result<T, Error>> => {
      const tenantId = await getCurrentTenantId();
      const context = { tenantId, userId: await getCurrentUserId() };
      
      const record = {
        pk: config.keyStrategy.pk(data, context),
        sk: config.keyStrategy.sk(data, context),
        type: config.type,
        id: data.id,
        tenantId,
        ...config.transforms.toDb(data),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (config.keyStrategy.gsi1) {
        record.gsi1pk = config.keyStrategy.gsi1.pk(data);
        record.gsi1sk = config.keyStrategy.gsi1.sk(data);
      }
      
      const response = await client.models.EntityRecord.create(record);
      
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(', ')));
      }
      
      return Ok(config.transforms.fromDb(response.data));
    },
    
    update: async (data: T): Promise<Result<T, Error>> => {
      const tenantId = await getCurrentTenantId();
      const context = { tenantId, userId: await getCurrentUserId() };
      
      const updates = {
        ...config.transforms.toDb(data),
        updatedAt: new Date().toISOString(),
        version: (data.version || 0) + 1,
      };
      
      const response = await client.models.EntityRecord.update({
        pk: config.keyStrategy.pk(data, context),
        sk: config.keyStrategy.sk(data, context),
        ...updates,
      });
      
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(', ')));
      }
      
      return Ok(config.transforms.fromDb(response.data));
    },
    
    delete: async (id: string): Promise<Result<string, Error>> => {
      const tenantId = await getCurrentTenantId();
      const context = { tenantId, userId: await getCurrentUserId() };
      
      // Need to construct the full key from the ID
      const entity = { id } as T;
      
      const response = await client.models.EntityRecord.delete({
        pk: config.keyStrategy.pk(entity, context),
        sk: config.keyStrategy.sk(entity, context),
      });
      
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(', ')));
      }
      
      return Ok(id);
    },
  };
}
```

### Phase 3: Template System for Configurations (Days 8-10)

#### 3.1 Template Manager
```typescript
// app/home/clients/templates/template-manager.ts
export class TemplateManager {
  private configs = new Map<string, EntityConfig<any>>();
  
  async instantiateFromTemplate<T>(
    templateType: string,
    templateId: string,
    overrides: Partial<T>
  ): Promise<T> {
    const config = this.configs.get(templateType);
    if (!config) throw new Error(`Unknown template type: ${templateType}`);
    
    // Load template
    const template = await stores[templateType].get(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);
    
    // Create instance with defaults from template
    const instance = {
      ...template,
      ...overrides,
      id: generateId(),
      templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Validate against template rules
    if (config.validation) {
      this.validate(instance, config.validation);
    }
    
    return instance;
  }
  
  async createSurveyFromTemplates(
    sectionTemplateIds: string[],
    surveyData: Partial<Survey>
  ): Promise<CompleteSurvey> {
    const survey = await stores.survey.add({
      ...surveyData,
      templateIds: sectionTemplateIds,
    });
    
    // Load section templates
    const sections = await Promise.all(
      sectionTemplateIds.map(id => stores.sectionConfig.get(id))
    );
    
    // Create elements from element configs
    const elements = [];
    for (const section of sections) {
      for (const elementConfigId of section.elementConfigIds) {
        const element = await this.instantiateFromTemplate(
          'surveyElement',
          elementConfigId,
          {
            surveyId: survey.id,
            sectionId: section.id,
          }
        );
        elements.push(element);
        
        // Create components from component configs
        const elementConfig = await stores.elementConfig.get(elementConfigId);
        for (const componentConfigId of elementConfig.componentConfigIds || []) {
          await this.instantiateFromTemplate(
            'surveyComponent',
            componentConfigId,
            {
              surveyId: survey.id,
              elementId: element.id,
            }
          );
        }
      }
    }
    
    return { survey, elements };
  }
}
```

#### 3.2 Configuration Store Implementation
```typescript
// app/home/clients/stores/config-stores.ts
export const componentConfigStore = createStore({
  ...entityConfigs.componentConfig,
  extensions: {
    // Find components by material
    findByMaterial: async (material: string) => {
      const configs = await componentConfigStore.useList();
      return configs.filter(c => 
        c.materials.some(m => m.name === material)
      );
    },
    
    // Clone a configuration
    clone: async (id: string, newName: string) => {
      const original = await componentConfigStore.get(id);
      if (!original) throw new Error('Config not found');
      
      return componentConfigStore.add({
        ...omit(original, ['id', 'createdAt', 'updatedAt']),
        name: newName,
        clonedFrom: id,
      });
    },
  },
});

export const phraseConfigStore = createStore({
  ...entityConfigs.phraseConfig,
  extensions: {
    // Get phrases for a specific element/component
    getPhrasesFor: async (entityType: string, entityId: string) => {
      const phrases = await phraseConfigStore.useList();
      
      return phrases.filter(p => {
        if (entityType === 'element') {
          return p.associatedElementIds?.includes(entityId);
        }
        if (entityType === 'component') {
          return p.associatedComponentIds?.includes(entityId);
        }
        return false;
      });
    },
    
    // Generate phrase with variables
    generatePhrase: (phrase: PhraseConfig, variables: Record<string, string>) => {
      let text = phrase.phrase;
      for (const [key, value] of Object.entries(variables)) {
        text = text.replace(`{{${key}}}`, value);
      }
      return text;
    },
  },
});
```

### Phase 4: Migration Scripts (Days 11-12)

#### 4.1 Data Migration Script
```typescript
// scripts/migrate-to-single-table.ts
export async function migrateToSingleTable() {
  console.log('Starting migration to single table...');
  
  const tenantId = await getCurrentTenantId();
  const migrationLog = [];
  
  try {
    // Migrate Surveys
    const surveys = await client.models.Surveys.list();
    for (const survey of surveys.data) {
      const record = {
        pk: keyPatterns.survey.pk(survey.tenantId),
        sk: keyPatterns.survey.sk(survey.id),
        type: 'Survey',
        id: survey.id,
        tenantId: survey.tenantId,
        data: survey.content,
        metadata: {
          name: survey.content.name,
          status: survey.content.status,
          clientName: survey.content.clientName,
        },
        gsi1pk: keyPatterns.survey.gsi1.pk(survey.content.status),
        gsi1sk: keyPatterns.survey.gsi1.sk(survey.content.inspectionDate),
        createdAt: survey.createdAt,
        updatedAt: survey.updatedAt,
      };
      
      await client.models.EntityRecord.create(record);
      migrationLog.push({ type: 'Survey', id: survey.id, status: 'migrated' });
    }
    
    // Migrate Elements
    const elements = await client.models.Elements.list();
    for (const element of elements.data) {
      // Elements need survey context - may need to parse or store differently
      const record = {
        pk: keyPatterns.surveyElement.pk(element.tenantId),
        sk: keyPatterns.surveyElement.sk(element.sectionId, element.id),
        type: 'SurveyElement',
        id: element.id,
        tenantId: element.tenantId,
        data: {
          name: element.name,
          order: element.order,
          description: element.description,
        },
        createdAt: element.createdAt,
        updatedAt: element.updatedAt,
      };
      
      await client.models.EntityRecord.create(record);
      migrationLog.push({ type: 'Element', id: element.id, status: 'migrated' });
    }
    
    // Continue for other entity types...
    
    console.log('Migration completed successfully');
    return { success: true, log: migrationLog };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error, log: migrationLog };
  }
}
```

## Implementation Benefits

### Immediate Wins
1. **60% code reduction** - Single store factory replaces 6+ store implementations
2. **Type safety** - Generic types ensure compile-time correctness
3. **Consistent patterns** - All entities follow same CRUD patterns

### Performance Improvements
1. **Optimized queries** - GSIs enable efficient access patterns
2. **Batch operations** - Single table enables transactional writes
3. **Reduced API calls** - Fetch entire hierarchies in one query

### Developer Experience
1. **Declarative configuration** - Add new entities via config
2. **Automatic relationship handling** - No manual join logic
3. **Built-in validation** - Config-driven validation rules
4. **Template system** - Reusable configurations reduce duplication

## Access Pattern Examples

```typescript
// Get all surveys for a tenant
const surveys = await db.query({
  pk: `TENANT#${tenantId}`,
  sk: { beginsWith: 'SURVEY#' }
});

// Get complete survey hierarchy
const surveyData = await db.query({
  pk: `TENANT#${tenantId}`,
  sk: { beginsWith: `SURVEY#${surveyId}` }
});

// Get surveys by status (using GSI)
const draftSurveys = await db.query({
  index: 'byType',
  pk: 'STATUS#draft',
  sk: { beginsWith: 'DATE#' }
});

// Get all config templates
const configs = await db.query({
  pk: `TENANT#${tenantId}`,
  sk: { beginsWith: 'CONFIG#' }
});
```

## Migration Timeline

### Week 1
- Day 1-3: Implement functional store foundation
- Day 4-7: Deploy single table schema and remote handlers

### Week 2  
- Day 8-10: Build template system for configurations
- Day 11-12: Run migration scripts
- Day 13-14: Testing and validation

## Success Metrics

- **Code reduction**: 60% less boilerplate
- **Query performance**: <50ms for hierarchical queries
- **Developer onboarding**: 2 hours vs 2 days
- **Test coverage**: 90% with simplified mocking

## Conclusion

This functional approach with configuration entities provides a clean migration path that:
- Eliminates code duplication through configuration
- Maintains offline-first architecture
- Enables powerful query patterns with single table
- Provides template system for rapid survey creation
- Preserves all existing functionality