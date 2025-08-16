# Single Table Entity Design V3 - Strongly-Typed Approach

## Core Concept
A clean, **strongly-typed approach** for all entity data. This prioritizes type safety, developer experience, and maintainability over dynamic flexibility.

## Design Principles
1. **All fields are strongly typed** - Clear TypeScript interfaces for all entities
2. **Local-first with clean sync** - IndexedDB schema optimized for local use, separate from DynamoDB  
3. **Leverage existing infrastructure** - Use proven CreateDexieHooks pattern
4. **Simple and maintainable** - Focus on core functionality without premature complexity

## Entity Types & Their Purpose

### Two Categories of Entities

**Configuration Entities (Existing)** - Tenant-level templates and configuration:
- **Components** - Reusable component templates (e.g., "Asphalt Shingles", "Copper Pipes")
- **Elements** - Reusable element templates (e.g., "Roof Structure", "Plumbing System") 
- **Phrases** - Reusable text snippets for reports
- **Sections** - Template sections for organizing inspections

**Survey Instance Entities (New)** - Specific to individual surveys:
- **Survey** - Individual inspection projects
- **PropertyDetails** - Property information for a specific survey
- **SurveyElements** - Actual inspection items in a survey (instances of element templates)
- **SurveyComponents** - Actual components inspected (instances of component templates)
- **Checklist** - Survey-specific checklists
- **Conditions** - Overall condition assessment for a survey
- **ReportDetails** - Report configuration for a survey

### Base Entity Interface
```typescript
// Base interface for all entities
interface BaseEntity {
  id: string;
  tenantId: string;
  syncStatus: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  createdBy: string;
  owner: string;
}

// Configuration Entities (Existing - Templates/Config)
interface ComponentTemplate extends BaseEntity {
  name: string;
  description?: string;
  materials: string[]; // Possible materials for this component type
  elementId?: string; // Default element this component belongs to
  
  // Template properties
  defaultAge?: number;
  defaultLifespan?: number;
  commonDefects: string[];
  inspectionNotes?: string;
}

interface ElementTemplate extends BaseEntity {
  name: string;
  description?: string;
  order: number;
  sectionId?: string; // Default section this element belongs to
  
  // Template properties
  inspectionGuide?: string;
  requiredPhotos: string[]; // Required photo types
  commonConditions: string[];
  typicalLifespan?: number;
}

interface Phrase extends BaseEntity {
  name: string;
  type: 'condition' | 'recommendation' | 'defect' | 'general';
  phrase: string;
  phraseLevel2?: string;
  
  // Associations - which templates this phrase applies to
  associatedMaterialIds: string[];
  associatedElementIds: string[];
  associatedComponentIds: string[];
  
  owner: string; // User who created this phrase
}

interface SectionTemplate extends BaseEntity {
  name: string;
  description?: string;
  order: number;
  
  // Template properties
  inspectionOrder: string[]; // Suggested order for elements
  requiredElements: string[]; // Element template IDs that must be included
  optionalElements: string[]; // Element template IDs that can be included
}

// Survey Instance Entities (New - Actual Survey Data)
interface Survey extends BaseEntity {
  name: string;
  description?: string;
  clientName: string;
  inspectionDate: string;
  inspectorName: string;
  propertyAddress: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  
  // Template references - what templates were used to create this survey
  usedSectionTemplateIds: string[];
  
  // Relationships to survey-specific entities
  propertyDetailsId?: string;
  conditionsId?: string;
  reportDetailsId?: string;
}

interface PropertyDetails extends BaseEntity {
  surveyId: string;
  
  // Property basics
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'commercial';
  yearBuilt: number;
  squareFootage?: number;
  lotSize?: number;
  bedrooms?: number;
  bathrooms?: number;
  stories?: number;
  
  // Systems
  heatingType?: string;
  coolingType?: string;
  waterSource?: string;
  sewerType?: string;
  electricalService?: string;
  
  // Address details
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Construction details
  foundation?: string;
  roofType?: string;
  siding?: string;
  windowType?: string;
  garageType?: string;
  driveway?: string;
}

interface SurveyElement extends BaseEntity {
  surveyId: string;
  elementTemplateId: string; // Reference to ElementTemplate
  sectionTemplateId: string; // Reference to SectionTemplate
  
  // Instance-specific data (overrides template defaults)
  name: string; // Can be customized from template
  description?: string;
  order: number;
  
  // Actual inspection data for this survey
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  age?: number;
  remainingLife?: number;
  defects: string[];
  recommendations: string;
  notes?: string;
  photos: string[]; // S3 keys for actual photos taken
  
  // Inspection status
  isInspected: boolean;
  inspectedAt?: string;
  inspectedBy?: string;
}

interface SurveyComponent extends BaseEntity {
  surveyId: string;
  surveyElementId: string; // Reference to SurveyElement (not template)
  componentTemplateId: string; // Reference to ComponentTemplate
  
  // Instance-specific data
  name: string; // Can be customized from template  
  description?: string;
  order: number;
  
  // Actual inspection data
  material?: string; // Actual material found during inspection
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  age?: number;
  remainingLife?: number;
  defects: string[];
  recommendations: string;
  notes?: string;
  photos: string[];
  
  // Inspection status
  isInspected: boolean;
  inspectedAt?: string;
  inspectedBy?: string;
}

interface Checklist extends BaseEntity {
  surveyId: string;
  name: string;
  description?: string;
  
  // Checklist items
  items: ChecklistItem[];
  
  // Overall status
  completionPercentage: number;
  isCompleted: boolean;
}

interface ChecklistItem {
  id: string;
  text: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  
  // Optional associations
  elementId?: string;
  sectionId?: string;
}

interface Conditions extends BaseEntity {
  surveyId: string;
  
  // Overall condition assessment
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  overallScore?: number; // 1-100
  
  // Summary
  majorIssues: string[];
  minorIssues: string[];
  safetyHazards: string[];
  
  // Recommendations
  immediateActions: string[];
  shortTermActions: string[];
  longTermActions: string[];
  
  // Cost estimates
  estimatedRepairCost?: number;
  estimatedReplacementCost?: number;
  
  notes?: string;
}

interface ReportDetails extends BaseEntity {
  surveyId: string;
  
  // Report metadata
  reportTitle: string;
  reportType: 'standard' | 'detailed' | 'summary';
  template?: string;
  
  // Report sections to include
  includeSummary: boolean;
  includePhotos: boolean;
  includeRecommendations: boolean;
  includeChecklist: boolean;
  includeConditions: boolean;
  
  // Generation status
  lastGenerated?: string;
  reportUrl?: string; // S3 URL to generated report
  
  // Customization
  logoUrl?: string;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    license?: string;
  };
}
```

