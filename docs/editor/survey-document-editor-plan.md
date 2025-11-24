---
title: "Survey Document Editor"
status: implemented
category: editor
created: 2024-10-01
updated: 2025-11-24
tags: [tiptap, wysiwyg, print, document-versioning]
related: [./inline-header-footer-plan.md, ./paged-preview-improvements.md]
---

# Survey Document Editor — Feature Plan

This document describes the feature that turns a saved survey into an editable, WYSIWYG document and lets surveyors export the output through the browser’s print dialog (PDF or physical printer). The editor currently powers the Building Survey report experience.

## Goals

- Load an existing survey into a rich-text editor that mirrors the printable report layout.
- Allow users to tweak the generated content while retaining template-driven headers, footers, and title pages.
- Persist document edits with version history so teams can revisit prior revisions.
- Provide an in-app print preview that resolves S3-hosted assets before export.

## Non-Goals

- Offline editing or queueing saves while the device lacks connectivity.
- Building a standalone PDF exporter (we rely on `window.print` + browser PDF).
- Managing cross-survey templates (only `building-survey` is supported today).

## Entry Points

- Route: `app/home/editor/[id]/page.tsx` renders `<EditorClient />` for a given survey/document id. The page is meant to be reached from survey actions (e.g. “Generate document”) and can also accept `?templateId=` to force a template when bootstrapping a new doc.

## Implementation Overview

### Editor bootstrap

- `EditorClient` (`app/home/editor/[id]/EditorClient.tsx`) reads the document id from `useParams`, optional `templateId` from query string, and wires together editor state, saving, preview toggles, and version history drawers.
- `useTemplateId` (`app/home/editor/hooks/useTemplateId.ts`) lazily resolves the template id from the persisted document if it was not provided up front.
- `useEditorState` (`app/home/editor/hooks/useEditorState.tsx`) orchestrates all loading paths:
  - Existing document: load metadata and latest HTML via `documentStore.get`/`getContent`.
  - Existing document with template: hydrate header, footer, and title page blocks by re-running the template pipeline, then wrap live edits with those blocks.
  - New document with template: fetch survey content via `surveyStore.get`, map it into HTML, and seed the editor/preview.
  - New document without template: start blank.
- Template ids currently resolve to `useDocumentTemplate`, which renders a Building Survey layout by combining React components (`HeaderFooter.tsx`, `BuildingSurveyReportTipTap`) with serialized survey content.

### Template rendering & survey mapping

- `mapFormDataToHtml` (`app/home/editor/utils/formData.tsx`) converts `BuildingSurveyFormData` into React markup, hydrates section hierarchies, filters archived images, and enriches images with metadata by querying `imageMetadataStore`.
- Header/footer/title markup comes from `Header`, `Footer`, and `TitlePage` components (`app/home/editor/components/HeaderFooter.tsx`). They format addresses, report references, and cover imagery.
- Because the generated HTML must embed production asset URLs, image nodes include `data-s3-path` attributes. The previewer later dereferences these paths before printing.

### Editor surface

- The WYSIWYG experience is powered by `<NewEditor>` (`app/home/components/Input/BlockEditor.tsx`), a Tiptap wrapper that exposes callbacks for `onCreate`, `onUpdate`, `onPrint`, `onSave`, and version history toggles.
- `EditorClient` keeps a `ref` to the editor, forwards the template-aware `addTitleHeaderFooter` callback so that every update refreshes the print-ready HTML, and exposes manual save + print actions through the editor toolbar.

### Document persistence & metadata

- `useDocumentSave` (`app/home/editor/hooks/useDocumentSave.ts`) wraps CRUD operations in loading and toast feedback. On the first save it calls `documentStore.create`, subsequently `documentStore.updateContent`.
- Metadata written alongside the content includes `fileName`, `fileType`, `size`, `lastModified`, and `templateId`. These feed Amplify Data’s `DocumentRecord` table and S3 storage location (managed by `documentStore` in `app/home/clients/DocumentStore.ts`).
- The store enforces online-only writes, versioned content (`v0`, `v1`, …), and caps history depth to prevent unbounded storage.

