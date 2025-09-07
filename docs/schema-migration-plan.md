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

### ✅ Phase 1: Report Details (COMPLETED)

#### ✅ Step 1: Align Zod Schema with Current Behavior
- ✅ Updated `reportDetails.ts` to match form requirements
- ✅ Made `weather`, `orientation`, `situation` required
- ✅ Aligned image structure with `SurveyImage` type
- ✅ Fixed address field requirements
- ✅ Added archived photo validation (non-archived images only)

#### ✅ Step 2: Update Form Integration
- ✅ Replaced TypeScript imports with Zod schema
- ✅ Used `zodResolver` from `@hookform/resolvers/zod`
- ✅ Updated type annotations to use Zod inferred types

#### ✅ Step 3: Validation & Testing
- ✅ All existing tests pass
- ✅ Added Zod-specific validation tests for archived photos
- ✅ Verified form behavior remains unchanged

### ✅ Phase 2: Metadata-Based Status Architecture (COMPLETED) 

**🚀 MAJOR IMPROVEMENT**: Instead of computing form status via runtime validation, we now store status directly on each form:

#### ✅ New Architecture Implemented:
- ✅ Created `formMeta.ts` schema for status tracking
- ✅ Added `_meta` field to all form schemas
- ✅ Replaced complex memoized status computers with instant metadata lookup
- ✅ Backward compatibility maintained for forms without metadata

#### ✅ Benefits Achieved:
- **O(1) status lookup** instead of O(n) validation
- **Persistent status** across page refreshes
- **Self-contained forms** that own their status
- **Eliminated complex memoization** 
- **Cleaner architecture** as we add more forms

### 🔄 Phase 3: Property Description (IN PROGRESS)
- ✅ Created `propertyDescription.ts` Zod schema with metadata
- ⏳ TODO: Migrate `PropertyDescriptionForm.tsx` to use Zod resolver
- ⏳ TODO: Update auto-save to populate `_meta` field

### Phase 4: Survey Sections & Elements
- Create schemas for:
  - `SurveySection`
  - `ElementSection` 
  - `Inspection` 
  - `Phrase`
- Handle complex nested validations
- Add metadata to each schema

### Phase 5: Complete Migration
- Remove legacy TypeScript schema file
- Update all imports across codebase 
- Remove `zodStatusComputer.ts` (no longer needed)
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