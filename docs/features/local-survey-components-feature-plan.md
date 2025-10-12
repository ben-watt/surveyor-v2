# Local Survey-Scoped Components — Technical Design (Final)

## Overview

When users click “Create new” in the Component combobox on the Inspection form, the app currently opens the global Component form and writes to the global catalogue. We want these on-the-fly creations to exist only within the active survey, avoiding global pollution and preserving per-survey intent.

## Current Behavior

- Inspection form component selector pulls options from the global `componentStore` and filters by selected element.
- The survey content stores inspection instances under `sections[].elementSections[].components[]` via helpers in `app/home/surveys/building-survey-reports/Survey.ts`.

## Goal

- Create and use “local components” that are scoped to the current survey only.
- Keep the global components library intact and available.
- Show both global and local options in the Component combobox.

## Non‑Goals

- Removing or changing the global component management pages.
- Adding new survey schema collections for local component definitions.
- Large‑scale entity refactors (handled in separate docs).

## Implemented Design (Component and Condition Local Definitions)

We introduced explicit, survey‑scoped definition lists per element to make local items reusable without mining prior inspections.

### Data Model

- `ElementSection.localComponentDefs?: LocalComponentDef[]`
- `ElementSection.localConditionDefs?: LocalConditionDef[]`

```ts
type LocalComponentDef = {
  id: string; // localdef_<uuid>
  name: string;
  elementId: string;
  materials?: { name: string }[];
  associatedPhraseIds?: string[]; // optional, not enforced yet
  createdAt?: string;
  updatedAt?: string;
};

type LocalConditionDef = {
  id: string; // locond_<uuid>
  name: string;
  text: string;
  createdAt?: string;
  updatedAt?: string;
};
```

No Amplify schema changes are required — these defs live inside the survey JSON (`Surveys.content`).

### Helper APIs (Survey.ts)

- `getLocalComponentDefs(survey, sectionId, elementId)`
- `addOrUpdateLocalComponentDef(survey, sectionId, elementId, def)`
- `removeLocalComponentDef(survey, sectionId, elementId, defId)`
- `getLocalConditionDefs(survey, sectionId, elementId)`
- `addOrUpdateLocalConditionDef(survey, sectionId, elementId, def)`
- `removeLocalConditionDef(survey, sectionId, elementId, defId)`

All use `findOrCreateElementSection` and are idempotent.

### UI Integration (InspectionForm.tsx)

- Component combobox options:
  - Global components filtered by selected element
  - Local component defs for the element (labeled “{name} - (survey only)”), with a sectionId fallback derived from the element when form’s `surveySection.id` isn’t set
  - Current local selection if not present in global
- Selecting a local component def:
  - Immediately creates a new inspection instance (id: `local_<uuid>`) from that def via `addOrUpdateComponent`, then selects it
- “Create new component” (survey only):
  - Creates a local component def (id: `localdef_<uuid>`) and an instance in `components[]`, then selects it
  - SectionId fallback: if `surveySection.id` isn’t set yet, derive from the selected element’s `sectionId`
- Edit component:
  - Local: rename prompt updates the selected instance’s `name` and persists
  - Global: toggles “Name Override” field (unchanged)
- Condition combobox options:
  - Global phrases filtered by association for global components; all condition phrases for local components
  - Local condition defs for the element (labeled “{name} - (survey only)”) merged in
  - Current in‑form conditions merged to ensure visibility pre‑persist
- “Create new condition” (survey only):
  - Creates a local condition def (id: `locond_<uuid>`) and appends an instance to the form, persisting via `addOrUpdateComponent`

### Consumption Example: useLocalDefs

