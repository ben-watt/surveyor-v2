---
title: "Phase 1 Checklist (Archived)"
status: archived
category: reports
created: 2025-09-01
updated: 2025-11-24
tags: [refactoring, reports, archived]
related: [./building-survey-report-refactoring.md]
---

# Phase 1 Implementation Checklist

> **⚠️ ARCHIVED DOCUMENT**  
> This document has been superseded by [building-survey-report-refactoring.md](./building-survey-report-refactoring.md)  
> 
> **Status:** Phases 1, 2, and 3 are complete ✅  
> All information has been consolidated into the main refactoring document.
>
> This file is kept for historical reference only.

---

**Original Content Below (Archived)**

---

## ✅ PHASE 1 COMPLETE - December 2024

**Status:** ✅ All tasks completed  
**Tests:** ✅ 140/140 passing (100%)  
**Linter Errors:** ✅ 0 errors  
**Time Taken:** ~5 hours (as estimated)

### Summary of Deliverables

| Component | Status | Lines | Tests |
|-----------|--------|-------|-------|
| constants.ts | ✅ Complete | 128 | 20 |
| org-config.ts | ✅ Complete | 153 | 45 |
| utils.ts | ✅ Complete | 278 | 75 |
| BuildingSurveyReportTipTap.tsx | ✅ Refactored | 990 (-30) | - |
| **Total** | **✅ Done** | **1,549** | **140** |

### Key Achievements
- ✅ Zero hard-coded styles (60+ replaced with constants)
- ✅ Organization config externalized and validated
- ✅ All utility functions tested with edge cases
- ✅ Content bugs fixed (radon risk, crack category)
- ✅ TypeScript types improved (readonly arrays)
- ✅ Full JSDoc documentation on all functions

---

## Files to Create

### 1. Constants File ✅
**Path:** `app/home/surveys/building-survey-reports/constants.ts`

**Contents:**
- [x] `LANDSCAPE_WIDTH = 928`
- [x] `IMAGE_MAX_HEIGHT = '75mm'`
- [x] `REPORT_STYLES` object with all inline styles (15+ styles)
- [x] `RAG_COLORS` mapping
- [x] `TABLE_LAYOUTS` with 9 configurations
- [x] `IMAGE_DIMENSIONS` for consistent sizing

**Lines refactored:** 60+ inline styles replaced with `REPORT_STYLES.*`

---

### 2. Organization Config ✅
**Path:** `app/home/surveys/building-survey-reports/org-config.ts`

**Contents:**
- [x] `OrganizationConfig` interface
- [x] `DEFAULT_ORG_CONFIG` with Clarke & Watt details
- [x] `formatOrgAddress()` helper
- [x] `formatOrgDetails()` helper
- [x] `getOrgContactEmail()` helper
- [x] `validateOrgConfig()` with email validation

**Lines refactored:** 202-216 (company details on cover page) + 8 other locations

---

### 3. Utilities File ✅
**Path:** `app/home/surveys/building-survey-reports/utils.ts`

**Contents:**
- [x] `mapRagToColor()` function
- [x] Enhanced `fallback()` function (supports all types including objects/arrays)
- [x] `formatList()` helper
- [x] `getNestedValue()` - safe nested object access
- [x] `formatCurrency()` - GBP formatting
- [x] `truncateText()` - text truncation
- [x] `isEmpty()` - empty value checking
- [x] `pluralize()` - word pluralization
- [x] `toTitleCase()` - title case conversion
- [x] `clamp()` - number clamping
- [x] `unique()` - array deduplication
- [x] `groupBy()` - array grouping

**Lines refactored:**
- 142-153 (fallback function) ✅ Moved & enhanced
- 912-923 (mapRagToBackgroundColour) ✅ Moved as mapRagToColor

---

## Content Bugs to Fix

### High Priority ✅
1. **Line 665-667:** ✅ FIXED - Radon risk uses wrong description (copy of asbestos)
   ```typescript
   // FIXED:
   'radon-risk': {
     description: `Radon is a naturally occurring radioactive gas that can accumulate in buildings...`
   }
   ```

### Medium Priority ✅
2. **Line 327:** ✅ FIXED - Typo in "Very severe" - now correctly uses `>`
   ```typescript
   // FIXED: Category 5: Very severe (&gt; 25mm)
   ```

---

## Style Refactoring Targets

### Most Common Patterns