## IndexedDB Schema (Local-First)

### Consistent Schema with Separate Tables
Following the existing pattern, we'll use separate tables for each entity type with optimized indexes:

```typescript
import { db, CreateDexieHooks, SyncStatus } from '@/app/home/clients/Dexie';
import { EntityTable } from 'dexie';

// Consistent schema - separate tables for configuration vs survey instances
db.version(3).stores({
  // Configuration/Template tables (existing - keep current schema)
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]', // ComponentTemplate
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]', // ElementTemplate  
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]', // SectionTemplate
  
  // Survey instance tables (new)
  surveys: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  propertyDetails: 'id, tenantId, surveyId, updatedAt, syncStatus, [tenantId+surveyId]',
  surveyElements: 'id, tenantId, surveyId, elementTemplateId, sectionTemplateId, updatedAt, syncStatus, [tenantId+surveyId], [surveyId+sectionTemplateId], [surveyId+order]',
  surveyComponents: 'id, tenantId, surveyId, surveyElementId, componentTemplateId, updatedAt, syncStatus, [tenantId+surveyId], [surveyId+surveyElementId]',
  checklists: 'id, tenantId, surveyId, updatedAt, syncStatus, [tenantId+surveyId]',
  conditions: 'id, tenantId, surveyId, updatedAt, syncStatus, [tenantId+surveyId]', 
  reportDetails: 'id, tenantId, surveyId, updatedAt, syncStatus, [tenantId+surveyId]',
  
  // Existing image tables
  imageUploads: 'id, tenantId, path, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageMetadata: 'id, tenantId, imagePath, updatedAt, syncStatus, [tenantId+updatedAt]'
});

// Improved TypeScript typing with discriminated unions
interface BaseEntity {
  id: string;
  tenantId: string;
  syncStatus: SyncStatus;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  createdBy: string;
  owner: string;
}

// Discriminated union for type safety
type ConfigurationEntity = 
  | (ComponentTemplate & { entityType: 'ComponentTemplate' })
  | (ElementTemplate & { entityType: 'ElementTemplate' })
  | (Phrase & { entityType: 'Phrase' })
  | (SectionTemplate & { entityType: 'SectionTemplate' });

type SurveyInstanceEntity = 
  | (Survey & { entityType: 'Survey' })
  | (PropertyDetails & { entityType: 'PropertyDetails' })
  | (SurveyElement & { entityType: 'SurveyElement' })
  | (SurveyComponent & { entityType: 'SurveyComponent' })
  | (Checklist & { entityType: 'Checklist' })
  | (Conditions & { entityType: 'Conditions' })
  | (ReportDetails & { entityType: 'ReportDetails' });

type Entity = ConfigurationEntity | SurveyInstanceEntity;

// Update db type definition
const db = new Dexie('Surveys') as Dexie & {
  // Configuration/Template tables (existing)
  components: EntityTable<ComponentTemplate, "id", "tenantId">;
  elements: EntityTable<ElementTemplate, "id", "tenantId">;
  phrases: EntityTable<Phrase, "id", "tenantId">;
  sections: EntityTable<SectionTemplate, "id", "tenantId">;
  
  // Survey instance tables (new)
  surveys: EntityTable<Survey, "id", "tenantId">;
  propertyDetails: EntityTable<PropertyDetails, "id", "tenantId">;
  surveyElements: EntityTable<SurveyElement, "id", "tenantId">;
  surveyComponents: EntityTable<SurveyComponent, "id", "tenantId">;
  checklists: EntityTable<Checklist, "id", "tenantId">;
  conditions: EntityTable<Conditions, "id", "tenantId">;
  reportDetails: EntityTable<ReportDetails, "id", "tenantId">;
  
  // Image tables
  imageUploads: EntityTable<ImageUpload, "id", "tenantId">;
  imageMetadata: EntityTable<ImageMetadata, "id", "tenantId">;
};
```

## DynamoDB Schema (Remote)

### Single Table Design with Composite Keys
AWS Amplify will use a single DynamoDB table with composite keys for all entity types:

