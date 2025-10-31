# Inline Header & Footer Editing Plan

## Overview & Goals
- Enable users to edit document headers and footers inline within the print-aware editor while keeping live parity with paged.js print output.
- Preserve support for running header/footer elements used by paged.js margin boxes (`public/pagedstyles.css`) and maintain existing template defaults for surveys.
- Provide a UX that keeps the body editor as the primary focus but surfaces header/footer access near the canvas for quick adjustments.

## Current Requirements & Constraints
- **Paged.js running elements**: Print CSS expects running elements with zone-specific `position: running(pageMarginTopCenter)`, `position: running(pageMarginTopRight)`, `position: running(pageMarginBottomCenter)`, etc. Elements must have both the running style and a matching `id` attribute. New editors must output the same structure so `@page` margin boxes continue to render.
- **Template defaults**: Current templates generate header/footer HTML via React components (`app/home/editor/components/HeaderFooter.tsx`) combining static imagery and dynamic survey metadata. Inline editors need to seed from this markup so existing documents stay intact.
- **Layout context**: Page layout (size, margins, zoom) lives in `PageLayoutContext`; header/footer strings must flow through the same context to keep editor, autosave, and print preview synchronized.
- **Print preview**: `PrintPreviewer.tsx` injects layout-specific CSS before running paged.js. Any new header/footer HTML must be included in the content payload it receives (section 5 of the broader plan).
- **Handlebar helpers**: Header content must continue supporting handlebars for dynamic fields like the address block rendered in the top-right margin box.
- **Cover page**: Title/cover markup shares the same data flow; keeping it compatible now reduces work if/when we introduce inline cover editing.

## Current Implementation Snapshot
- **Templating defaults**: `app/home/editor/components/HeaderFooter.tsx` renders a single header table with `data-running-role="header"` (legacy, gets normalized) plus an embedded address block (`data-running-role="address"`, legacy) and a standalone footer (`data-running-role="footer"`, legacy). These are emitted as plain strings and normalized by `HeaderFooterEditor.tsx` to use zone-specific attributes (`top-center`, `top-right`, `bottom-center`).
- **Editor surface**: `app/home/components/Input/HeaderFooterEditor.tsx` hosts one TipTap instance per margin zone. It normalises markup into zone-specific running elements with `data-running-role="top-center|top-right|bottom-center"` etc., ensures proper `id` attributes (`pageMarginTopCenter`, `pageMarginTopRight`, `pageMarginBottomCenter`), and applies `position: running(...)` styles. Maintains backwards compatibility by querying for legacy attributes during normalization.
- **State & autosave**: `app/home/components/Input/PageLayoutContext.tsx` stores `headerHtml`, `footerHtml`, and `runningHtml` (Record<MarginZone, string>). `BlockEditor.tsx` exposes popover editors wired to `setHeaderHtml` / `setFooterHtml` / `setRunningHtml` and passes those strings through the print payload.
- **Print glue**: `public/pagedstyles.css` maps `@top-left-corner` → `element(headerRunning)`, `@top-right` → `element(addressRunning)`, and `@bottom-right` → `element(footerRunning)` while sizing the header margin to 920 px. The address block lives inside the header markup but is referenced independently via `data-running-role`.
- **Preview pipeline**: `app/home/editor/components/PrintPreviewer.tsx` expects a single concatenated HTML blob containing all running elements (keyed by margin zone) at the top level before body content; it loads `/pagedstyles.css` to resolve the margin boxes. Running elements are collected via `collectZoneHtml()` in `PREVIEW_ZONE_ORDER`.

## Paged.js Margin-Box Strategy
- Margin boxes are filled with the `content: element(name)` construct inside `@page` rules (see paged.js docs). Elements referenced must expose both `position: running(name)` and an `id` attribute to satisfy the polyfill.
- We can drop legacy class names and adopt explicit `data-running-role="top-left|top-center|..."` for clarity while still outputting required `position: running(pageMarginTopLeft)` etc.
- **New assumption**: every paged.js margin box (`@top-left-corner`, `@top-left`, …, `@bottom-right-corner`, plus the vertical side boxes) maps to its own editable running element so users can control the full 16-zone grid independently. Overflow across zones is acceptable; we will rely on previews to communicate the visual result instead of hard clipping content in the editor.
- Structure we want to preserve/emulate:
  ```html
  <div id="pageMarginTopCenter" data-running-role="top-center" style="position: running(pageMarginTopCenter);">
    <!-- header markup -->
  </div>
  ```
  paired with CSS:
  ```css
  @page {
    @top-center { content: element(pageMarginTopCenter); }
    @bottom-center { content: element(pageMarginBottomCenter); }
    @top-right { content: element(pageMarginTopRight); }
  }
  ```
