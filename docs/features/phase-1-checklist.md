# Phase 1 Implementation Checklist

Quick reference for implementing Phase 1 quick wins from the [building-survey-report-refactoring-plan.md](./building-survey-report-refactoring-plan.md).

## Files to Create

### 1. Constants File
**Path:** `app/home/surveys/building-survey-reports/constants.ts`

**Contents:**
- [ ] `LANDSCAPE_WIDTH = 928`
- [ ] `IMAGE_MAX_HEIGHT = '75mm'`
- [ ] `REPORT_STYLES` object with all inline styles
- [ ] `RAG_COLORS` mapping

**Lines to refactor:** Replace all inline `style={{...}}` with `REPORT_STYLES.*`

---

### 2. Organization Config
**Path:** `app/home/surveys/building-survey-reports/org-config.ts`

**Contents:**
- [ ] `OrganizationConfig` interface
- [ ] `DEFAULT_ORG_CONFIG` with Clarke & Watt details
- [ ] `formatOrgAddress()` helper

**Lines to refactor:** 202-216 (company details on cover page)

---

### 3. Utilities File
**Path:** `app/home/surveys/building-survey-reports/utils.ts`

**Contents:**
- [ ] `mapRagToColor()` function
- [ ] Enhanced `fallback()` function (move from line 142)
- [ ] `formatList()` helper

**Lines to refactor:**
- 142-153 (current fallback function)
- 912-923 (mapRagToBackgroundColour function)

---

## Content Bugs to Fix

### High Priority
1. **Line 665-667:** Radon risk uses wrong description (copy of asbestos)
   ```typescript
   // WRONG:
   'radon-risk': {
     description: `Given the age of the property, there is a likelihood that there are areas of ACMs...`
   }
   
   // CORRECT:
   'radon-risk': {
     description: `Radon is a naturally occurring radioactive gas...`
   }
   ```

### Medium Priority
2. **Line 337:** Typo in "Very severe" - uses `<` instead of `>`
   ```typescript
   // CURRENT: Category 5: Very severe (&lt; 25 mm)
   // SHOULD BE: Category 5: Very severe (> 25 mm)
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
- [ ] Generate a test report before refactoring (save as baseline)
- [ ] Generate a test report after refactoring
- [ ] Visual comparison: no differences in output
- [ ] Check all RAG colors render correctly
- [ ] Verify organization details display correctly

### Automated Testing
- [ ] Create `constants.test.ts` with RAG color tests
- [ ] Create `org-config.test.ts` with address formatting tests
- [ ] Create `utils.test.ts` with utility function tests
- [ ] Run snapshot test on full PDF output

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

✅ **Phase 1 Complete When:**

1. Zero hard-coded style objects in BuildingSurveyReportTipTap.tsx
2. All organization details reference `DEFAULT_ORG_CONFIG`
3. All utility functions moved to shared files
4. Content bugs fixed (radon description, crack category)
5. All tests passing
6. Visual output identical to baseline
7. Code review approved

---

## Next Steps After Phase 1

Once Phase 1 is merged:
1. Create Phase 2 branch for content extraction
2. Begin extracting risk definitions to `content/risks.ts`
3. Start on legal sections extraction
4. Plan primitives extraction (Phase 3)

---

## Quick Commands

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

*This checklist should be updated as Phase 1 progresses to track completion status.*

