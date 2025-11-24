---
title: "Print-Aware Block Editor Enhancements"
status: partial
category: editor
created: 2025-10-01
updated: 2025-11-24
tags: [tiptap, print, paged-js, page-layout]
related: [./survey-document-editor-plan.md, ./inline-header-footer-plan.md, ./paged-preview-improvements.md]
priority: medium
---

# Print-Aware Block Editor Enhancements

## 1. Establish Page Layout State & Controls
- ✅ Introduced `PageLayoutContext` (`app/home/components/Input/PageLayoutContext.tsx`) holding `{ pageSize, orientation, margins, zoom, showBreaks }`, defaulting to A4 landscape with 1" margins.
- ✅ Wrapped `NewEditor` (`app/home/components/Input/BlockEditor.tsx:52`) with the provider so editor/toolbar/preview share layout state.
- ✅ Extended `BlockMenuBar` (`app/home/components/Input/BlockMenuBar.tsx`) with a Page Layout popover (size/orientation dropdowns, per-side margin inputs, zoom presets, show-break toggle) that emits the current `PageLayoutSnapshot` to `onPrint`.

## 2. Responsive Editor Canvas With Margin Guides
- ✅ Replaced the fixed wrapper at `app/home/components/Input/BlockEditor.tsx:167` with an `EditorSurface` that converts layout dimensions to pixels (96 dpi baseline), applies zoom, and lets the grey apron flex.
- ✅ Rendered dashed margin guides via absolutely positioned overlays (`print:hidden`) and removed default `.tiptap` padding (`app/globals.css`) so inline padding derives from layout margins.
- Expose a "Show page breaks" toggle tied to context. *(UI toggle exists; overlay rendering still pending implementation once pagination hook lands.)*

## 3. Inline Header/Footer Editing
- **State plumbing**
  - Extend `PageLayoutContext` to surface `{ header, footer }` HTML along with setter helpers so the body editor + print preview stay in sync.
  - Default the values from document props; persist updates through the existing autosave pipeline (`BlockEditor.tsx`) until the document model evolves in step 6.
- **HeaderFooterEditor shell**
  - Create `HeaderFooterEditor` (`app/home/components/Input/HeaderFooterEditor.tsx`) that renders two TipTap instances (Header + Footer) sharing a small toolbar preset (text styles, alignment, lists, handlebars, image upload).
  - Wrap each editor in a titled card with optional collapse affordance so the main body editor remains the visual focal point.
- **TipTap configuration**
  - Reuse the base extensions from the body editor but drop drag/drop blocks; mount the shared `MenuBubble`/`FloatingMenu` variants so features like link editing behave consistently.
  - Wire image insertion to `insertImageFromFile` (`app/home/editor/utils/imageUpload.ts`) and ensure uploads get the same attribute schema (`data-filename`, etc.).
- **Integration in BlockEditor**
  - Import `HeaderFooterEditor` inside `BlockEditor.tsx`, positioning Header above the body editor and Footer below, each bound to the context setters.
  - Expose a lightweight summary (e.g., first line preview) inside the layout popover so users can confirm header/footer content without scrolling.
- **Accessibility & UX polish**
  - Keep focus management consistent: tabbing out of header drops focus into the body editor, and screen readers announce the regions via `aria-labelledby`.
  - Mirror the body's background + padding derived from layout margins so the header/footer content previews with accurate width constraints.

## 4. Page Break Feedback Loop
- Implement `usePaginationPreview` hook (`app/home/editor/hooks/usePaginationPreview.ts`) that debounces content/layout, runs paged.js in a hidden iframe, and returns page break offsets.
- Overlay translucent break markers in the editor canvas positioned from hook results, gated by `showBreaks`.

## 5. Sync With Print Preview
- ✅ Updated `app/home/editor/components/PrintPreviewer.tsx` to accept the `PageLayoutSnapshot`, inject a data-URL stylesheet that sets `@page` size/margins, and rerun when layout changes.
- Merge header/footer HTML into the payload passed to paged.js, using region templates and the same CSS variables for size/margins.
- Ensure paged.js receives consistent layout data for parity with the editor view. *(Body parity achieved; header/footer variables pending once editors exist.)*

## 6. Data Flow & Persistence
- Extend the document model (call site of `NewEditor`) to store `{ body, header, footer, layout }`.
- Update autosave in `BlockEditor.tsx:83` to serialize header/footer/layout alongside body content.
- Adjust print/export handlers to emit the combined payload to backend services.

## 7. Testing & Validation
- Add interaction tests under `app/home/components/Input/tests/BlockEditor.test.tsx` covering layout state changes, header/footer binding, and break marker rendering.
- Add integration test under `app/home/editor/components/tests/PrintPreviewer.test.tsx` verifying merged payload and layout variables reach the paged.js mock.