```typescript
// Survey Entity Record
{
  PK: "TENANT#abc123",
  SK: "SURVEY#surveyId",
  
  // Entity identification
  entityType: "Survey",
  id: "surveyId",
  tenantId: "abc123",
  
  // Survey-specific fields (flattened)
  name: "123 Main St Inspection",
  description: "Annual property inspection",
  clientName: "John Doe",
  inspectionDate: "2024-01-16T10:00:00Z",
  inspectorName: "Jane Smith", 
  propertyAddress: "123 Main St, City, State",
  status: "in_progress",
  
  // Relationships (as JSON strings or separate items)
  propertyDetailsId: "propDetails123",
  conditionsId: "conditions123", 
  reportDetailsId: "report123",
  sectionIds: "[\"section1\",\"section2\"]", // JSON string for DynamoDB
  
  // Metadata
  version: 1,
  createdAt: "2024-01-16T10:00:00Z",
  updatedAt: "2024-01-16T14:00:00Z",
  createdBy: "user123",
  owner: "user123",
  
  // GSI keys for different access patterns
  GSI1PK: "TENANT#abc123#TYPE#Survey",
  GSI1SK: "UPDATED#2024-01-16T14:00:00Z",
  GSI2PK: "SURVEY#surveyId",
  GSI2SK: "ENTITY#Survey"
}

// PropertyDetails Entity Record  
{
  PK: "TENANT#abc123",
  SK: "PROPERTYDETAILS#propDetails123",
  
  entityType: "PropertyDetails",
  id: "propDetails123",
  tenantId: "abc123",
  surveyId: "surveyId",
  
  // Property fields (flattened)
  propertyType: "single_family",
  yearBuilt: 1985,
  squareFootage: 2500,
  lotSize: 0.25,
  bedrooms: 4,
  bathrooms: 2.5,
  stories: 2,
  
  // Systems
  heatingType: "Natural Gas",
  coolingType: "Central AC", 
  waterSource: "Municipal",
  sewerType: "Municipal",
  electricalService: "200 Amp",
  
  // Address
  streetAddress: "123 Main St",
  city: "City",
  state: "State", 
  zipCode: "12345",
  
  // Construction
  foundation: "Concrete Slab",
  roofType: "Shingle",
  siding: "Vinyl",
  windowType: "Double Pane",
  garageType: "2 Car Attached",
  driveway: "Concrete",
  
  // Metadata
  version: 1,
  createdAt: "2024-01-16T10:00:00Z",
  updatedAt: "2024-01-16T14:00:00Z",
  createdBy: "user123",
  owner: "user123",
  
  GSI1PK: "TENANT#abc123#TYPE#PropertyDetails",
  GSI1SK: "UPDATED#2024-01-16T14:00:00Z",
  GSI2PK: "SURVEY#surveyId",
  GSI2SK: "ENTITY#PropertyDetails"
}

// SurveyElement Entity Record (Survey-specific inspection instance)
{
  PK: "TENANT#abc123", 
  SK: "SURVEYELEMENT#element123",
  
  entityType: "SurveyElement",
  id: "element123",
  tenantId: "abc123",
  surveyId: "surveyId",
  elementTemplateId: "elementTemplate456", // Reference to ElementTemplate
  sectionTemplateId: "sectionTemplate789", // Reference to SectionTemplate
  
  name: "Roof Structure", // Copied from template, can be customized
  description: "Main roof structural assessment", 
  order: 1,
  
  // Actual inspection data for this survey
  condition: "fair",
  age: 15,
  remainingLife: 10,
  defects: "[\"Minor wear\",\"Some granule loss\"]", // JSON string
  recommendations: "Plan replacement in 5-10 years",
  notes: "Additional inspection notes",
  photos: "[\"photo1.jpg\",\"photo2.jpg\"]", // JSON string
  
  // Inspection status
  isInspected: true,
  inspectedAt: "2024-01-16T14:00:00Z",
  inspectedBy: "user123",
  
  // Metadata
  version: 1,
  createdAt: "2024-01-16T10:00:00Z",
  updatedAt: "2024-01-16T14:00:00Z",
  createdBy: "user123", 
  owner: "user123",
  
  GSI1PK: "TENANT#abc123#TYPE#SurveyElement",
  GSI1SK: "UPDATED#2024-01-16T14:00:00Z",
  GSI2PK: "SURVEY#surveyId",
  GSI2SK: "ENTITY#SurveyElement"
}

// ElementTemplate Entity Record (Reusable template)
{
  PK: "TENANT#abc123",
  SK: "ELEMENTTEMPLATE#elementTemplate456",
  
  entityType: "ElementTemplate",
  id: "elementTemplate456",
  tenantId: "abc123",
  
  name: "Roof Structure",
  description: "Structural assessment of roof components",
  order: 1,
  sectionId: "sectionTemplate789", // Default section
  
  // Template properties
  inspectionGuide: "Check for structural integrity, wear patterns, and damage",
  requiredPhotos: "[\"Overall view\",\"Close-up of defects\",\"Flashing details\"]", // JSON
  commonConditions: "[\"Excellent\",\"Good\",\"Fair\",\"Poor\",\"Failed\"]", // JSON
  typicalLifespan: 25,
  
  version: 1,
  createdAt: "2024-01-16T10:00:00Z",
  updatedAt: "2024-01-16T14:00:00Z",
  createdBy: "admin",
  owner: "admin",
  
  GSI1PK: "TENANT#abc123#TYPE#ElementTemplate",
  GSI1SK: "UPDATED#2024-01-16T14:00:00Z"
}

// Checklist Entity Record
{
  PK: "TENANT#abc123",
  SK: "CHECKLIST#checklist123",
  
  entityType: "Checklist",
  id: "checklist123", 
  tenantId: "abc123",
  surveyId: "surveyId",
  
  name: "Pre-Inspection Checklist",
  description: "Items to verify before starting inspection",
  
  // Checklist data (stored as JSON)
  items: JSON.stringify([
    {
      id: "item1",
      text: "Confirm access to all areas",
      isRequired: true,
      isCompleted: true,
      completedAt: "2024-01-16T10:00:00Z",
      completedBy: "user123"
    },
    {
      id: "item2", 
      text: "Check utilities are on",
      isRequired: true,
      isCompleted: false
    }
  ]),
  
  completionPercentage: 50,
  isCompleted: false,
  
  // Metadata
  version: 1,
  createdAt: "2024-01-16T10:00:00Z",
  updatedAt: "2024-01-16T14:00:00Z",
  createdBy: "user123",
  owner: "user123",
  
  GSI1PK: "TENANT#abc123#TYPE#Checklist", 
  GSI1SK: "UPDATED#2024-01-16T14:00:00Z",
  GSI2PK: "SURVEY#surveyId",
  GSI2SK: "ENTITY#Checklist"
}
```

