# Survey Entity Normalization Plan

## Overview
This plan outlines the migration from storing survey data as a single JSON blob to a normalized table structure. This change will improve query performance, enable granular updates, and support better offline sync capabilities.

## Current State
- Survey data stored as JSON in `content` field of Surveys table
- All survey operations require loading/saving entire JSON structure
- Forms use deep object updates with Immer
- Sync operations transfer entire survey objects

## Proposed Table Structure

### 1. surveys - Core Survey Metadata
```typescript
{
  id: string,
  tenantId: string,
  ownerId: string,
  ownerName: string,
  ownerEmail: string,
  ownerSignaturePath: string[], // JSON array
  status: 'draft' | 'created',
  createdAt: string,
  updatedAt: string,
  syncStatus: string,
  syncError?: string
}
```

### 2. surveyReportDetails - Report Information
```typescript
{
  id: string,
  surveyId: string,
  tenantId: string,
  level: "2" | "3",
  reference: string,
  clientName: string,
  reportDate: Date,
  inspectionDate: Date,
  weather: string,
  orientation: string,
  situation: string,
  // Address fields (flattened)
  addressFormatted: string,
  addressLine1: string,
  addressLine2?: string,
  addressLine3?: string,
  addressCity: string,
  addressCounty?: string,
  addressPostcode: string,
  addressLat?: number,
  addressLng?: number,
  // Image references as JSON arrays
  moneyShot: SurveyImage[], // JSON
  frontElevationImagesUri: SurveyImage[], // JSON
  updatedAt: string,
  syncStatus: string
}
```

### 3. surveyPropertyDescriptions - Property Details
```typescript
{
  id: string,
  surveyId: string,
  tenantId: string,
  propertyType: string,
  constructionDetails: string,
  yearOfConstruction: string,
  yearOfExtensions?: string,
  yearOfConversions?: string,
  grounds: string,
  services: string,
  otherServices?: string,
  energyRating: string,
  numberOfBedrooms: number,
  numberOfBathrooms: number,
  tenure: string,
  updatedAt: string,
  syncStatus: string
}
```

### 4. surveySections - Top-level Survey Sections
```typescript
{
  id: string,
  surveyId: string,
  tenantId: string,
  name: string,
  order: number,
  updatedAt: string,
  syncStatus: string
}
```

### 5. surveyElements - Elements within Sections
```typescript
{
  id: string,
  surveySectionId: string,
  surveyId: string,
  tenantId: string,
  name: string,
  order: number,
  isPartOfSurvey: boolean,
  description: string,
  images: SurveyImage[], // JSON array
  updatedAt: string,
  syncStatus: string
}
```

### 6. surveyInspections - Inspection Data
```typescript
{
  id: string,
  surveyElementId: string,
  surveySectionId: string,
  surveyId: string,
  tenantId: string,
  inspectionId: string,
  name: string,
  ragStatus: "Red" | "Amber" | "Green" | "N/I",
  useNameOverride: boolean,
  nameOverride?: string,
  location: string,
  additionalDescription: string,
  conditions: Phrase[], // JSON array
  costings: Costing[], // JSON array
  images: SurveyImage[], // JSON array
  updatedAt: string,
  syncStatus: string
}
```

### 7. surveyChecklists - Checklist Items
```typescript
{
  id: string,
  surveyId: string,
  tenantId: string,
  items: Input<boolean>[], // JSON array
  updatedAt: string,
  syncStatus: string
}
```

## Dexie Schema Updates

```javascript
db.version(3).stores({
  // Survey tables
  surveys: 'id, tenantId, status, [tenantId+updatedAt], [tenantId+status]',
  surveyReportDetails: 'id, surveyId, [tenantId+surveyId], [tenantId+updatedAt]',
  surveyPropertyDescriptions: 'id, surveyId, [tenantId+surveyId], [tenantId+updatedAt]',
  surveySections: 'id, surveyId, [tenantId+surveyId], [tenantId+updatedAt]',
  surveyElements: 'id, surveySectionId, surveyId, [tenantId+surveyId], [tenantId+surveySectionId]',
  surveyInspections: 'id, surveyElementId, surveySectionId, surveyId, [tenantId+surveyId], [tenantId+surveyElementId]',
  surveyChecklists: 'id, surveyId, [tenantId+surveyId]',
  
  // Existing library tables remain unchanged
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageUploads: 'id, tenantId, path, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageMetadata: 'id, tenantId, imagePath, updatedAt, syncStatus, [tenantId+updatedAt]'
}).upgrade(tx => {
  // Clear old survey data (not in production)
  return tx.table('surveys').clear();
});
```

## Store Implementation

### File Structure
```
app/home/clients/survey/
├── SurveyStoreV2.ts       # Main store implementation
├── types.ts               # Type definitions
├── assemblers.ts          # Functions to assemble/disassemble survey data
├── sync.ts                # Sync logic for survey tables
└── hooks.ts               # React hooks for survey data
```

### Key Store Methods