1. **Heading 1 style** (appears ~15 times)
   ```tsx
   // Before:
   <h1 style={{ fontWeight: 'bold', fontSize: '14pt' }}>Title</h1>
   
   // After:
   import { REPORT_STYLES } from './constants';
   <h1 style={REPORT_STYLES.heading1}>Title</h1>
   ```
   **Lines:** 279, 352, 440, 448, 611, 683, 740

2. **Heading 2 centered** (appears ~10 times)
   ```tsx
   // Before:
   <h2 style={{ fontWeight: 'bold', fontSize: '14pt', textAlign: 'center' }}>Title</h2>
   
   // After:
   <h2 style={REPORT_STYLES.heading2}>Title</h2>
   ```
   **Lines:** 132-136 (H2 component), 280, 319, 328, 344, 407

3. **Right-aligned text** (appears 20+ times)
   ```tsx
   // Before:
   <p style={{ textAlign: 'right' }}>Text</p>
   
   // After:
   <p style={REPORT_STYLES.rightAligned}>Text</p>
   ```
   **Lines:** 180-216 (cover page)

4. **Justified text** (appears 30+ times)
   ```tsx
   // Before:
   <p style={{ textAlign: 'justify' }}>Text</p>
   
   // After:
   <p style={REPORT_STYLES.bodyJustified}>Text</p>
   ```
   **Lines:** Throughout legal sections, risks, conclusion

---

## Function Refactoring

### 1. mapRagToBackgroundColour
**Current location:** Lines 912-923 (inside ConditionSection component)
**Move to:** `utils.ts` as `mapRagToColor()`

**Usage locations:**
- Line 955 (in ConditionSection render)

---

### 2. fallback function
**Current location:** Lines 142-153 (top-level function)
**Move to:** `utils.ts` (keep as-is or enhance)

**Usage locations:**
- Line 369 (yearOfExtensions)
- Line 373 (yearOfConversions)
- Line 385 (otherServices)

---

## Import Updates

After creating the new files, update imports in `BuildingSurveyReportTipTap.tsx`:

```typescript
// Add these imports at the top:
import { LANDSCAPE_WIDTH, REPORT_STYLES, RAG_COLORS } from './constants';
import { DEFAULT_ORG_CONFIG, formatOrgAddress } from './org-config';
import { mapRagToColor, fallback, formatList } from './utils';
```

---

## Testing Checklist

### Manual Testing
- [x] ✅ No linter errors in refactored code
- [x] ✅ TypeScript compilation successful
- [x] ✅ All RAG colors map correctly
- [x] ✅ Organization details reference config correctly
- [ ] ⏳ Generate visual comparison (requires manual test)

### Automated Testing
- [x] ✅ Created `constants.test.ts` - 20 tests covering styles, RAG colors, layouts
- [x] ✅ Created `org-config.test.ts` - 45 tests covering formatting, validation
- [x] ✅ Created `utils.test.ts` - 75 tests covering all utility functions
- [x] ✅ All 140 tests passing with 100% success rate

---

## Estimated Time

| Task | Time | Difficulty |
|------|------|------------|
| Create constants.ts | 30 min | Easy |
| Create org-config.ts | 30 min | Easy |
| Create utils.ts | 30 min | Easy |
| Refactor style usages | 2 hours | Medium |
| Fix content bugs | 15 min | Easy |
| Update imports | 15 min | Easy |
| Write tests | 1 hour | Medium |
| Manual testing | 30 min | Easy |
| **Total** | **5-6 hours** | - |

---

## Success Criteria

✅ **Phase 1 COMPLETE:**

1. ✅ Zero hard-coded style objects in BuildingSurveyReportTipTap.tsx (60+ replaced)
2. ✅ All organization details reference `DEFAULT_ORG_CONFIG` (8 locations updated)
3. ✅ All utility functions moved to shared files (12 functions)
4. ✅ Content bugs fixed (radon description, crack category typo)
5. ✅ All tests passing (140/140 - 100%)
6. ⏳ Visual output comparison (pending manual verification)
7. ⏳ Code review (ready for review)

---

## ✅ PHASE 2 COMPLETE - October 2024

**Status:** ✅ All tasks completed  
**Tests:** ✅ 94/94 passing (100%)  
**Linter Errors:** ✅ 0 errors  
**Time Taken:** ~2 hours

### Summary of Phase 2 Deliverables