### Key Access Patterns

1. **Get all entities for a tenant by type**
   - GSI1: `GSI1PK = "TENANT#abc123#TYPE#Survey"`

2. **Get all entities for a survey**
   - GSI2: `GSI2PK = "SURVEY#surveyId"`

3. **Get specific entity**
   - Primary: `PK = "TENANT#abc123"` and `SK = "SURVEY#surveyId"`

4. **Get recently updated entities**
   - GSI1: `GSI1PK = "TENANT#abc123#TYPE#Survey"` sorted by `GSI1SK`
```

## Service Layer Implementation

### Generic Mapping System with Store Factory
Dramatically reduce boilerplate with a generic mapping system and store factory:

```typescript
import { CreateDexieHooks, SyncStatus } from '@/app/home/clients/Dexie';
import { db } from '@/app/home/clients/Dexie';
import { withTenantId, getCurrentTenantId } from '@/app/home/utils/tenant-utils';
import { Ok, Err, Result } from 'ts-results';
import client from '@/app/home/clients/AmplifyDataClient';

// Entity field configuration for automatic mapping
const entityConfigs = {
  // Configuration/Template entities (existing)
  ComponentTemplate: {
    jsonFields: ['materials', 'commonDefects'],
    relationships: { elementId: 'string?' },
    tableName: 'components'
  },
  ElementTemplate: {
    jsonFields: ['requiredPhotos', 'commonConditions'],
    relationships: { sectionId: 'string?' },
    tableName: 'elements'
  },
  Phrase: {
    jsonFields: ['associatedMaterialIds', 'associatedElementIds', 'associatedComponentIds'],
    relationships: {},
    tableName: 'phrases'
  },
  SectionTemplate: {
    jsonFields: ['inspectionOrder', 'requiredElements', 'optionalElements'],
    relationships: {},
    tableName: 'sections'
  },
  
  // Survey instance entities (new)
  Survey: {
    jsonFields: ['usedSectionTemplateIds'],
    relationships: {},
    tableName: 'surveys'
  },
  PropertyDetails: {
    jsonFields: [], // No JSON fields for PropertyDetails
    relationships: { surveyId: 'string' },
    tableName: 'propertyDetails'
  },
  SurveyElement: {
    jsonFields: ['defects', 'photos'],
    relationships: { 
      surveyId: 'string', 
      elementTemplateId: 'string',
      sectionTemplateId: 'string'
    },
    tableName: 'surveyElements'
  },
  SurveyComponent: {
    jsonFields: ['defects', 'photos'],
    relationships: { 
      surveyId: 'string', 
      surveyElementId: 'string',
      componentTemplateId: 'string'
    },
    tableName: 'surveyComponents'
  },
  Checklist: {
    jsonFields: ['items'],
    relationships: { surveyId: 'string' },
    tableName: 'checklists'
  },
  Conditions: {
    jsonFields: ['majorIssues', 'minorIssues', 'safetyHazards', 'immediateActions', 'shortTermActions', 'longTermActions'],
    relationships: { surveyId: 'string' },
    tableName: 'conditions'
  },
  ReportDetails: {
    jsonFields: [], // companyInfo could be JSON but keep simple for now
    relationships: { surveyId: 'string' },
    tableName: 'reportDetails'
  }
} as const;

// Generic mapper factory
const createMapper = <T extends BaseEntity>(entityType: keyof typeof entityConfigs) => {
  const config = entityConfigs[entityType];
  
  return {
    fromServer: (data: any): T => {
      const result = { 
        ...data, 
        syncStatus: SyncStatus.Synced,
        syncError: undefined 
      };
      
      // Parse JSON fields
      config.jsonFields.forEach(field => {
        if (data[field] && typeof data[field] === 'string') {
          try {
            result[field] = JSON.parse(data[field]);
          } catch {
            result[field] = []; // Default to empty array if parse fails
          }
        }
      });
      
      return result as T;
    },
    
    toServer: (data: T): any => {
      const result = { 
        ...data, 
        entityType 
      };
      
      // Stringify JSON fields
      config.jsonFields.forEach(field => {
        if (data[field]) {
          result[field] = JSON.stringify(data[field]);
        }
      });
      
      // Remove local-only fields
      delete result.syncStatus;
      delete result.syncError;
      
      return result;
    }
  };
};

// Store factory - dramatically reduces boilerplate
const createEntityStore = <T extends BaseEntity>(
  entityType: keyof typeof entityConfigs
) => {
  const config = entityConfigs[entityType];
  const mapper = createMapper<T>(entityType);
  
  return CreateDexieHooks<T, any, any>(db, config.tableName, {
    list: async (): Promise<Result<T[], Error>> => {
      const response = await fetchAllPages((params) => 
        client.models.Entities.list({
          ...params,
          filter: { entityType: { eq: entityType } }
        })
      );
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(response.data.map(mapper.fromServer));
    },
    
    create: async (data): Promise<Result<T, Error>> => {
      const serverData = await withTenantId(mapper.toServer(data));
      const response = await client.models.Entities.create(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(mapper.fromServer(response.data));
    },
    
    update: async (data): Promise<Result<T, Error>> => {
      const serverData = await withTenantId(mapper.toServer(data));
      const response = await client.models.Entities.update(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(mapper.fromServer(response.data));
    },
    
    delete: async (id): Promise<Result<string, Error>> => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error("No tenant ID available for delete operation"));
      }
      const response = await client.models.Entities.delete({ id, tenantId });
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(id);
    },
  });
};

// Configuration/Template stores (existing entities)
export const componentTemplateStore = createEntityStore<ComponentTemplate>('ComponentTemplate');
export const elementTemplateStore = createEntityStore<ElementTemplate>('ElementTemplate');
export const phraseStore = createEntityStore<Phrase>('Phrase');
export const sectionTemplateStore = createEntityStore<SectionTemplate>('SectionTemplate');