```tsx
import { useLocalDefs } from '@/app/home/surveys/hooks/useLocalDefs';

function MyElementPanel({ survey, elements, sectionId, elementId }: any) {
  const { componentDefs, conditionDefs, addComponentDef, addConditionDef } = useLocalDefs(
    survey,
    elements,
    elementId,
    sectionId,
  );

  return (
    <div>
      <h3>Local Components</h3>
      <ul>
        {componentDefs.map((d) => (
          <li key={d.id}>{d.name}</li>
        ))}
      </ul>
      <button onClick={() => addComponentDef(survey.id, elementId, 'Custom Item')}>
        Add Local Component
      </button>

      <h3 className="mt-4">Local Conditions</h3>
      <ul>
        {conditionDefs.map((d) => (
          <li key={d.id}>{d.name}</li>
        ))}
      </ul>
      <button
        onClick={() =>
          addConditionDef(survey.id, elementId, 'Spalled brick', 'Brick spalling noted...')
        }
      >
        Add Local Condition
      </button>
    </div>
  );
}
```

### Error Handling & Edge Cases

- If element/section context is missing on create, we show a toast error and no‑op
- Options recompute includes a derived `sectionId` fallback to avoid timing gaps while `surveySection` syncs from element selection
- Id conventions: `local_` for instances, `localdef_` for component defs, `locond_` for condition defs

### Tests

- Local components
  - shows local selection label when component is local
  - creating a local component persists immediately and selects it
  - creating a local condition persists immediately and is visible as selected
- Local condition definitions
  - local defs appear for the element even when `surveySection.id` isn’t set (section fallback)

Files:

- `__tests__/inspection-form-local-components.test.tsx`
- `__tests__/inspection-form-local-conditions.test.tsx`
- `__tests__/inspection-form-local-component-defs.test.tsx`

### Phrases Association Consideration

Current phrase options are filtered by `phrase.associatedComponentIds.includes(component.id)`. For local ids, this typically returns none.

- Recommended fallback when selected component is local:
  - Show all Condition phrases (or a broader sensible subset), sorted by order/popularity.
  - Optionally persist a local association on the inspection if needed later.

## Implementation Summary

1. Schema: added `localComponentDefs` and `localConditionDefs` arrays to `ElementSection`
2. Helpers: added get/addOrUpdate/remove for both defs
3. UI: merged defs into comboboxes; create/select instantly persists
4. Fallbacks: derive sectionId from the element when needed
5. Tests: added focused tests for local defs discovery and create flows

## Validation & Testing

- Verify merged combobox options display correctly and identify local items.
- Create‑new local → component set in form → autosave persists an inspection in `ElementSection.components`.
- Editing local component name reflects in the form and persists.
- Global create/edit flows remain unaffected.
- Phrase options remain usable for local selections with fallback logic.

## Rollout

- No Amplify changes; defs live in survey JSON
- Backward compatible; existing surveys remain valid
- Optional feature flag if you want to gate the UI

## Acceptance Criteria

- “Create new” (Component) creates a `localdef_*` entry and a `local_*` instance, selected and labeled “(survey only)”
- Selecting a local component def creates a new instance and selects it
- Condition “Create new” creates a `locond_*` def and appends an instance
- Both comboboxes show local defs for the selected element (with section fallback)
- Global flows remain unaffected

## Possible Improvements & Refactors

- Implemented: Unify “def → instance” creation
  - `app/home/surveys/utils/localDefInstance.ts` → `instantiateLocalComponentDef(...)`
  - Used in `InspectionForm.tsx` for both selecting a local component def and creating a new local component
- Implemented: `useLocalDefs(elementId)` hook
  - `app/home/surveys/hooks/useLocalDefs.ts` encapsulates section fallback + memoization
  - Exposes `{ sectionId, componentDefs, conditionDefs, addComponentDef, addConditionDef }`
- Implemented: ID prefixes/constants
  - `app/home/surveys/constants/localIds.ts` → `ID_PREFIX`, `isLocalInstanceId`, `isLocalComponentDefId`, `isLocalConditionDefId`
  - Replaced inline string checks with helpers where appropriate
- Optional: support `associatedPhraseIds` on `LocalComponentDef` to narrow condition options for locals
- Editing defs (V2): allow rename/delete of local defs and cascade optional updates to selected instances
- UX polish: render a small badge for “survey only” in combobox items
- Telemetry: track adoption of local defs vs global for future product decisions