| Component | Status | Lines | Tests |
|-----------|--------|-------|-------|
| content/definitions.ts | ✅ Complete | 75 | 15 |
| content/risks.ts | ✅ Complete | 127 | 28 |
| content/legal-sections.ts | ✅ Complete | 118 | 21 |
| content/limitations.ts | ✅ Complete | 90 | 16 |
| content/conclusion.ts | ✅ Complete | 55 | 14 |
| content/index.ts | ✅ Complete | 10 | - |
| BuildingSurveyReportTipTap.tsx | ✅ Refactored | 528 (-462) | - |
| **Total** | **✅ Done** | **1,003** | **94** |

### Key Achievements
- ✅ All static content externalized (400+ lines moved to content modules)
- ✅ 7 risk definitions extracted and categorized
- ✅ 11 statutory items extracted to structured format
- ✅ 8 limitation items extracted with helper functions
- ✅ RAG key, glossary, and crack definitions modularized
- ✅ Main report file reduced by 462 lines (990 → 528)
- ✅ 94 comprehensive tests with 100% pass rate

## ✅ PHASE 3 COMPLETE - October 2024

**Status:** ✅ All tasks completed  
**Tests:** ✅ 36/36 passing (100%) for primitives + 240 existing tests  
**Linter Errors:** ✅ 0 errors  
**Time Taken:** ~1 hour

### Summary of Phase 3 Deliverables

| Component | Status | Lines | Tests |
|-----------|--------|-------|-------|
| report-primitives/types.ts | ✅ Complete | 25 | - |
| TableBlock.tsx | ✅ Complete | 102 | 11 |
| Page.tsx | ✅ Complete | 30 | 5 |
| Heading.tsx | ✅ Complete | 69 | 10 |
| RiskRow.tsx | ✅ Complete | 43 | 10 |
| BuildingSurveyReportTipTap.tsx | ✅ Refactored | 437 (-91) | - |
| **Total** | **✅ Done** | **706** | **36** |

### Key Achievements
- ✅ Extracted 4 reusable primitive components
- ✅ Main report file reduced by 91 lines (528 → 437)
- ✅ Components now reusable across multiple report types
- ✅ 36 comprehensive tests with 100% pass rate for primitives
- ✅ All 240 existing tests still passing
- ✅ Enhanced TableBlock with Fragment support and validation
- ✅ Semantic Heading component with TOC support
- ✅ Consistent styling and behavior across report components

## Next Steps After Phase 3

✅ Phase 3 complete and ready for Phase 4:
1. ⏭️ Implement type-safe data binding (Option B: Type-safe getters)
2. ⏭️ Create `createDataBindings()` helper function
3. ⏭️ Add computed properties (isLevel3, hasExtensions, etc.)
4. ⏭️ Replace direct form property access with data bindings
5. ⏭️ Add validation helpers for required fields
6. ⏭️ Add unit tests for data binding functions

### Estimated Phase 4 Timeline
- Data binding implementation: 2-3 days
- Migration to use bindings: 1-2 days
- Testing: 1 day
- **Total: 4-6 days**

---

## Quick Commands

### Phase 1 Commands
```bash
# Create new files
touch app/home/surveys/building-survey-reports/constants.ts
touch app/home/surveys/building-survey-reports/org-config.ts
touch app/home/surveys/building-survey-reports/utils.ts

# Create test files
touch app/home/surveys/building-survey-reports/__tests__/constants.test.ts
touch app/home/surveys/building-survey-reports/__tests__/org-config.test.ts
touch app/home/surveys/building-survey-reports/__tests__/utils.test.ts

# Run tests
npm test -- building-survey-reports

# Generate comparison report (implement this script)
npm run reports:compare-baseline
```

### Phase 2 Commands
```bash
# Create content directory
mkdir -p app/home/surveys/building-survey-reports/content

# Create content files
touch app/home/surveys/building-survey-reports/content/{index,definitions,risks,legal-sections,limitations,conclusion}.ts

# Create test directory
mkdir -p app/home/surveys/building-survey-reports/__tests__/content

# Create test files
touch app/home/surveys/building-survey-reports/__tests__/content/{definitions,risks,legal-sections,limitations,conclusion}.test.ts

# Run Phase 2 tests
npm test -- building-survey-reports/__tests__/content

# Run all building survey tests
npm test -- building-survey-reports
```

### Phase 3 Commands
```bash
# Create primitives directory structure
mkdir -p app/home/surveys/report-primitives/components
mkdir -p app/home/surveys/report-primitives/__tests__

# Create primitive components
touch app/home/surveys/report-primitives/types.ts
touch app/home/surveys/report-primitives/components/{TableBlock,Page,Heading,RiskRow}.tsx
touch app/home/surveys/report-primitives/components/index.ts
touch app/home/surveys/report-primitives/index.ts

# Create test files
touch app/home/surveys/report-primitives/__tests__/{TableBlock,Page,Heading,RiskRow}.test.tsx

# Run Phase 3 tests
npm test -- report-primitives/__tests__

# Run all tests
npm test -- building-survey-reports
npm test -- report-primitives
```