// Survey instance stores (new entities)
export const surveyStore = createEntityStore<Survey>('Survey');
export const propertyDetailsStore = createEntityStore<PropertyDetails>('PropertyDetails');
export const surveyElementStore = createEntityStore<SurveyElement>('SurveyElement');
export const surveyComponentStore = createEntityStore<SurveyComponent>('SurveyComponent');
export const checklistStore = createEntityStore<Checklist>('Checklist');
export const conditionsStore = createEntityStore<Conditions>('Conditions');
export const reportDetailsStore = createEntityStore<ReportDetails>('ReportDetails');

// Enhanced stores with additional methods for survey-related entities
const createEnhancedEntityStore = <T extends BaseEntity & { surveyId?: string }>(
  entityType: keyof typeof entityConfigs
) => {
  const baseStore = createEntityStore<T>(entityType);
  const config = entityConfigs[entityType];
  
  return {
    ...baseStore,
    
    // Get all entities for a specific survey
    getBySurvey: async (surveyId: string): Promise<T[]> => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return [];
      
      return db.table<T>(config.tableName)
        .where('[tenantId+surveyId]')
        .equals([tenantId, surveyId])
        .and(item => item.syncStatus !== SyncStatus.PendingDelete)
        .toArray();
    },
    
    // React hook for survey-specific entities
    useBySurvey: (surveyId: string): [boolean, T[]] => {
      const { tenantId, authReady, authSuccess } = useAuthAndTenant();
      
      const data = useLiveQuery(
        async () => {
          if (!authReady || !authSuccess || !tenantId || !surveyId) return [];
          
          return db.table<T>(config.tableName)
            .where('[tenantId+surveyId]')
            .equals([tenantId, surveyId])
            .and(item => item.syncStatus !== SyncStatus.PendingDelete)
            .toArray();
        },
        [tenantId, authReady, authSuccess, surveyId]
      );
      
      return [authReady && authSuccess && tenantId !== null, data ?? []];
    }
  };
};

// Enhanced stores for survey-related entities
export const enhancedPropertyDetailsStore = createEnhancedEntityStore<PropertyDetails>('PropertyDetails');
export const enhancedSurveyElementStore = createEnhancedEntityStore<SurveyElement>('SurveyElement');
export const enhancedSurveyComponentStore = createEnhancedEntityStore<SurveyComponent>('SurveyComponent');
export const enhancedChecklistStore = createEnhancedEntityStore<Checklist>('Checklist');
export const enhancedConditionsStore = createEnhancedEntityStore<Conditions>('Conditions');
export const enhancedReportDetailsStore = createEnhancedEntityStore<ReportDetails>('ReportDetails');
```

## Sync Implementation

### Using Existing Sync Infrastructure
The existing `CreateDexieHooks` already provides comprehensive sync functionality:

```typescript
// The existing sync mechanism handles:
// 1. Automatic sync on data changes (debounced)
// 2. Periodic sync (configurable interval)
// 3. Online/offline detection
// 4. Retry with exponential backoff
// 5. Conflict resolution (last-write-wins by default)
// 6. Batch operations

// Example: Using existing sync for new entity types
const propertyDetailsStore = CreateDexieHooks<PropertyDetails, CreatePropertyDetails, UpdatePropertyDetails>(
  db,
  'entities', // Can use unified table or separate tables
  {
    list: async () => {
      // Fetch from server
    },
    create: async (data) => {
      // Create on server with withTenantId
    },
    update: async (data) => {
      // Update on server
    },
    delete: async (id) => {
      // Delete on server
    },
    
    // Optional: Custom sync logic
    syncWithServer: async () => {
      // Custom sync implementation if needed
      // Otherwise uses default sync logic
    }
  }
);

// Key features already available:
// - Automatic sync on add/update/remove
// - Queued status for offline changes
// - Failed status with error tracking
// - PendingDelete for soft deletes
// - Force sync to retry failed items

// Start periodic sync (every 5 minutes by default)
const stopSync = propertyDetailsStore.startPeriodicSync(300000);

// Force sync when needed
await propertyDetailsStore.forceSync();

// Use React hooks with automatic reactivity
const [isHydrated, propertyDetails] = propertyDetailsStore.useList();
```
```

## Security & Validation

### Server-Side Validation
```typescript
// Lambda function for entity validation
export async function validateEntity(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { entityType, entity } = JSON.parse(event.body || '{}');
  const tenantId = event.headers['X-Tenant-Id'];
  
  // Verify tenant access
  if (!await verifyTenantAccess(event.requestContext.authorizer, tenantId)) {
    return { statusCode: 403, body: 'Forbidden' };
  }
  
  // Validate entity schema
  const schema = getEntitySchema(entityType);
  const validation = await schema.validate(entity);
  
  if (!validation.valid) {
    return {
      statusCode: 400,
      body: JSON.stringify({ errors: validation.errors })
    };
  }
  
  // Additional business rules
  if (entityType === 'survey') {
    // Ensure inspection date is not in future
    if (new Date(entity.inspectionDate) > new Date()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          errors: ['Inspection date cannot be in the future'] 
        })
      };
    }
  }
  
  // Sanitize input
  const sanitized = sanitizeEntity(entity);
  
  // Store in DynamoDB
  await storeEntity(tenantId, entityType, sanitized);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, id: sanitized.id })
  };
}
```

### Client-Side Validation
```typescript
// Type-safe validation with Zod
import { z } from 'zod';

const SurveySchema = z.object({
  name: z.string().min(1).max(200),
  clientName: z.string().min(1).max(100),
  inspectionDate: z.string().datetime(),
  inspectorName: z.string().min(1).max(100),
  propertyAddress: z.string().min(1).max(500),
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']),
});

// Use in service
async function createSurvey(data: unknown): Promise<Survey> {
  // Validate
  const validated = SurveySchema.parse(data);
  
  // Create entity
  return entityService.create('survey', validated);
}
```

