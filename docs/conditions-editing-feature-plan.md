---
title: Conditions Editing – Developer Guide
description: How inline condition editing works (TipTap InlineSelect), the data model, integration points, APIs, validation, and tests.
owner: Product + Eng
status: In progress
last_updated: 2025-10-14
---

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
    - `phrase: string` (resolved text used for quick display/exports)
    - `doc?: JSONContent` (TipTap doc; source of truth for selections)

- Survey content: `app/home/surveys/building-survey-reports/BuildingSurveyReportSchema.ts`
  - `Phrase` includes `doc?: JSONContent` and `phrase: string`

- Persistence: `addOrUpdateComponent` writes `conditions[].doc` and `conditions[].phrase`. The form syncs `phrase = resolveDocToText(doc)` whenever `doc` changes.

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
  - Shows names, Up/Down/Edit/Remove icons, and a “Needs selection” badge
  - Defaults to `isDocUnresolved(condition.doc)` from `lib/conditions/validator`

- Edit flow: `app/home/surveys/[id]/condition/InspectionForm.tsx`
  - Opens drawer with `InlineTemplateComposer` using `initialDoc={condition.doc}` and `viewOnly`
  - `onDocChange(doc)` writes back to `conditions[i].doc` and sets `conditions[i].phrase = resolveDocToText(doc)`
  - “Done” triggers save so selections persist immediately

## Validation and Unresolved Rules

- Helper: `isDocUnresolved(doc: JSONContent)` in `lib/conditions/validator.ts`
- A condition is unresolved if any InlineSelect lacks both `value` and `defaultValue`
- Items without a `doc` are not flagged in MVP (optional future: parse tokenized `phrase` to check)

## Rendering and Export

- `lib/conditions/resolver.ts#resolveDocToText(doc)` replaces InlineSelect nodes with the selected value (or default) and normalizes spaces
- Same resolver is used for in‑app display and PDF/HTML export to avoid divergence

## Reference

- Editor: `components/conditions/InlineTemplateComposer.tsx`
- Node + NodeView: `app/home/components/TipTapExtensions/InlineSelect.ts`, `InlineSelectNodeView.tsx`
- Interop: `lib/conditions/interop.ts` (`tokensToDoc`, `docToTokens`)
- Resolver: `lib/conditions/resolver.ts` (`resolveDocToText`)
- Validation: `lib/conditions/validator.ts` (`validateDoc`, `validateTemplate`, `isDocUnresolved`)
- Inspection UI: `app/home/surveys/[id]/condition/InspectionForm.tsx`, `ConditionsList.tsx`

## Testing Checklist

- Selection persistence: choose option → Done → reopen shows the same selection (`initialDoc`)
- Save on Done: save persists `doc` and resolved `phrase`
- Unresolved: badge shows when missing value/default; clears after selection; banner count updates
- Reordering: Up/Down changes order; data intact
- View‑only composer: no token/code toggle or action FABs; fixed options only; dropdowns interactive
- NodeView options: confirm “Add custom…” is not rendered
- Resolver output: `resolveDocToText` includes chosen values and normalized spacing
- Local seed: creating a local condition seeds `doc = tokensToDoc(text)` and editing works

## Future Considerations

- Optional: parse tokenized `phrase` when `doc` absent to flag unresolved
- Add inline decorations/linter plugin to surface issues in‑editor
- Extend node types (text/date/multi‑select) behind feature flags
