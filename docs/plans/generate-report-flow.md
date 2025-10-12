## Generate & Re‑Generate Report Flow

This document proposes a minimal, discoverable flow to generate and regenerate Building Survey reports from the survey UI, with safe defaults around versioning.

### Goals

- Enable users to generate a report from a survey detail page without hunting for the editor.
- Support regenerating a report when survey data changes.
- Default to creating a new document version rather than destructive overwrite.
- Keep the UI simple and accessible; comply with repo rules (imports, accessibility, etc.).

### Current State (as of this plan)

- `app/home/surveys/[id]/page.tsx` renders a Documents card containing `SurveyDocuments`.
- `SurveyDocuments` lists existing documents filtered by `doc.id === surveyId`. If none exist, it shows a “No reports found” empty state.
- There is no action in the surveys UI to generate the first report or to regenerate.
- Editor supports `templateId=building-survey` and can render from survey data when the document id equals the survey id.
- `documentStore` persists `#LATEST` and versioned records (`v0`, `v1`, ...). `update` creates a new version server-side via mutation; `create` is for first-time creation.

---

## UX Changes

### 1) Documents Card Header CTA (always visible)

- Add a small button in the Documents card header on `app/home/surveys/[id]/page.tsx`:
  - Label: “Open in editor”.
  - Link to `/home/editor/{surveyId}?templateId=building-survey`.
  - Purpose: clear entry point to generate the first report (Phase 1) or edit existing.

### 2) Empty State CTA in `SurveyDocuments`

- When no documents exist for the survey:
  - Replace the empty text with a primary button: “Open in editor”.
  - Navigates to `/home/editor/{surveyId}?templateId=building-survey`.
  - Accessibility: add `aria-label="Open building survey in editor"`.

### 3) Regenerate Behavior (Phase 1 and Phase 2)

- Phase 1 (initial rollout): No separate “Regenerate” button. Users open the editor via the buttons above and click Save.
  - If a document exists, the editor will create a new version on Save via `documentStore.update`.
  - If a document does not exist, the editor will create the initial document on Save via `documentStore.create`.
- Phase 2 (enhancement): Add an explicit “Regenerate report” button with a confirm dialog that triggers a versioned update automatically (see previous section for dialog copy and behavior).

---

## Technical Design

### Entry Points

- Header CTA in `page.tsx` next to `CardTitle`:

  - Adds a `Link` button to the editor with `templateId=building-survey`.
  - Visible regardless of document presence to improve discoverability.

- `SurveyDocuments` updates:
  - Empty state: render a `Link` button to the editor.
  - Non-empty (Phase 1): keep the document list as-is; rely on users opening the editor and saving to create a new version.
  - Non-empty (Phase 2): add “Regenerate” button with confirm + versioned update (optional enhancement).

### Regeneration Flow

- Phase 1 (via Editor):

  1. User opens `/home/editor/{surveyId}?templateId=building-survey` from survey UI.
  2. Editor loads survey data into the template for preview/editing.
  3. On Save:
     - If no existing document: `documentStore.create` writes v0 and `#LATEST`.
     - If existing document: `documentStore.update` writes a new version and updates `#LATEST`.

- Phase 2 (one-click Regenerate):
  1. Load survey and map to HTML (`mapFormDataToHtml`).
  2. Call `documentStore.update(surveyId, html, 'building-survey', 'regenerate')` after confirmation.
  3. Navigate to the editor.

### API/Code Touch Points

- `app/home/surveys/[id]/page.tsx`

  - Add right-aligned `Link` button in the Documents card header.

- `app/home/components/SurveyDocuments.tsx`
  - Add two CTA states:
    - Empty: primary “Generate report” link.
    - Non-empty: secondary “Regenerate” button with confirm.
  - Implement regeneration handler:
    - Uses `surveyStore.get`, `mapFormDataToHtml`, `documentStore.update` (changeType `'regenerate'`).
    - Toast on success/error; loading state on the button.
    - Navigate to editor after success.

No schema changes are required.

### Edge Cases & Validation

- Offline mode: `documentStore` guards with `navigator.onLine`; show a toast error if offline.
- Tenant missing: `getCurrentTenantId` failures should surface user-facing errors.
- Missing survey fields/images: `mapFormDataToHtml` already guards; still handle empty HTML with a friendly error.
- Large content: current limits (10MB) apply; surface errors from `zod`/upload.

### Accessibility

- Provide `aria-label` on buttons, and clear button text.
- Ensure confirm dialog is keyboard-navigable and focus-managed.

### Telemetry (Optional)

- Log changeType `'regenerate'` in versions to distinguish from manual edits.

### Testing

- Unit: mock `surveyStore`, `documentStore`, ensure correct calls on first-time vs. regeneration.
- Integration: user flow from survey page → generate → editor opens populated; regenerate increments version and updates `#LATEST`.
- Snapshot/UI: buttons appear correctly in both empty and non-empty states.

### Rollout

- Phase 1 (now):
  - Add header CTA + empty-state CTA linking to editor. No confirm dialog. No extra buttons.
  - Rely on editor to handle initial creation (first Save) and regeneration (subsequent Save creates a new version).
- Phase 2 (optional):
  - Add explicit “Regenerate report” CTA with confirmation that triggers a one-click versioned update before opening the editor.

---

## Minimal Implementation Tasks (Phase 1)

- Add header CTA in `app/home/surveys/[id]/page.tsx` (Link to editor).
- Update `SurveyDocuments` empty state: primary “Open in editor” link.
- No regeneration button in Phase 1; regeneration occurs on Save in the editor.