- For multi-zone headers, we will emit siblings such as:
  ```html
  <div id="pageMarginTopLeft" data-running-role="top-left" style="position: running(pageMarginTopLeft);">
    <!-- optional logo -->
  </div>
  <div id="pageMarginTopCenter" data-running-role="top-center" style="position: running(pageMarginTopCenter);">
    <!-- main headline -->
  </div>
  <div id="pageMarginTopRight" data-running-role="top-right" style="position: running(pageMarginTopRight);">
    <!-- address or other metadata -->
  </div>
  ```
- And corresponding CSS:
  ```css
  @page {
    @top-left { content: element(pageMarginTopLeft); }
    @top-center { content: element(pageMarginTopCenter); }
    @top-right { content: element(pageMarginTopRight); }
    @bottom-center { content: element(pageMarginBottomCenter); }
  }
  ```
- TipTap serialization must keep these attributes intact; we will implement a custom extension/parse HTML hook ensuring `id` + `style` (or class with CSS) persist after edits.

## Implementation Plan
1. **Context & State Plumbing**
   - Extend `PageLayoutContext` to store `{ headerHtml, footerHtml }` plus `setHeaderHtml`, `setFooterHtml`.
   - Initialize context from document/template data in `BlockEditor.tsx`, mirroring existing autosave triggers so changes persist.
   - Expose lightweight selectors for consuming components (`usePageLayout` or dedicated hooks) to avoid prop drilling.

2. **Document Model & Defaults**
   - When loading a template-backed document, convert the current React-rendered header/footer (`HeaderFooter.tsx`) into HTML and prime the context.
   - Define a helper to sanitize legacy markup (ensure running-element classes/attributes survive TipTap serialization).
   - Update autosave + payload serializers to persist `{ body, header, footer }`; this primes work for plan section 6.
   - Run the title/cover markup through the same serialization helpers so we can later slot an editable cover experience into the workflow.

3. **MarginZoneEditors Component**
   - Create `app/home/components/Input/MarginZoneEditors.tsx` exposing dedicated TipTap instances for each supported margin zone (`top-left`, `top-center`, `top-right`, `bottom-center`, etc.) plus the footer body area.
   - Provide compact cards with titles, optional collapse, and first-line preview chips to keep the layout tidy when collapsed.
   - Respect page layout margins by constraining editor width to `--editor-page-width` minus margins so visual preview matches print width, and surface soft warnings when content height exceeds the nominal margin to help users understand likely overflow.

4. **TipTap Configuration**
   - Reuse body editor's inline/text extensions (bold, italic, lists, align, link, handlebars) but omit block-level drag/drop behaviors.
   - Configure `contentContainer` to wrap output in `<div id="pageMarginTopLeft" data-running-role="top-left">` / `<div id="pageMarginTopCenter" ...>` / `<div id="pageMarginBottomCenter" ...>` while applying `position: running(pageMarginTopLeft|pageMarginTopCenter|pageMarginBottomCenter)` via class or inline style so paged.js picks them up.
   - Ensure address blocks or other running regions (`pageMarginTopRight`, etc.) get their own `data-running-role` wrappers if we keep that content editable.
   - Wire image uploads to `insertImageFromFile` to maintain storage + attribute conventions (`data-s3-path`, `data-filename`).
   - Reuse the body editor's handlebar helper UI so tokens insert and round-trip correctly in header/footer markup.
   - Implement a TipTap plugin to normalize DOM on every update: enforce required `id`, `data-running-role`, and `style` attributes, and strip conflicting wrappers inserted by users (e.g., avoid nested `<p>` around the running element root).

5. **Integration in BlockEditor**
   - Render `MarginZoneEditors` above and below the main TipTap canvas, binding change handlers to context setters.
   - Surface compact indicators in `BlockMenuBar`’s layout popover (e.g., first-line preview per zone, “Top-right overflow” notice) for quick validation.
   - Update autosave throttling to include header/footer deltas so we avoid extra network chatter while typing.