```typescript
export class SurveyStoreV2 {
  // Full survey operations
  async createSurvey(data: Partial<BuildingSurveyFormData>): Promise<string>
  async getSurvey(id: string): Promise<BuildingSurveyFormData | null>
  async deleteSurvey(id: string): Promise<void>
  
  // Granular updates for forms
  async updateReportDetails(surveyId: string, data: Partial<ReportDetails>): Promise<void>
  async updatePropertyDescription(surveyId: string, data: Partial<PropertyDescription>): Promise<void>
  async updateSection(sectionId: string, data: Partial<SurveySection>): Promise<void>
  async updateElement(elementId: string, data: Partial<ElementSection>): Promise<void>
  async updateInspection(inspectionId: string, data: Partial<Inspection>): Promise<void>
  async updateChecklist(surveyId: string, items: Input<boolean>[]): Promise<void>
  
  // Optimized list operations
  async listSurveys(): Promise<SurveyListItem[]>
  
  // React hooks
  useList(): [boolean, SurveyListItem[]]
  useGet(id: string): [boolean, BuildingSurveyFormData | null]
  useSectionList(surveyId: string): [boolean, SurveySection[]]
}
```

## Form Migration

### ReportDetailsForm
**Before:**
```typescript
await surveyStore.update(surveyId, (survey) => {
  survey.reportDetails = data;
});
```

**After:**
```typescript
await surveyStoreV2.updateReportDetails(surveyId, data);
```

### PropertyDescriptionForm
**Before:**
```typescript
await surveyStore.update(surveyId, (survey) => {
  survey.propertyDescription = data;
});
```

**After:**
```typescript
await surveyStoreV2.updatePropertyDescription(surveyId, data);
```

### InspectionForm
**Before:**
```typescript
await surveyStore.update(surveyId, (survey) => {
  addOrUpdateComponent(
    survey,
    surveySectionId,
    elementId,
    componentData
  );
});
```

**After:**
```typescript
await surveyStoreV2.updateInspection(inspectionId, {
  ragStatus: data.ragStatus,
  conditions: data.conditions,
  costings: data.costings,
  location: data.location,
  additionalDescription: data.additionalDescription,
  images: data.images
});
```

### Survey List Page
**Before:**
```typescript
const [isHydrated, data] = surveyStore.useList(); // Loads full surveys
```

**After:**
```typescript
const [isHydrated, data] = surveyStoreV2.useList(); // Only loads list data
```

## Amplify Schema Updates

```typescript
// Add new models to amplify/data/resource.ts
SurveyReportDetails: a.model({
  id: a.id().required(),
  surveyId: a.id().required(),
  level: a.string().required(),
  reference: a.string().required(),
  clientName: a.string().required(),
  // ... other fields
  tenantId: a.string().required(),
})
.identifier(['tenantId', 'id'])
.authorization(/* same as surveys */),

// Similar for other new tables
```

## Implementation Steps

### Phase 1: Database & Store Setup
1. Create new Dexie schema with version 3
2. Implement SurveyStoreV2 class with basic CRUD operations
3. Create assembler functions to convert between normalized and denormalized data
4. Add React hooks for new store

### Phase 2: Form Migration
1. Update ReportDetailsForm to use new store method
2. Update PropertyDescriptionForm to use new store method
3. Update InspectionForm to use new store method (most complex)
4. Update ChecklistForm to use new store method
5. Update all auto-save hooks to work with new methods

### Phase 3: List & Navigation Updates
1. Update survey list page to use optimized list method
2. Update survey detail page to assemble full survey from tables
3. Update navigation and breadcrumbs
4. Update sync status indicators

### Phase 4: Sync Implementation
1. Create sync handlers for each new table
2. Update Amplify backend to handle new models
3. Implement conflict resolution for concurrent edits
4. Add retry logic for failed syncs

### Phase 5: Cleanup
1. Remove old survey content field
2. Remove old store methods
3. Update tests for new structure
4. Update documentation

## Benefits

1. **Performance**
   - List view loads 10x faster (no inspection data loaded)
   - Forms only update their specific data
   - Reduced memory usage for large surveys

2. **Sync Efficiency**
   - Only changed sections sync to server
   - Smaller payload sizes
   - Better conflict resolution

3. **Developer Experience**
   - Cleaner separation of concerns
   - Each form works with its own data model
   - Easier to test individual components

4. **Scalability**
   - Can handle surveys with hundreds of inspections
   - Support for concurrent editing
   - Better offline performance

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Not in production, can clear and restart |
| Complex joins affect performance | Use parallel fetches, cache assembled surveys |
| Form refactoring introduces bugs | Comprehensive test suite, phased rollout |
| Sync conflicts | Implement proper conflict resolution per table |

## Testing Strategy

1. **Unit Tests**
   - Each store method tested individually
   - Assembler functions tested with various data shapes
   - Sync handlers tested with mock data

2. **Integration Tests**
   - Form save operations
   - Full survey CRUD operations
   - List and filter operations

3. **Performance Tests**
   - Load time for survey list (target: <100ms for 100 surveys)
   - Form save time (target: <50ms)
   - Full survey load time (target: <200ms)

4. **Sync Tests**
   - Offline queue handling
   - Conflict resolution
   - Retry logic

## Success Metrics

- Survey list loads in <100ms for 100+ surveys
- Individual form saves complete in <50ms
- Sync payload reduced by 80% for partial updates
- Zero data loss during migration
- All existing features continue to work

## Timeline

- Week 1: Database schema and basic store implementation
- Week 2: Form migrations and testing
- Week 3: Sync implementation and testing
- Week 4: Performance optimization and cleanup

## Next Steps

1. Review and approve this plan
2. Create feature branch for implementation
3. Begin Phase 1: Database & Store Setup
4. Set up test environment with sample data