# Local Survey-Scoped Components — Feature Plan (Updated)

## Overview
When users click “Create new” in the Component combobox on the Inspection form, the app currently opens the global Component form and writes to the global catalogue. We want these on-the-fly creations to exist only within the active survey, avoiding global pollution and preserving per-survey intent.

## Current Behavior
- Inspection form component selector pulls options from the global `componentStore` and filters by selected element.
- The “Create new” action opens `ComponentDataForm` (`app/home/building-components/form.tsx`) and persists to the global catalogue.
- The survey content stores inspection instances under `sections[].elementSections[].components[]` via helpers in `app/home/surveys/building-survey-reports/Survey.ts`.

## Goal
- Create and use “local components” that are scoped to the current survey only.
- Keep the global components library intact and available.
- Show both global and local options in the Component combobox.

## Non‑Goals
- Removing or changing the global component management pages.
- Adding new survey schema collections for local component definitions.
- Large‑scale entity refactors (handled in separate docs).

## Proposed Design

### Simplest Viable Approach (Immediate Persist + Minimal Options)

V1 focuses on correctness and simplicity to avoid edge cases like “(unnamed)” labels and complex option derivation.

- Single source of truth: continue using `ElementSection.components: Inspection[]` only.
- Local ID convention: prefix with `local_` to distinguish from catalogue ids.

Create New (Local)
- On “Create new” and after the user enters a name, immediately persist a minimal Inspection to the survey via `surveyStore.update` + `addOrUpdateComponent(sectionId, elementId, inspection)`:
  - `inspection`: `{ id: local_<uuid>, inspectionId: <uuid>, name: <entered>, ...defaults }`
  - This associates it to the selected element/section right away, ensuring it appears consistently and with the correct name.
- Then set the form field `component` to `{ id, name }` and keep the user in the form.

Component Options (Minimal)
- Options = global components filtered by `element.id` + the currently selected component if it’s local and not in global.
- Do not scan the survey for other locals in V1. This avoids complex merging and “who owns the label” issues. If reuse of locals across the same element becomes important, we’ll add it in V2.
- Label locals as `"{name} - (survey only)"`.

Edit (Rename)
- If the selected component is local, open a small rename prompt.
- On save, update both the form’s `component.name` and the persisted Inspection name via `surveyStore.update` (target the inspection by `inspectionId` or `id`).
- For global selections, keep the current Name Override toggle.

Phrases (Conditions)
- When the selected component is local, bypass `associatedComponentIds` and show all Condition phrases (sorted by order/popularity).
- Keep the “create local condition” path: append to the form’s `conditions` immediately; autosave/manual save will persist.

Why this is simpler
- Immediate persist removes the need for pre-persist injection hacks and eliminates “(unnamed)” edge cases.
- Minimal options set keeps the dropdown logic trivial and predictable.
- Rename updates both UI state and persisted survey data in one place.

### Optional V2 (Reuse Local Components Within Element)
- Derive a “Recent in this element” group by scanning `elementSection.components` to list other local inspections for quick reuse.
- Still keep locals clearly labeled and dedupe by `id` if current selection is already present.

### Phrases Association Consideration
Current phrase options are filtered by `phrase.associatedComponentIds.includes(component.id)`. For local ids, this typically returns none.
- Recommended fallback when selected component is local:
  - Show all Condition phrases (or a broader sensible subset), sorted by order/popularity.
  - Optionally persist a local association on the inspection if needed later.

## Implementation Steps

1) No schema changes
- Keep `BuildingSurveyReportSchema.ts` as-is; continue using `Inspection[]` under `ElementSection.components`.

2) Simplify options in InspectionForm
- `componentOptions = globalForElement + (currentSelection if local)`.
- Label locals as `"{name} - (survey only)"`.

3) Replace onCreateNew
- Swap to a minimal local name capture.
- On submit, immediately call `surveyStore.update` with `addOrUpdateComponent(...)` to persist the minimal Inspection, then set the form `component` value and close the drawer.

4) Edit icon behavior
- If the current `component.id` is local, either:
  - Open the rename prompt that updates both form state and persisted inspection name.
  - For global: toggle Name Override as today.

5) Phrase filtering fallback
- When a local id is selected, bypass `associatedComponentIds` filtering and show the fallback list. Keep existing behavior for global ids.

6) (Optional) Promote to global
- Add an overflow action to copy a local item into the global catalogue (admin‑only). This does not retroactively change existing inspections unless explicitly chosen.

## Validation & Testing
- Verify merged combobox options display correctly and identify local items.
- Create‑new local → component set in form → autosave persists an inspection in `ElementSection.components`.
- Editing local component name reflects in the form and persists.
- Global create/edit flows remain unaffected.
- Phrase options remain usable for local selections with fallback logic.

## Rollout
- Add a feature flag to guard the new local creation path if desired.
- No migrations required; fully backward compatible.
- Update user docs to explain local vs global components.

## Acceptance Criteria
- “Create new” on Component combobox creates a survey‑local component by setting a local id+name in the form and persisting into `ElementSection.components`.
- Local components are visible only within the active survey and clearly labeled in the combobox.
- Saving the inspection with a local component works without touching the global catalogue.
- Phrase options remain meaningful for local selections via fallback behavior.
