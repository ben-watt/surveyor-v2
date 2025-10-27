# Inline Header & Footer Editing Plan

## Overview & Goals
- Enable users to edit document headers and footers inline within the print-aware editor while keeping live parity with paged.js print output.
- Preserve support for running header/footer elements used by paged.js margin boxes (`public/pagedstyles.css`) and maintain existing template defaults for surveys.
- Provide a UX that keeps the body editor as the primary focus but surfaces header/footer access near the canvas for quick adjustments.

## Current Requirements & Constraints
- **Paged.js running elements**: Print CSS expects header content with `position: running(headerRunning)` and footer content with `position: running(footerRunning)`; address block uses `running(addressRunning)`. New editors must output the same structure so `@page` margin boxes continue to render.
- **Template defaults**: Current templates generate header/footer HTML via React components (`app/home/editor/components/HeaderFooter.tsx`) combining static imagery and dynamic survey metadata. Inline editors need to seed from this markup so existing documents stay intact.
- **Layout context**: Page layout (size, margins, zoom) lives in `PageLayoutContext`; header/footer strings must flow through the same context to keep editor, autosave, and print preview synchronized.
- **Print preview**: `PrintPreviewer.tsx` injects layout-specific CSS before running paged.js. Any new header/footer HTML must be included in the content payload it receives (section 5 of the broader plan).
- **Handlebar helpers**: Header content must continue supporting handlebars for dynamic fields like the address block rendered in the top-right margin box.
- **Cover page**: Title/cover markup shares the same data flow; keeping it compatible now reduces work if/when we introduce inline cover editing.

## Paged.js Margin-Box Strategy
- Margin boxes are filled with the `content: element(name)` construct inside `@page` rules (see paged.js docs). Elements referenced must expose both `position: running(name)` and an `id` attribute to satisfy the polyfill.
- We can drop legacy class names and adopt explicit `data-running-role="header|footer|address"` for clarity while still outputting required `position: running(pageHeader)` etc.
- Structure we want to preserve/emulate:
  ```html
  <div id="page-header" data-running-role="header" style="position: running(pageHeader);">
    <!-- header markup -->
  </div>
  ```
  paired with CSS:
  ```css
  @page {
    @top-center { content: element(pageHeader); }
    @bottom-right { content: element(pageFooter); }
    @top-right { content: element(pageAddress); }
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

3. **HeaderFooterEditor Component**
   - Create `app/home/components/Input/HeaderFooterEditor.tsx` with two TipTap instances (Header, Footer) sharing toolbar configuration.
   - Provide compact cards with titles, optional collapse, and first-line preview chips to keep the layout tidy when collapsed.
   - Respect page layout margins by constraining editor width to `--editor-page-width` minus margins so visual preview matches print width.

4. **TipTap Configuration**
   - Reuse body editor's inline/text extensions (bold, italic, lists, align, link, handlebars) but omit block-level drag/drop behaviors.
   - Configure `contentContainer` to wrap output in `<div id="page-header" data-running-role="header">` / `<div id="page-footer" data-running-role="footer">` while applying `position: running(pageHeader)`/`pageFooter` via class or inline style so paged.js picks them up.
   - Ensure address blocks or other running regions (`pageAddress`) get their own `data-running-role` wrappers if we keep that content editable.
   - Wire image uploads to `insertImageFromFile` to maintain storage + attribute conventions (`data-s3-path`, `data-filename`).
   - Reuse the body editor's handlebar helper UI so tokens insert and round-trip correctly in header/footer markup.
   - Implement a TipTap plugin to normalize DOM on every update: enforce required `id`, `data-running-role`, and `style` attributes, and strip conflicting wrappers inserted by users (e.g., avoid nested `<p>` around the running element root).

5. **Integration in BlockEditor**
   - Render `HeaderFooterEditor` above and below the main TipTap canvas, binding change handlers to context setters.
   - Surface compact indicators in `BlockMenuBar`’s layout popover (e.g., first-line preview, “Header hidden” notice) for quick validation.
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

## Open Questions / Follow-Ups
- Do we need multiple header/footer variants per page (odd/even)? **Not required** for the current scope; revisit if pagination rules expand.
- Confirm whether business users need handlebar helpers in header/footer (initial assumption: yes; mirrors body editor). **Confirmed** - handlebars are required for address and similar metadata in the header.
- Decide whether to support hiding header/footer entirely per document; still gathering use cases before introducing toggles.
- Determine if/when the cover page should become inline-editable; the pipeline now keeps that door open without committing scope yet.

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





