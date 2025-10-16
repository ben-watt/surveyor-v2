---
title: Inline Conditions Editor – Developer Guide
description: How inline condition editing works (TipTap InlineSelect), the data model, integration points, APIs, validation, and tests.
owner: Product + Eng
status: In progress
last_updated: 2025-10-15
---

<!-- Renamed from conditions-editing-feature-plan.md -->

## Overview

Inline condition editing lets surveyors pick values inside condition text using a TipTap editor with a custom InlineSelect node. In the inspection form we use a view‑only visual composer (no token/code mode) and a simple list with reorder + validation cues.

Key points:
- Fixed select lists (no custom entry in MVP)
- Per‑inspection persistence of TipTap `doc` plus resolved plain text `phrase`
- Unresolved state highlighted when an InlineSelect has neither a `value` nor a `defaultValue`

## Architecture and Data Model

- Form phrase (inspection form): `app/home/surveys/[id]/condition/types.ts`
  - `FormPhrase`:
    - `id: string`
    - `name: string`
    - `phrase: string` (Level 3 resolved text)
    - `doc?: JSONContent` (Level 3 TipTap doc; source of truth for selections)
    - `phraseLevel2?: string` (Level 2 resolved text)
    - `docLevel2?: JSONContent` (Level 2 TipTap doc)

- Survey content: `app/home/surveys/building-survey-reports/BuildingSurveyReportSchema.ts`
  - `Phrase` includes both Level 2 and Level 3 fields:
    - `phrase: string` and `doc?: JSONContent` (Level 3)
    - `phraseLevel2?: string` and `docLevel2?: JSONContent` (Level 2)

- Persistence: `addOrUpdateComponent` writes both level versions. The form syncs `phrase = resolveDocToText(doc)` and `phraseLevel2 = resolveDocToText(docLevel2)` whenever docs change.

## Token Syntax (interop)

- Single‑select tokens only: `{{select:key|opt1|opt2|...}}`
- Optional default: `{{select*:key|default=opt2|opt1|opt2}}`
- No custom entry flag in MVP

Interop helpers: `lib/conditions/interop.ts` (`tokensToDoc`, `docToTokens`).

## Editor Components

- Inline composer: `components/conditions/InlineTemplateComposer.tsx`
  - Props used in inspection:
    - `value: string` (tokenized fallback)
    - `initialDoc?: JSONContent` (preferred; preserves selections when reopening)
    - `onDocChange(doc)` (update instance and re‑resolve text)
    - `viewOnly: true` (forces visual mode; hides token/code toggle and action FABs)

- InlineSelect node + NodeView: `app/home/components/TipTapExtensions/InlineSelect.ts` and `InlineSelectNodeView.tsx`
  - Attrs: `{ key: string; options: string[]; defaultValue?: string; value?: string }`
  - Fixed options only; “Add custom…” removed for MVP

## Inspection Integration

- Conditions list: `app/home/surveys/[id]/condition/ConditionsList.tsx`
  - API: `{ conditions, onEdit, onMoveUp, onMoveDown, onRemove, isUnresolved? }`
  - Shows names, per-item unresolved icon + red outline if needed
  - Responsive actions: Up/Down always visible; Edit/Remove in overflow on small screens
  - Defaults to `isConditionUnresolved(condition)` from `lib/conditions/validator`

- Edit flow: `app/home/surveys/[id]/condition/InspectionForm.tsx`
  - Opens drawer with `InlineTemplateComposer` using `initialDoc={condition.doc}` and `viewOnly`
  - `onDocChange(doc)` writes back to `conditions[i].doc` and sets `conditions[i].phrase = resolveDocToText(doc)`
  - “Done” triggers save so selections persist immediately

## Validation and Unresolved Rules

- Helpers in `lib/conditions/validator.ts`:
  - `isDocUnresolved(doc: JSONContent)` – checks if any InlineSelect lacks `value` or `defaultValue`
  - `isPhraseLikelyUnresolved(phrase: string)` – heuristic check for token-based phrases
  - `isConditionUnresolved(condition)` – prefers `doc`, falls back to `phrase` tokens without `default=`
  - `isConditionUnresolvedForLevel(condition, level)` – level-aware validation that checks appropriate doc/phrase based on survey level ('2' or '3')
  - `isMissingLevel2Content(condition)` – returns true if `phraseLevel2` is empty or undefined

