# Schema Migration Plan: TypeScript to Zod

## Overview
Migrate from legacy TypeScript schemas to Zod schemas for better runtime validation, type safety, and consistency across the application.

## Current State Analysis

### Schema Locations
- **Legacy**: `app/home/surveys/building-survey-reports/BuildingSurveyReportSchema.ts`
- **New Zod**: `app/home/surveys/schemas/reportDetails.ts` (partial)
- **Amplify**: `amplify/data/resource.ts` (stores as JSON in Surveys.content)

### Key Differences Identified

#### 1. Address Schema
```typescript
// Legacy TypeScript (all required except optional)
type Address = {
  formatted: string;
  line1: string;
  line2?: string;
  // ... more required fields
}

// Current Zod (formatted required, others optional)
address: z.object({
  formatted: z.string().min(1, "Address is required"),
  line1: z.string().optional(),
  // ... all others optional
})
```

#### 2. Field Requirements Mismatch
- **Form expects required**: `weather`, `orientation`, `situation`
- **Zod makes optional**: These same fields
- **TypeScript defines required**: These fields

#### 3. Image Structure
```typescript
// Legacy TypeScript
type SurveyImage = {
  path: string,
  isArchived: boolean,
  hasMetadata: boolean,
}

// Current Zod
z.array(z.object({
  path: z.string(),
  isArchived: z.boolean().optional(),
  hasMetadata: z.boolean().optional()
}))
```

## Migration Strategy

### Phase 1: Report Details (Current Focus)

#### Step 1: Align Zod Schema with Current Behavior
- Update `reportDetails.ts` to match form requirements
- Make `weather`, `orientation`, `situation` required
- Align image structure with `SurveyImage` type
- Fix address field requirements

#### Step 2: Update Form Integration
- Replace TypeScript imports with Zod schema
- Use `zodResolver` from `@hookform/resolvers/zod`
- Update type annotations to use Zod inferred types

#### Step 3: Validation & Testing
- Ensure existing tests pass
- Add Zod-specific validation tests
- Verify form behavior remains unchanged

### Phase 2: Property Description
- Create `propertyDescription.ts` Zod schema
- Migrate `PropertyDescriptionForm.tsx`
- Follow same pattern as report details

### Phase 3: Survey Sections & Elements
- Create schemas for:
  - `SurveySection`
  - `ElementSection` 
  - `Inspection`
  - `Phrase`
- Handle complex nested validations

### Phase 4: Complete Migration
- Remove legacy TypeScript schema file
- Update all imports across codebase
- Create comprehensive test suite

## Schema Alignment Utility

Create a utility to validate schema compatibility:

```typescript
// utils/schemaValidator.ts
export const validateSchemaAlignment = () => {
  // Compare Zod schema requirements with Amplify storage
  // Flag differences for review
  // Generate type compatibility report
}
```

## Implementation Files to Modify

### Phase 1 - Report Details
- `app/home/surveys/schemas/reportDetails.ts` - Fix schema alignment
- `app/home/surveys/[id]/report-details/ReportDetailsForm.tsx` - Use Zod resolver
- `app/home/surveys/schemas/__tests__/zodStatusComputers.test.ts` - Add tests

### Testing Strategy
- Unit tests for each Zod schema
- Integration tests for form validation
- Regression tests to ensure no behavior changes
- Schema alignment validation tests

## Benefits
- Runtime validation prevents invalid data
- Better error messages for users
- Type safety improvements
- Consistent validation logic
- Easier schema evolution
- Better IDE support

## Risks & Mitigation
- **Risk**: Breaking existing forms
  - **Mitigation**: Incremental migration with thorough testing
- **Risk**: Schema drift with Amplify
  - **Mitigation**: Automated alignment validation
- **Risk**: Performance impact
  - **Mitigation**: Benchmark validation performance

## Success Criteria
- All forms use Zod schemas
- No regression in user experience
- Improved error handling
- Schema alignment utility working
- Comprehensive test coverage