6. **Print Preview & Paged.js Alignment**
   - When the body editor composes preview HTML, prepend header and append footer snippets before passing to `PrintPreviewer`, ensuring they remain top-level siblings so paged.js can extract them.
   - Confirm paged.js still locates running elements by rendering sample pages; adjust CSS if TipTap wraps elements differently (e.g., ensure `#page-header` stays the element with the running style).
   - Validate counter usage (`@bottom-center` page numbers) remains unaffected by new markup.

7. **Testing Strategy**
   - Add component tests in `app/home/components/Input/tests/HeaderFooterEditor.test.tsx` covering:
     - Rendering seeded HTML and persisting edits via context setters.
     - Enforcing running-element classes after updates.
   - Extend `BlockEditor.test.tsx` (per existing plan) to assert body/header/footer autosave integration and print payload composition.
   - Create an integration test for `PrintPreviewer` (future step) ensuring header/footer HTML appears in the paged.js container with expected selectors.
   - Key behaviours to exercise:
     - Handlebar token insertion/editing in the header (e.g., address helper) persists after serialization and appears resolved in preview.
     - Header/footer image uploads retain `data-s3-path` attributes and render within paged.js output.
     - Page layout changes update header/footer editor width constraints and reflect in preview dimensions.
     - Keyboard focus order progresses Header -> Body -> Footer to satisfy accessibility expectations.
   - Autosave throttling batches simultaneous body + header/footer edits without duplicate requests.

## Current Gaps vs Multi-Zone Goal
- **Template emission (`app/home/editor/components/HeaderFooter.tsx`)**: currently hard-codes one header table plus footer. Refactor to return an object keyed by margin zone (top-left/top-center/top-right/bottom-center) so the editor can seed each TipTap instance separately.
- **State model (`PageLayoutContext.tsx`)**: only tracks `headerHtml`/`footerHtml`. Introduce a structured state (e.g., `runningHtml: Record<MarginZone, string>`) and update setters/selectors so autosave and print payloads can read/write per-zone content.
- **Inline editor (`HeaderFooterEditor.tsx` & popovers in `BlockEditor.tsx`)**: UI expects a single header area. Replace with a `MarginZoneEditors` layout that exposes separate popovers/cards per zone and shares common toolbar configuration, while still allowing overflow.
- **CSS / preview (`public/pagedstyles.css`, `PrintPreviewer.tsx`)**: margin rules reference the 16-zone grid (`pageMarginTopLeft`, `pageMarginLeftTop`, etc.). Ensure the preview payload concatenates each zone element before body markup so paged.js can extract them.
- **Validation & DX**: add non-blocking overflow indicators in the new editors so users see when content exceeds nominal margin height, and extend the test suite (component + integration) to cover the multi-zone schema and paged.js rendering.

## Outstanding Items

### 1. Persist Margin Zone Content with Documents
**Status:** Not implemented  
**Priority:** High

**Current State:**
- Margin zone content (`runningHtml: Record<MarginZone, string>`) is stored in React state (`PageLayoutContext`) but is not persisted when documents are saved
- Only the body HTML (`editorContent`) is currently saved via `useDocumentSave` in `EditorClient.tsx`
- When documents are loaded, margin zones are regenerated from templates rather than restored from saved data

**Required Changes:**
- **Document Serialization Format**: Define a structured format for storing document data that includes:
  - `body`: string (body HTML content)
  - `runningHtml`: Record<MarginZone, string> (all margin zone content)
  - Optionally: `layout` (page layout settings) and `titlePage` (cover page HTML)
  
- **Update Save Functionality** (`app/home/editor/[id]/EditorClient.tsx`):
  - Modify `getMetadata` in `useDocumentSave` to serialize `runningHtml` alongside `editorContent`
  - Update `onSave` handler to include `runningHtml` in the save payload
  - Consider JSON format: `{ body: string, runningHtml: Record<MarginZone, string>, layout?: PageLayoutSnapshot, titlePage?: string }`
  
- **Update Load Functionality** (`app/home/editor/hooks/useEditorState.tsx`):
  - Modify document loading to deserialize saved margin zone content
  - Fall back to template-generated defaults if margin zones aren't present in saved data (backwards compatibility)
  - Ensure loaded `runningHtml` is properly normalized and applied to context

