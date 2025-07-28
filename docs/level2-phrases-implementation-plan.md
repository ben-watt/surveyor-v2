# Level 2 Phrases Implementation Plan

## Overview
This document outlines the implementation plan for adding a new field to the Phrases entity (also known as conditions) to support Level 2 survey wording. Currently, the `phrase` field stores Level 3 wording, and we need to add a separate field for Level 2 wording.

## Current State Analysis

### Database Schema
- **Entity**: `Phrases` (amplify/data/resource.ts:102-123)
- **Current Fields**:
  - `id`: Unique identifier
  - `name`: Display name of the condition
  - `phrase`: The actual condition text (currently used for Level 3)
  - `type`: Either "Defect" or "Condition"
  - `associatedMaterialIds`, `associatedElementIds`, `associatedComponentIds`: Related entities
  - Standard fields: `syncStatus`, `syncError`, `createdAt`, `updatedAt`, `tenantId`

### Usage Context
- Phrases are used in building survey reports to describe conditions found during inspections
- Survey reports can be Level 2 or Level 3 (app/home/surveys/building-survey-reports/BuildingSurveyReportSchema.ts:80)
- Level 2 surveys require simpler, less technical language than Level 3 surveys
- The same condition may need different wording based on the survey level

### Key Files That Interact with Phrases
1. **Backend Schema**: `amplify/data/resource.ts`
2. **Type Definitions**: `app/home/clients/Dexie.ts`
3. **UI Forms**: `app/home/conditions/form.tsx`
4. **Survey Integration**: `app/home/surveys/[id]/condition/types.ts`
5. **Display Components**: `app/home/surveys/[id]/condition/DraggableConditions.tsx`

## Implementation Steps

### Phase 1: Backend Schema Update

#### 1.1 Update Amplify Schema
**File**: `amplify/data/resource.ts`
- Add new field `phraseLevel2` to the Phrases model
- Keep existing `phrase` field for Level 3 wording (backward compatibility)

```typescript
Phrases: a.model({
  // ... existing fields ...
  phrase: a.string().required(), // Level 3 wording
  phraseLevel2: a.string(), // NEW: Level 2 wording (optional initially)
  // ... rest of fields ...
})
```

#### 1.2 Run Amplify Sandbox
- The sandbox will hot-reload the schema changes
- DynamoDB will be updated automatically
- Test the schema changes in the sandbox environment

### Phase 2: Frontend Type Updates

#### 2.1 Update Local Types
**File**: `app/home/clients/Dexie.ts`
- The `Phrase` type is imported from the schema, so it will automatically include the new field
- No manual changes needed here due to type generation

#### 2.2 Update IndexedDB Schema
**File**: `app/home/clients/Database.ts` (if needed)
- Verify that the local database schema includes the new field
- Update any migration logic if necessary

### Phase 3: UI Implementation

#### 3.1 Update Phrase Form
**File**: `app/home/conditions/form.tsx`
- Add new textarea input for Level 2 phrase
- Update save logic to include the new field
- Add conditional display based on whether editing or creating

```typescript
// Add after existing phrase textarea (around line 116)
<TextAreaInput
  labelTitle="Level 2 Phrase"
  placeholder="Simpler wording for Level 2 surveys"
  register={() => register("phraseLevel2")}
  errors={errors}
/>
```

#### 3.2 Update Condition Selection Logic
**File**: `app/home/surveys/[id]/condition/InspectionForm.tsx`
- Modify the condition selection to use appropriate phrase based on survey level
- Update the FormPhrase type mapping to include level-appropriate text
- Implement filtering logic to only show phrases that have content for the survey level:
  - For Level 2 surveys: Only show phrases where `phraseLevel2` is not null/empty
  - For Level 3 surveys: Only show phrases where `phrase` (Level 3) is not null/empty

```typescript
// Example filtering logic
const availablePhrases = phrases.filter(phrase => {
  if (surveyLevel === "2") {
    return phrase.phraseLevel2 && phrase.phraseLevel2.trim() !== "";
  } else { // Level 3
    return phrase.phrase && phrase.phrase.trim() !== "";
  }
});
```

### Phase 4: Display Logic Updates

#### 4.1 Update Condition Display
**File**: `app/home/surveys/[id]/condition/DraggableConditions.tsx`
- Accept survey level as a prop
- Display appropriate phrase based on level

```typescript
interface DraggableConditionsProps {
  conditions: FormPhrase[];
  level?: "2" | "3";
  // ... other props
}
```

#### 4.2 Update Report Generation
**File**: `app/home/surveys/building-survey-reports/BuildingSurveyReportTipTap.tsx`
- Ensure conditions use the correct phrase based on report level
- Update the condition rendering logic

### Phase 5: Data Migration

#### 5.1 Migration Strategy
- Existing phrases will have `phraseLevel2` as null/undefined
- Create a utility script to:
  - Copy existing `phrase` values to `phraseLevel2` as initial values
  - Allow manual editing afterward

### Phase 6: Testing

#### 6.1 Unit Tests
- Update existing tests for phrase creation/editing
- Add tests for level-based phrase selection
- Test phrase filtering based on survey level
- Test backward compatibility

#### 6.2 Integration Tests
- Test survey creation with both Level 2 and Level 3
- Verify correct phrase display in reports
- Test that phrase search only shows relevant phrases for each level
- Verify that phrases without Level 2 content don't appear in Level 2 surveys
- Verify that phrases without Level 3 content don't appear in Level 3 surveys
- Test sync functionality with new field

### Phase 7: Documentation

#### 7.1 Update User Documentation
- Document the difference between Level 2 and Level 3 phrases
- Provide guidelines for writing appropriate Level 2 wording

#### 7.2 Update CLAUDE.md
- Add information about the new phrase structure
- Document the level-based wording system

## Implementation Order

1. **Backend First**: Update Amplify schema and deploy
2. **Frontend Types**: Ensure types are updated via code generation
3. **UI Forms**: Update condition creation/editing forms
4. **Display Logic**: Update how conditions are displayed based on level
5. **Migration**: Handle existing data
6. **Testing**: Comprehensive testing of all changes
7. **Documentation**: Update all relevant documentation

## Rollback Plan

If issues arise:
1. The schema change is additive (new optional field), so it's backward compatible
2. Frontend can be reverted without data loss
3. Existing Level 3 phrases remain functional throughout

## Success Criteria

- [ ] Level 2 phrases can be created and edited
- [ ] Correct phrases display based on survey level
- [ ] Phrase search/selection filters based on survey level (only shows phrases with appropriate level content)
- [ ] Existing functionality remains unaffected
- [ ] Data syncs correctly between devices
- [ ] All tests pass
- [ ] Documentation is updated

## Important Considerations

### Phrase Visibility Rules
1. **Level 2 Surveys**: Only phrases with populated `phraseLevel2` field will be available for selection
2. **Level 3 Surveys**: Only phrases with populated `phrase` field will be available for selection
3. **Migration Impact**: After migration, all phrases will initially be visible for both levels (until edited)
4. **User Experience**: Clear messaging should be shown when no phrases are available for a specific level