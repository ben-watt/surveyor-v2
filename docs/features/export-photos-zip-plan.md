# Export Photos as ZIP — Plan

This plan prioritizes fixing the photos page to display human-friendly Section and Element names, then adds an export-to-ZIP feature. It includes implementation details, tradeoffs, and alternatives.

## Goals

- Show Section Name / Element Name for element and inspection images on the photos page (not raw IDs or path heuristics).
- Provide an Export ZIP action that collects all photos for a survey, with an option to include archived images.
- Ensure exported folder structure reflects Section/Element names for clarity.

## Phase 1 — Correct Names on Photos Page (Priority)

### Problem
The current photos page groups images by inspecting path segments and uses heuristics (e.g., `money-shot`, `front-elevation`, `report-images`). For element and inspection images under `report-images/<surveyId>/elements/<elementId>` and `report-images/<surveyId>/inspections/<inspectionId>`, it can’t always resolve human-friendly names, so IDs or rough path-derived labels appear.

### Approach

1. Add resolvers to convert an imagePath into a typed descriptor and then into a display name:
   - Parse paths into one of:
     - `cover` → Cover Image (money-shot)
     - `front` → Front Elevation
     - `report` → Report Images (misc bucket)
     - `element` → `{ elementId }`
     - `inspection` → `{ inspectionId }`
   - Element paths: `report-images/${surveyId}/elements/${elementId}/...`
   - Inspection paths: `report-images/${surveyId}/inspections/${inspectionId}/...`

2. Fetch name data for mapping IDs → names:
   - `elementStore.useList()` → map `elementId → elementName` and also `elementId → sectionId`.
   - `sectionStore.useList()` → map `sectionId → sectionName`.
   - `surveyStore.useGet(id)` → survey content utilities in `Survey.ts` help resolve inspection → element/section:
     - Use `findComponent(survey, inspectionId)` to get `{ elementSection, section }` and thus names.

3. Rendering logic in `app/home/surveys/[id]/photos/page.tsx`:
   - Build a small `resolveDisplayName(imagePath)` that returns one of:
     - `Cover Image`
     - `Front Elevation`
     - `Report Images`
     - `SectionName / ElementName` for element images
     - `Inspections / SectionName / ElementName` for inspection images (fallback to `Inspections` if unresolved)
   - Replace the current path-based heuristics for section titles with this resolver.

4. Grouping
   - Keep the grouping by resolved display name. This keeps semantics stable and improves human scan-ability.

### Edge Cases

- Missing element/section entities: show `Unknown Element` or `Unknown Section` fallbacks.
- Inspection ID not found in survey content: group under `Inspections` (with count), or `Inspections / Unknown`.
- Backwards paths or legacy paths: current heuristics for cover/front/report remain as fallbacks.

### Testing

- Survey with elements and inspections: confirm display shows `SectionName / ElementName` where appropriate.
- Only cover/front/report images: still grouped and named correctly.
- Archived toggle: grouping and counts remain correct.

## Phase 2 — Export ZIP (MVP + Scalable)

### MVP (Client-side ZIP)

- Add an "Export ZIP" button on the photos page header.
- Use `jszip` in the browser:
  - Collect all currently considered photos (respect Show Archived toggle).
  - For each image, resolve full URL via `enhancedImageStore.getFullImageUrl(imagePath)`; download with limited concurrency.
  - Insert files into a ZIP structure reflecting the display name folders:
    - `Cover Image/`
    - `Front Elevation/`
    - `Report Images/`
    - `SectionName/ElementName/`
    - `Inspections/SectionName-ElementName/`
  - Use `fileName` if present; else derive from path basename; sanitize names.
  - Generate zip blob and trigger download: `survey-<id>-photos.zip`.
  - Show progress and disable button while running.

Pros:
- Quick to ship; works offline if full images are available locally (less likely) or if URLs cache well.

Cons:
- Browser memory usage grows with large zips; slower on low-end devices; network load from the browser.

### Scalable (Server-streamed ZIP)

- Add route: `app/api/surveys/[id]/photos/export/route.ts`.
- Inputs: `includeArchived` query; surveyId from path.
- Validate tenant/user; filter `ImageMetadata` by `tenantId`, `imagePath` prefix `report-images/${surveyId}/`, `isDeleted != true`, and archived based on toggle.
- For each image record:
  - Derive destination path in zip using the same name resolver as the UI (duplicate the logic or share a small util if possible).
  - Get signed URL via Amplify Storage `getUrl({ path })` and stream content into a zip using `archiver` with limited concurrency.
- Stream the response (`Content-Type: application/zip`, `Content-Disposition: attachment; filename="survey-<id>-photos.zip"`).
- Handle per-file errors gracefully (skip with log).

Pros:
- Scales to large surveys; low browser memory footprint; faster and more reliable for big exports.

Cons:
- Requires server infra (Route Handler), dependency on `archiver` and server runtime; signed URL fetching and streaming complexities; must ensure tenant isolation.

## Folder & Filename Conventions

- Folders:
  - Cover: `Cover Image/`
  - Front Elevation: `Front Elevation/`
  - Report Images: `Report Images/`
  - Element images: `SectionName/ElementName/`
  - Inspection images: `Inspections/SectionName-ElementName/`
- Filenames:
  - Prefer `fileName` from metadata; fallback to path basename.
  - Sanitize to safe ASCII; limit to reasonable length; dedupe by prefixing an index when collisions occur.

## Security & Auth

- Server route must filter strictly by `tenantId` and `imagePath` prefix for `surveyId`.
- Do not allow arbitrary path inputs from client; only export resolved set for the current survey/tenant.

## Performance & UX Considerations

- Client ZIP:
  - Limit concurrency (3–5 concurrent fetches).
  - Show progress bar or numeric indicator; cancel option if possible.
- Server ZIP:
  - Use streaming; limit fetch concurrency (5–10); backoff on transient failures.
  - Consider chunked responses for better perceived progress in long exports.
- Both:
  - Skip missing/failed files rather than fail the entire export; summarize skipped count if needed.

## Alternatives

- Export manifest only (JSON or CSV of image paths and names) for external tooling to fetch and zip.
- Per-section export buttons instead of whole-survey, to keep bundles small.
- Background export job (server-side) that emails a download link when ready (more infra, best for very large data sets).

## Implementation Checklist

Phase 1 — Names on Photos Page
- [ ] Build `parseImagePath(imagePath, surveyId)` → kind + ids.
- [ ] In `page.tsx`, load `elements`, `sections`, and `survey` data.
- [ ] Implement `resolveDisplayName` using stores and `findComponent` to map IDs → names.
- [ ] Replace heuristic section naming with the resolved names.
- [ ] Verify counts and grouping remain correct with Show Archived toggle.

Phase 2 — Export ZIP
- [ ] Add Export button with “Include archived” option.
- [ ] MVP: integrate `jszip` and client-side download with progress.
- [ ] Scalable: add API route, stream ZIP with `archiver`, mirror folder structure.
- [ ] Wire button to route; handle auth; show progress/disabled state.
- [ ] Test with small and large surveys.