- **Document Store Considerations** (`app/home/clients/DocumentStore.ts`):
  - Currently stores content as a single string in S3
  - May need to update to store structured JSON if serialization format changes
  - We can ignore existing documents as we don't have any

**Files to Modify:**
- `app/home/editor/[id]/EditorClient.tsx` - Update save logic to include `runningHtml`
- `app/home/editor/hooks/useEditorState.tsx` - Update load logic to restore `runningHtml`
- `app/home/editor/hooks/useDocumentSave.ts` - Consider if save signature needs to change
- Potentially: `app/home/clients/DocumentStore.ts` - May need to handle structured vs string content

**Testing Requirements:**
- Verify margin zone edits persist after page refresh
- Test backwards compatibility with documents saved before this feature
- Ensure autosave includes margin zone changes
- Verify version history includes margin zone content

### 2. Inline Cover Page Editing
**Status:** Not implemented  
**Priority:** Medium

**Current State:**
- Cover page HTML is generated from React component (`app/home/editor/components/HeaderFooter.tsx` - `TitlePage`)
- Cover page uses handlebars for dynamic content (report level, address, date, reference)
- Cover page has a full-page background image (`/cwbc_cover_landscape.jpg`) that takes up the entire page
- Cover page HTML is included in preview via `titlePage` state but is not editable
- Cover page uses special `@page title` CSS rule in `pagedstyles.css` for page-specific styling (no margins)

**Challenges:**
1. **Full-Page Background Images**: The editor currently doesn't support full-page background images. The cover page uses an `<Image>` component that renders as a background spanning the entire page, with content absolutely positioned on top.
   - Need to extend TipTap or add custom extension for page-level background images
   - May require a special "cover page editor" mode that renders a full-page preview
   - Background image positioning and sizing (cover/contain) needs to be configurable

2. **Handlebar Support**: Cover page content uses handlebars extensively (e.g., `{{reportDetails.level}}`, `{{reportDetails.address}}`). Need to ensure:
   - HandlebarsHighlight and HandlebarsAutocomplete extensions work in cover page editor
   - Handlebar tokens are preserved during serialization/deserialization
   - Preview correctly resolves handlebars (similar to header/footer)

3. **Page-Specific CSS**: Cover page uses `page: title` CSS property which requires special handling in:
   - Editor preview (need to simulate `@page title` rules)
   - Print preview (paged.js needs to recognize the title page)

4. **Absolute Positioning**: Cover page content is absolutely positioned over the background image. The editor needs to support:
   - Absolute positioning of content elements
   - Visual editing of absolutely positioned elements (drag/drop, resize)
   - Maintaining layout when background image changes

**Required Changes:**
- **Cover Page Editor Component**: Create a specialized editor similar to `HeaderFooterEditor` but for cover pages
  - Full-page preview mode showing background image
  - Support for absolutely positioned content regions
  - Handlebar editing support

- **Background Image Extension**: Extend TipTap to support page-level background images
  - Custom node type for cover page background
  - Storage integration (S3 upload for custom backgrounds)
  - Support for preset backgrounds and custom uploads

- **Cover Page Normalization**: Similar to margin zones, create normalization for cover page HTML
  - Preserve background image attributes
  - Preserve absolute positioning styles
  - Ensure handlebar tokens are maintained

- **Preview Integration**: Update preview pipeline to:
  - Apply `@page title` CSS rules to cover page
  - Resolve handlebars in cover page content
  - Render background image correctly in both editor preview and print preview

**Files to Create/Modify:**
- New: `app/home/components/Input/CoverPageEditor.tsx` - Specialized editor for cover pages
- New: `app/home/components/TipTapExtensions/CoverPageBackground.ts` - TipTap extension for background images
- Modify: `app/home/components/Input/BlockEditor.tsx` - Add cover page editor UI
- Modify: `app/home/components/Input/PageLayoutContext.tsx` - Add `titlePageHtml` to context
- Modify: `app/home/editor/hooks/useEditorState.tsx` - Handle cover page serialization/loading
- Modify: `doc/inline-header-footer-plan.md` (item 1) - Include `titlePage` in document serialization format

**Alternative Approaches:**
- **Simplified Approach**: Start with just text editing on cover page, keep background image fixed/managed separately
- **Template-Based**: Keep cover page as template-only, allow minor customization (text content only)
- **Full WYSIWYG**: Complete cover page designer with background, layout, and all content editable