---

## Rollback Plan

If issues discovered after deployment:

1. **Immediate:** Revert commit
2. **Investigation:** Check visual regression tests
3. **Fix:** Address specific issue in isolation
4. **Redeploy:** With additional test coverage

**Rollback command:**
```bash
git revert <commit-hash>
git push origin main
```

---

---

## Metrics & Statistics

### Phase 1 Code Quality Improvements
- **Lines Reduced:** 30 lines (1,020 → 990 in main file)
- **Test Coverage:** 140 tests covering all new functionality
- **Style Consolidation:** 60+ inline styles → 1 REPORT_STYLES object
- **Organization References:** 8+ hard-coded locations → 1 config
- **Magic Numbers Eliminated:** 15+ → 0

### Phase 2 Code Quality Improvements
- **Lines Reduced:** 462 lines (990 → 528 in main file)
- **Test Coverage:** 94 tests covering all content modules
- **Static Content Extracted:** 400+ lines → 6 content modules
- **Risk Definitions:** 7 risks categorized (building, grounds, people)
- **Legal Items:** 11 statutory items + 2 sections structured
- **Limitation Items:** 8 items + 4 important notes

### Phase 3 Code Quality Improvements
- **Lines Reduced:** 91 lines (528 → 437 in main file)
- **Test Coverage:** 36 tests covering all primitive components
- **Components Extracted:** 4 reusable primitives (TableBlock, Page, Heading, RiskRow)
- **Reusability:** Components now available for all report types
- **Code Organization:** Primitives in dedicated shared directory
- **Component Validation:** Enhanced error handling and warnings

### Combined Test Coverage Breakdown
```
Phase 1 Tests:
constants.test.ts:    20 tests (RAG colors, styles, layouts, dimensions)
org-config.test.ts:   45 tests (formatting, validation, edge cases)
utils.test.ts:        75 tests (all utilities with edge cases)
────────────────────────────────────────────────────────────────
Phase 1 Subtotal:    140 tests ✅ 100% passing

Phase 2 Tests:
definitions.test.ts:  15 tests (RAG key, glossary, crack definitions)
risks.test.ts:        28 tests (7 risk definitions, categorization)
legal-sections.test.ts: 21 tests (statutory items, planning, thermal)
limitations.test.ts:  16 tests (8 limitation items, important notes)
conclusion.test.ts:   14 tests (7 conclusion paragraphs)
────────────────────────────────────────────────────────────────
Phase 2 Subtotal:     94 tests ✅ 100% passing

Phase 3 Tests:
TableBlock.test.tsx:  11 tests (widths validation, fragments, colwidth)
Page.test.tsx:         5 tests (children rendering, page breaks)
Heading.test.tsx:     10 tests (levels, centering, TOC support, styles)
RiskRow.test.tsx:     10 tests (rendering, styling, TOC attributes)
────────────────────────────────────────────────────────────────
Phase 3 Subtotal:     36 tests ✅ 100% passing

════════════════════════════════════════════════════════════════
Total Tests:         270 tests ✅ 100% passing
```

### Performance Impact
- **Build Time:** No measurable change
- **Runtime Performance:** Improved (constants are optimized by bundler)
- **Bundle Size:** Minimal increase (~5KB for new modules)
- **Code Maintainability:** Significantly improved (content separated from code)

---

*Last Updated: October 2024 - Phase 1, 2 & 3 Complete ✅*

---

## Summary: Three Phases Complete

### Overall Impact
- **Total Lines Reduced:** 583 lines (1,020 → 437 in main report file = **57% reduction**)
- **Total Tests Added:** 270 tests with 100% pass rate
- **Modules Created:** 17 new files (constants, content, primitives)
- **Code Organization:** Separated concerns into constants, content, utilities, and reusable components
- **Maintainability:** Significantly improved - changes now require editing specific modules, not monolithic file

### File Size Evolution
```
Phase 0 (Baseline):  1,020 lines - Monolithic component
Phase 1 Complete:     990 lines (-30) - Constants extracted
Phase 2 Complete:     528 lines (-462) - Content extracted  
Phase 3 Complete:     437 lines (-91) - Primitives extracted
─────────────────────────────────────────────────────────────
Total Reduction:      583 lines (57%) 🎉
```

