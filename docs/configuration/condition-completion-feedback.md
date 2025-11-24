---
title: "Condition Completion Feedback"
status: implemented
category: configuration
created: 2025-10-01
updated: 2025-11-24
tags: [validation, badges, conditions]
related: [../editor/inline-conditions-editor.md]
---

## Property Condition: Element-level completeness badges (dev notes)

### Summary

Element rows in `app/home/surveys/[id]/condition/page.tsx` show subtle outline badges for Description, Images, and Components when included in the survey. Icons are grey when satisfied and red when an issue exists. The old component count for excluded elements is hidden; component-list badges were reverted.

### Logic

- Utility: `getElementCompleteness(element)` → `{ hasDescription, hasImages, imageCount, hasComponents, componentCount }`
  - `hasDescription`: trimmed `description` length > 0
  - `imageCount`: count of non-archived images
  - `hasComponents`: `components.length > 0`

### UI

- Implemented in `ElementSectionComponent` within `page.tsx`
- Uses `Badge` (variant `outline`) + `Tooltip`
- Icons: `CheckCircle2` (description), `Camera` (images), `Shapes` (components)
- Color: grey (`text-muted-foreground`) when OK, red (`text-red-600`) on issues
- Accessibility: badges include aria-labels and tooltips

### Files

- Added: `app/home/surveys/utils/elementCompleteness.ts`
- Updated: `app/home/surveys/[id]/condition/page.tsx`
- Reverted: `app/home/surveys/[id]/condition/ComponentsList.tsx`

### Tests

- `tests/element-completeness.test.ts`
- `tests/element-list-badges.test.tsx`

### Future

- Optional summary banner aggregating missing counts across elements