**Dependencies:**
- Item 1 (Persist Margin Zone Content) should be completed first to establish document serialization pattern
- Background image upload/storage infrastructure must support full-page images

## Open Questions / Follow-Ups
- Do we need multiple header/footer variants per page (odd/even)? **Not required** for the current scope; revisit if pagination rules expand.
- Confirm whether business users need handlebar helpers in header/footer (initial assumption: yes; mirrors body editor). **Confirmed** - handlebars are required for address and similar metadata in the header.
- Decide whether to support hiding header/footer entirely per document; still gathering use cases before introducing toggles.
- Cover page inline editing: **Documented as Outstanding Item #2** - See challenges and approaches above.

### 3. HTML Sanitization for Security
**Status:** Not implemented  
**Priority:** Medium (before production)

**Current State:**
- TipTap provides sanitization during editing (removes `<script>` tags and dangerous elements)
- HTML is stored as-is in JSON and rendered via `dangerouslySetInnerHTML` in `VersionPreview.tsx`
- `PrintPreviewer.tsx` injects HTML via `innerHTML` without sanitization
- The `sanitizeHtml()` function in `HeaderFooterEditor.tsx` only trims whitespace, providing no security protection
- When content is loaded from storage and rendered outside TipTap, it bypasses TipTap's sanitization

**Security Risk:**
If stored JSON is modified (via API, direct S3/DynamoDB access, or other vulnerability), malicious HTML/JavaScript could be injected and executed when:
- Version history is viewed (uses `dangerouslySetInnerHTML`)
- Print preview is generated (uses `innerHTML` and paged.js rendering)
- Content is rendered outside the TipTap editor context

**Required Changes:**
- **Add DOMPurify Library**: Install and configure DOMPurify for HTML sanitization
- **Sanitize on Load**: Add sanitization when deserializing document content from JSON
- **Sanitize on Render**: Sanitize HTML before rendering in:
  - `VersionPreview.tsx` (before `dangerouslySetInnerHTML`)
  - `PrintPreviewer.tsx` (before setting `innerHTML` and passing to paged.js)
- **Configure Sanitization Rules**: Define allowed tags/attributes to match TipTap's schema (preserve formatting, images, handlebars, etc.)
- **Consider CSP Headers**: Review Content Security Policy headers to provide additional defense-in-depth

**Files to Modify:**
- `app/home/editor/components/VersionPreview.tsx` - Sanitize content before rendering
- `app/home/editor/components/PrintPreviewer.tsx` - Sanitize content before passing to paged.js
- `app/home/editor/utils/documentSerialization.ts` - Add sanitization during deserialization
- `package.json` - Add DOMPurify dependency

**Testing Requirements:**
- Verify malicious script tags are stripped from stored content
- Ensure legitimate formatting (bold, italic, images, handlebars) is preserved after sanitization
- Test that sanitization doesn't break print preview rendering
- Verify version history displays correctly with sanitized content

## Success Criteria
- Users can edit header/footer content inline without leaving the main editor view.
- Preview + printed output via paged.js show updated header/footer exactly once per page with running-element margin boxes.
- Autosave and document export include the new header/footer HTML alongside body content.
- Tests cover core editor interactions and print payload integration.

## Alternatives to Paged.js
- **Vivliostyle**: Another browser-based CSS paged media engine with broader CSS support, but larger bundle and weaker community support for embedding inside React apps. Switching would require retooling our preview pipeline.
- **Prince / Antenna House**: Commercial engines with excellent CSS coverage and PDF fidelity. They run server-side or via CLI; migrating would introduce licensing costs and remove in-browser preview capability without additional infrastructure.
- **WeasyPrint**: Python-based; not viable for our Next.js client-side preview.
- Given our need for in-app live previews, paged.js remains the pragmatic choice despite limitations. We can reconsider if requirements shift toward high-fidelity server-side PDF rendering or advanced footnote/page-numbering features beyond paged.js’s scope.
- If we pivot to server-side PDF generation, prefer Prince/Antenna House (or Vivliostyle server mode) because paged.js depends on a headful browser environment, lacks consistent Node/headless rendering, and offers limited hooks for deterministic asset loading, resulting in race conditions and harder-to-scale infrastructure.