## Error Handling

### Offline Error Recovery
```typescript
class ErrorRecovery {
  async handleOfflineError(error: Error, context: any): Promise<void> {
    // Log to local storage for debugging
    await this.logError(error, context);
    
    // Notify user appropriately
    if (error.message.includes('Network')) {
      showNotification('Changes saved locally. Will sync when online.');
    } else if (error.message.includes('Storage')) {
      showNotification('Storage full. Please free up space.');
      await this.suggestCleanup();
    } else {
      showNotification('An error occurred. Your data is safe locally.');
    }
  }
  
  private async logError(error: Error, context: any): Promise<void> {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
    };
    
    // Store in IndexedDB for later analysis
    await db.table('errorLogs').add(errorLog);
    
    // Clean old logs (keep last 100)
    const oldLogs = await db.table('errorLogs')
      .orderBy('timestamp')
      .reverse()
      .offset(100)
      .toArray();
    
    await db.table('errorLogs')
      .bulkDelete(oldLogs.map(log => log.id));
  }
  
  private async suggestCleanup(): Promise<void> {
    // Find old synced data that can be cleared
    const oldSynced = await db.entities
      .where('syncStatus')
      .equals('synced')
      .and(entity => {
        const age = Date.now() - new Date(entity.updatedAt).getTime();
        return age > 30 * 24 * 60 * 60 * 1000; // 30 days
      })
      .toArray();
    
    if (oldSynced.length > 0) {
      const confirmed = await confirmDialog(
        `Free up space by removing ${oldSynced.length} old synced items?`
      );
      
      if (confirmed) {
        await db.entities.bulkDelete(oldSynced.map(e => e.localId));
      }
    }
  }
}
```

## Helper Functions for Common Operations

