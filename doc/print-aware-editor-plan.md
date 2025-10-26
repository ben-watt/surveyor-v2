# Print-Aware Block Editor Enhancements

## 1. Establish Page Layout State & Controls
- ✅ Introduced `PageLayoutContext` (`app/home/components/Input/PageLayoutContext.tsx`) holding `{ pageSize, orientation, margins, zoom, showBreaks }`, defaulting to A4 landscape with 1" margins.
- ✅ Wrapped `NewEditor` (`app/home/components/Input/BlockEditor.tsx:52`) with the provider so editor/toolbar/preview share layout state.
- ✅ Extended `BlockMenuBar` (`app/home/components/Input/BlockMenuBar.tsx`) with a Page Layout popover (size/orientation dropdowns, per-side margin inputs, zoom presets, show-break toggle) that emits the current `PageLayoutSnapshot` to `onPrint`.

## 2. Responsive Editor Canvas With Margin Guides
- ✅ Replaced the fixed wrapper at `app/home/components/Input/BlockEditor.tsx:167` with an `EditorSurface` that converts layout dimensions to pixels (96 dpi baseline), applies zoom, and lets the grey apron flex.
- ✅ Rendered dashed margin guides via absolutely positioned overlays (`print:hidden`) and removed default `.tiptap` padding (`app/globals.css`) so inline padding derives from layout margins.
- Expose a “Show page breaks” toggle tied to context. *(UI toggle exists; overlay rendering still pending implementation once pagination hook lands.)*

## 3. Inline Header/Footer Editing
- Add `HeaderFooterEditor` (`app/home/components/Input/HeaderFooterEditor.tsx`) with two lightweight TipTap instances sharing toolbar presets (text, images, handlebars).
- Embed component above/below the body editor in `BlockEditor.tsx`, persisting values into context.
- Reuse `insertImageFromFile` from `app/home/editor/utils/imageUpload.ts` for uploads.

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