### Preview & export flow

- Clicking “Print” switches the UI into preview mode. `<PrintPreviewer>` (`app/home/editor/components/PrintPreviewer.tsx`) instantiates a Paged.js `Previewer`, injects the combined title/header/body/footer HTML, and loads `/pagedstyles.css` + `/interface.css` for print styles.
- `resolveAllS3ImagesInContainer` hydrates `<img data-s3-path>` nodes by calling `getImageHref` (`app/home/editor/utils/image.ts` → Amplify Storage `getUrl`), waits for them to finish loading, and only then clears the “Generating preview…” overlay.
- Export uses `window.print()`, allowing users to save a PDF through native browser tooling while preserving pagination and footers supplied by the template.

### Version history & comparisons

- The version history sidebar lives in `app/home/components/VersionHistorySidebar.tsx` and is triggered from the editor toolbar.
- `useVersionHistory` (`app/home/editor/hooks/useVersionHistory.ts`) fetches prior versions via `documentStore.listVersions`. Selecting a version loads its HTML with `documentStore.getVersionContent`.
- `<VersionPreview>` (`app/home/editor/components/VersionPreview.tsx`) renders historical content in read-only form, while “Return to latest” restores the live editor.

### Asset loading & auxiliary utilities

- Image resolution helpers (`app/home/editor/utils/image.ts`) wrap Amplify Storage signed URLs.
- Additional helpers (`app/home/editor/utils/dateFormatters.ts`, `BuildingSurveyReportSchema.ts`) keep formatting consistent between the editor and other survey surfaces.
- There is an older `useDocumentStorage` hook (`app/home/editor/hooks/useDocumentStorage.ts`) that uploads raw HTML to S3 for ad-hoc documents; the current flow relies on `documentStore` instead.

## Data & Storage Contracts

- Amplify Data `DocumentRecord` models store metadata rows (`sk = '#LATEST'`) and version rows (`sk = 'v{n}'`), all scoped by tenant id in the partition key.
- Document content resides in S3 under `documents/<tenantId>/<documentId>`; the store sets `contentType` based on `metadata.fileType` (HTML or markdown).
- Survey inputs originate from `surveyStore.get(id)` (Amplify Data) and are assumed to contain complete Building Survey structures; missing data produces best-effort fallbacks (e.g., `Unknown` labels in headers).

## UX States & Edge Cases

- **Loading:** `EditorClient` shows a centered loading state until both template resolution and document content complete.
- **Offline:** Saves fail fast with toast feedback because `documentStore` guards on `navigator.onLine`.
- **Template mismatch:** Providing an unsupported `templateId` throws; we currently prevent this by only linking the route with `building-survey`.
- **Image failures:** `resolveAllS3ImagesInContainer` logs (and leaves empty placeholders) if individual images cannot be fetched before print.
- **Version preview:** While a historical version is open the main editor is hidden to prevent accidental edits; returning clears the read-only state and rehydrates the latest content.

## Testing & Verification

- Manual checks cover: initial render from survey data, editing and saving, refreshing to confirm persistence, toggling print preview, printing to PDF, and comparing historical versions.
- No automated tests target the editor yet. When adding tests, colocate them in `app/home/editor/tests/` per engineering conventions, and consider using Playwright for end-to-end verification of the print preview.

## Follow-Ups & Open Questions

- Broaden template support (multiple report types) and validate how `useEditorState` should branch per template.
- Investigate offline/optimistic saving so surveyors can continue editing with poor connectivity.
- Add regression tests for `mapFormDataToHtml` to guard against layout changes that break the print view.
- Explore server-side PDF generation if the browser print path proves insufficient for customers.