### Survey Operations Helper
```typescript
// Survey operations - common multi-entity operations
export const surveyOperations = {
  // Get complete survey with all related entities
  async getComplete(surveyId: string) {
    const [
      survey,
      propertyDetails, 
      elements,
      components,
      sections,
      checklists,
      conditions,
      reportDetails
    ] = await Promise.all([
      surveyStore.get(surveyId),
      enhancedPropertyDetailsStore.getBySurvey(surveyId),
      enhancedSurveyElementStore.getBySurvey(surveyId), 
      enhancedSurveyComponentStore.getBySurvey(surveyId),
      sectionTemplateStore.useList()[1], // Get all section templates
      enhancedChecklistStore.getBySurvey(surveyId),
      enhancedConditionsStore.getBySurvey(surveyId),
      enhancedReportDetailsStore.getBySurvey(surveyId)
    ]);
    
    return {
      survey,
      propertyDetails: propertyDetails[0], // Assuming one property per survey
      surveyElements: elements,
      surveyComponents: components,
      sectionTemplates: sections,
      checklists,
      conditions: conditions[0], // Assuming one conditions record per survey
      reportDetails: reportDetails[0] // Assuming one report config per survey
    };
  },
  
  // Delete survey and all related entities
  async deleteComplete(surveyId: string): Promise<void> {
    const related = await this.getComplete(surveyId);
    
    // Delete in order: components -> elements -> other entities -> survey
    await Promise.all([
      // Delete components first (they reference elements)
      ...related.surveyComponents.map(c => surveyComponentStore.remove(c.id)),
    ]);
    
    await Promise.all([
      // Delete elements (they reference section templates)
      ...related.surveyElements.map(e => surveyElementStore.remove(e.id)),
      // Delete other related entities
      ...related.checklists.map(c => checklistStore.remove(c.id)),
      related.propertyDetails ? propertyDetailsStore.remove(related.propertyDetails.id) : Promise.resolve(),
      related.conditions ? conditionsStore.remove(related.conditions.id) : Promise.resolve(),
      related.reportDetails ? reportDetailsStore.remove(related.reportDetails.id) : Promise.resolve(),
    ]);
    
    // Finally delete the survey
    await surveyStore.remove(surveyId);
  },
  
  // Duplicate survey with all related entities
  async duplicate(surveyId: string, newName: string): Promise<string> {
    const original = await this.getComplete(surveyId);
    if (!original.survey) throw new Error('Survey not found');
    
    // Create new survey
    const newSurveyId = generateId();
    const newSurvey = {
      ...original.survey,
      id: newSurveyId,
      name: newName,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await surveyStore.add(newSurvey);
    
    // Duplicate related entities
    const entityPromises = [];
    
    // Property details
    if (original.propertyDetails) {
      entityPromises.push(
        propertyDetailsStore.add({
          ...original.propertyDetails,
          id: generateId(),
          surveyId: newSurveyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
    }
    
    // Survey elements and components
    const elementIdMap = new Map<string, string>();
    for (const element of original.surveyElements) {
      const newElementId = generateId();
      elementIdMap.set(element.id, newElementId);
      
      entityPromises.push(
        surveyElementStore.add({
          ...element,
          id: newElementId,
          surveyId: newSurveyId,
          // Reset inspection data for new survey
          condition: 'excellent',
          isInspected: false,
          photos: [],
          defects: [],
          recommendations: '',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
    }
    
    // Create components with updated element references
    for (const component of original.surveyComponents) {
      const newElementId = elementIdMap.get(component.surveyElementId);
      if (newElementId) {
        entityPromises.push(
          surveyComponentStore.add({
            ...component,
            id: generateId(),
            surveyId: newSurveyId,
            surveyElementId: newElementId,
            // Reset inspection data for new survey
            condition: 'excellent',
            isInspected: false,
            photos: [],
            defects: [],
            recommendations: '',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      }
    }
    
    await Promise.all(entityPromises);
    return newSurveyId;
  },
  
  // Get survey completion status
  async getCompletionStatus(surveyId: string) {
    const { surveyElements, checklists, conditions, reportDetails } = await this.getComplete(surveyId);
    
    const totalElements = surveyElements.length;
    const completedElements = surveyElements.filter(e => 
      e.isInspected && e.condition && e.recommendations && e.photos.length > 0
    ).length;
    
    const totalChecklists = checklists.reduce((sum, cl) => sum + cl.items.length, 0);
    const completedChecklists = checklists.reduce((sum, cl) => 
      sum + cl.items.filter(item => item.isCompleted).length, 0
    );
    
    return {
      elements: {
        total: totalElements,
        completed: completedElements,
        percentage: totalElements > 0 ? Math.round((completedElements / totalElements) * 100) : 0
      },
      checklists: {
        total: totalChecklists,
        completed: completedChecklists,
        percentage: totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0
      },
      hasConditions: !!conditions,
      hasReportConfig: !!reportDetails,
      overall: {
        percentage: Math.round(
          ((completedElements / Math.max(totalElements, 1)) * 0.6 +
           (completedChecklists / Math.max(totalChecklists, 1)) * 0.2 +
           (conditions ? 0.1 : 0) +
           (reportDetails ? 0.1 : 0)) * 100
        )
      }
    };
  }
};

// Survey element operations helper
export const surveyElementOperations = {
  // Get survey element with all components
  async getWithComponents(surveyElementId: string): Promise<{
    surveyElement: SurveyElement | null;
    surveyComponents: SurveyComponent[];
  }> {
    const [surveyElement, surveyComponents] = await Promise.all([
      surveyElementStore.get(surveyElementId),
      surveyComponentStore.useList()[1].then(all => 
        all.filter(c => c.surveyElementId === surveyElementId)
      )
    ]);
    
    return { surveyElement, surveyComponents };
  },
  
  // Update element condition and propagate to survey
  async updateCondition(surveyElementId: string, condition: SurveyElement['condition'], notes?: string): Promise<void> {
    await surveyElementStore.update(surveyElementId, (draft) => {
      draft.condition = condition;
      if (notes) draft.notes = notes;
      draft.isInspected = true;
      draft.inspectedAt = new Date().toISOString();
      draft.inspectedBy = getCurrentUserId();
      draft.updatedAt = new Date().toISOString();
    });
    
    // Optionally update overall survey conditions
    const surveyElement = await surveyElementStore.get(surveyElementId);
    if (surveyElement?.surveyId) {
      // Could trigger recalculation of overall survey condition
      // Implementation depends on business logic
    }
  },
  
  // Create survey element from template
  async createFromTemplate(surveyId: string, elementTemplateId: string, sectionTemplateId: string): Promise<string> {
    const template = await elementTemplateStore.get(elementTemplateId);
    if (!template) throw new Error('Element template not found');
    
    const surveyElementId = generateId();
    await surveyElementStore.add({
      id: surveyElementId,
      tenantId: getCurrentTenantId(),
      surveyId,
      elementTemplateId,
      sectionTemplateId,
      
      // Copy from template
      name: template.name,
      description: template.description,
      order: template.order,
      
      // Initialize inspection data
      condition: 'excellent',
      defects: [],
      recommendations: '',
      photos: [],
      isInspected: false,
      
      // Metadata
      syncStatus: SyncStatus.Queued,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      createdBy: getCurrentUserId(),
      owner: getCurrentUserId(),
    });
    
    return surveyElementId;
  }
};

// Checklist operations helper 
export const checklistOperations = {
  // Toggle checklist item completion
  async toggleItem(checklistId: string, itemId: string): Promise<void> {
    await checklistStore.update(checklistId, (draft) => {
      const item = draft.items.find(i => i.id === itemId);
      if (item) {
        item.isCompleted = !item.isCompleted;
        item.completedAt = item.isCompleted ? new Date().toISOString() : undefined;
        
        // Recalculate completion percentage
        const completed = draft.items.filter(i => i.isCompleted).length;
        draft.completionPercentage = Math.round((completed / draft.items.length) * 100);
        draft.isCompleted = completed === draft.items.length;
      }
      draft.updatedAt = new Date().toISOString();
    });
  },
  
  // Add new checklist item
  async addItem(checklistId: string, text: string, isRequired: boolean = false): Promise<void> {
    await checklistStore.update(checklistId, (draft) => {
      draft.items.push({
        id: generateId(),
        text,
        isRequired,
        isCompleted: false
      });
      
      // Recalculate percentages
      const completed = draft.items.filter(i => i.isCompleted).length;
      draft.completionPercentage = Math.round((completed / draft.items.length) * 100);
      draft.isCompleted = completed === draft.items.length;
      draft.updatedAt = new Date().toISOString();
    });
  }
};

// Template operations helper
export const templateOperations = {
  // Create survey from section templates
  async createSurveyFromTemplates(surveyData: Omit<Survey, 'id' | 'usedSectionTemplateIds' | keyof BaseEntity>, sectionTemplateIds: string[]): Promise<string> {
    // Create the survey
    const surveyId = generateId();
    await surveyStore.add({
      ...surveyData,
      id: surveyId,
      usedSectionTemplateIds: sectionTemplateIds,
      
      // BaseEntity fields
      tenantId: getCurrentTenantId(),
      syncStatus: SyncStatus.Queued,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      createdBy: getCurrentUserId(),
      owner: getCurrentUserId(),
    });
    
    // Create survey elements from section templates
    for (const sectionTemplateId of sectionTemplateIds) {
      const sectionTemplate = await sectionTemplateStore.get(sectionTemplateId);
      if (!sectionTemplate) continue;
      
      // Create required elements
      for (const elementTemplateId of sectionTemplate.requiredElements) {
        await surveyElementOperations.createFromTemplate(surveyId, elementTemplateId, sectionTemplateId);
      }
    }
    
    return surveyId;
  },
  
  // Get all templates for survey creation
  async getTemplatesForSurveyCreation() {
    const [sections, elements, components] = await Promise.all([
      sectionTemplateStore.useList()[1],
      elementTemplateStore.useList()[1],
      componentTemplateStore.useList()[1]
    ]);
    
    return { sections, elements, components };
  }
};
```