## Level-Aware Conditions Storage

**Problem:** When users switch surveys between Level 2 and Level 3, condition text needs to update to show the appropriate level's content.

**Solution:** Store both Level 2 and Level 3 phrase/doc data in inspection conditions.

### Storage Strategy

- **Library phrases** provide separate content for each level:
  - `phrase` / `phraseDoc` – detailed Level 3 content
  - `phraseLevel2` / `phraseLevel2Doc` – simplified Level 2 content
  
- **Inspection conditions** persist both levels when added:
  - `buildPhrasesOptions` in `app/home/surveys/[id]/condition/utils/options.ts` includes both level docs
  - `addOrUpdateComponent` in `Survey.ts` saves both `doc`/`phrase` and `docLevel2`/`phraseLevel2`

- **Local conditions** (survey-only) use the same text for both levels

### Editing Behavior

When editing a condition's inline selections:
1. The editor loads the appropriate doc based on current survey level (`docLevel2` for Level 2, `doc` for Level 3)
2. On change, **both levels are updated** with the same selections
3. This ensures selections remain synchronized across levels

### Display Logic

- **PDF/HTML export** (`BuildingSurveyReportTipTap.tsx`):
  - Level 2 surveys display `phraseLevel2` (falls back to `phrase` if missing)
  - Level 3 surveys display `phrase`

- **Validation warnings** (`ConditionsList.tsx`):
  - Level 2 surveys check for missing Level 2 content using `isMissingLevel2Content()`
  - Shows "Missing Level 2 content" warning when `phraseLevel2` is empty
  - Combines with unresolved selection warnings: "Needs selection & missing Level 2 content"
  - Level 3 surveys only check for unresolved inline selections

### Backward Compatibility

- Existing conditions without Level 2 fields continue to work
- Empty `phraseLevel2` triggers validation in Level 2 surveys (not silent fallback)
- This alerts users that library phrases need Level 2 content added

## Rendering and Export

- `lib/conditions/resolver.ts#resolveDocToText(doc)` replaces InlineSelect nodes with the selected value (or default) and normalizes spaces
- Same resolver is used for in‑app display and PDF/HTML export to avoid divergence
- Level-aware rendering uses appropriate phrase based on `survey.reportDetails.level`

## Testing Checklist

### Core Functionality
- Selection persistence: choose option → Done → reopen shows the same selection (`initialDoc`)
- Save on Done: save persists `doc` and resolved `phrase`
- Unresolved: per-item red outline + warning icon; summary count updates
- Reordering: Up/Down changes order; data intact
- View‑only composer: no token/code toggle or action FABs; fixed options only; dropdowns interactive
- NodeView options: confirm "Add custom…" is not rendered
- Resolver output: `resolveDocToText` includes chosen values and normalized spacing
- Local seed: creating a local condition seeds `doc = tokensToDoc(text)` and editing works

### Level-Aware Conditions
- **Both levels saved**: Adding condition to survey persists both `phrase`/`doc` and `phraseLevel2`/`docLevel2`
- **Level switching**: Changing survey level (2↔3) displays appropriate text in PDF
- **Edit synchronization**: Editing inline selections updates both levels with same values
- **Validation**:
  - Level 2 surveys show "Missing Level 2 content" warning for empty `phraseLevel2`
  - Level 3 surveys ignore Level 2 validation
  - Unresolved selections flagged at current level only
- **Backward compatibility**: Conditions without Level 2 fields continue to work
- **Local conditions**: Survey-only conditions use same text for both levels

### Test Files
- `lib/conditions/__tests__/validator.test.ts` – 25 tests including Level 2 validation
- `app/home/surveys/[id]/condition/__tests__/level-aware-conditions.test.tsx` – 9 tests
- `app/home/surveys/[id]/condition/__tests__/inspection-form-level-aware.test.tsx` – 5 tests
- `app/home/surveys/[id]/condition/__tests__/level-2-content-warning.test.tsx` – 6 tests
- `app/home/surveys/building-survey-reports/__tests__/level-aware-pdf-rendering.test.tsx` – 6 tests

## Changelog

- 2025-10-16: Added level-aware conditions storage – both Level 2 and Level 3 data persisted per inspection. Added validation for missing Level 2 content. 56 comprehensive tests covering all behaviors.
- 2025-10-15: Renamed doc and updated UX guidance (responsive actions, per-item indicators, summary count).