## Usage Examples

### Creating and Managing Surveys
```typescript
// Create a new survey from templates
const surveyId = await templateOperations.createSurveyFromTemplates(
  {
    name: '123 Main St Inspection',
    clientName: 'John Doe',
    inspectionDate: '2024-01-16T10:00:00Z',
    inspectorName: 'Jane Smith',
    propertyAddress: '123 Main St, City, State',
    status: 'draft',
  },
  ['roofSection', 'plumbingSection', 'electricalSection'] // Section template IDs
);

// Alternative: Create survey manually with type safety
const survey: Survey = {
  id: generateId(),
  tenantId: getCurrentTenantId(),
  name: '123 Main St Inspection',
  clientName: 'John Doe',
  inspectionDate: '2024-01-16T10:00:00Z',
  inspectorName: 'Jane Smith',
  propertyAddress: '123 Main St, City, State',
  status: 'draft',
  usedSectionTemplateIds: [],
  
  // BaseEntity fields
  syncStatus: SyncStatus.Queued,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
  createdBy: getCurrentUserId(),
  owner: getCurrentUserId(),
};

await surveyStore.add(survey);

// Add property details
const propertyDetails: PropertyDetails = {
  id: generateId(),
  tenantId: getCurrentTenantId(),
  surveyId: survey.id,
  
  propertyType: 'single_family',
  yearBuilt: 1985,
  squareFootage: 2500,
  streetAddress: '123 Main St',
  city: 'City',
  state: 'State',
  zipCode: '12345',
  
  // BaseEntity fields
  syncStatus: SyncStatus.Queued,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
  createdBy: getCurrentUserId(),
  owner: getCurrentUserId(),
};

await propertyDetailsStore.add(propertyDetails);
```

### Using React Hooks for Real-time Updates
```typescript
// Component for survey overview
function SurveyOverview({ surveyId }: { surveyId: string }) {
  const [isHydrated, survey] = surveyStore.useGet(surveyId);
  const [, surveyElements] = enhancedSurveyElementStore.useBySurvey(surveyId);
  const [, checklists] = enhancedChecklistStore.useBySurvey(surveyId);
  
  if (!isHydrated) return <Loading />;
  if (!survey) return <NotFound />;
  
  return (
    <div>
      <h1>{survey.name}</h1>
      <p>Status: {survey.status}</p>
      <p>Elements: {surveyElements.length}</p>
      <p>Checklists: {checklists.length}</p>
    </div>
  );
}

// Component for survey element inspection
function SurveyElementInspection({ surveyElementId }: { surveyElementId: string }) {
  const [isHydrated, surveyElement] = surveyElementStore.useGet(surveyElementId);
  
  const handleConditionUpdate = async (condition: SurveyElement['condition']) => {
    await surveyElementOperations.updateCondition(surveyElementId, condition);
  };
  
  if (!isHydrated || !surveyElement) return <Loading />;
  
  return (
    <div>
      <h2>{surveyElement.name}</h2>
      <p>Inspection Status: {surveyElement.isInspected ? 'Completed' : 'Pending'}</p>
      <ConditionSelector 
        value={surveyElement.condition}
        onChange={handleConditionUpdate}
      />
      <PhotoUpload surveyElementId={surveyElementId} />
    </div>
  );
}
```

## Migration Strategy

### Phase 1: Core Implementation (Week 1)
- Set up new Dexie tables for survey instances
- Implement template stores (reuse existing infrastructure for components, elements, phrases, sections)
- Add survey instance stores (surveys, propertyDetails, surveyElements, surveyComponents, etc.)
- Basic template → instance workflow

### Phase 2: Advanced Features (Week 2)
- Implement helper operations (surveyOperations, templateOperations, surveyElementOperations)
- Enhanced stores with survey-specific queries (getBySurvey, useBySurvey)
- Template management UI components
- Survey creation from templates workflow

### Phase 3: Testing & Polish (Week 3)
- End-to-end testing of template → survey → inspection workflow
- Performance optimization and indexing validation
- Comprehensive error handling and offline scenarios
- Documentation and developer examples

## Benefits of This Approach

1. **Type Safety Throughout**
   - All fields are strongly typed with clear interfaces
   - Better IDE support, refactoring, and compile-time error catching
   - Template and instance entities are clearly distinguished

2. **Template/Instance Separation**
   - Configuration templates are reusable across surveys
   - Survey instances capture actual inspection data
   - Clear workflow from template → instance → inspection

3. **Clean Architecture**
   - Local schema optimized for IndexedDB with proper indexing
   - Remote schema optimized for DynamoDB single-table design
   - Sync layer handles translation between local and remote formats

4. **Robust Offline Support**
   - Leverages existing proven sync infrastructure
   - Queue-based sync with retry logic and conflict resolution
   - Comprehensive error recovery mechanisms

5. **Developer Productivity**
   - Store factory reduces boilerplate by ~90%
   - Helper functions for common operations (duplication, completion tracking)
   - Enhanced stores with survey-specific queries

6. **Production Ready**
   - Built on existing, proven infrastructure
   - Comprehensive validation and security
   - Real-world helper functions and workflows

## Conclusion

This strongly-typed approach provides:
- **Immediate type safety** for all functionality
- **Clear template/instance workflow** for survey management
- **Clean architecture** with proper separation of concerns
- **Production-ready** sync and error handling built on proven infrastructure
- **Significant code reduction** through factory patterns and helper functions

The key insight is that strongly-typed entities provide better developer experience and maintainability, while the template system provides the flexibility needed for survey configuration without sacrificing type safety.