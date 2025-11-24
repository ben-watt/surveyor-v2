---
title: "Paged Preview Improvements"
status: implemented
category: editor
created: 2025-10-01
updated: 2025-11-24
tags: [paged-js, print, preview]
related: [./survey-document-editor-plan.md, ./inline-header-footer-plan.md]
---

# Survey Document Editor – Paged.js Audit

## Findings
- Preview regenerations create a fresh `Previewer` instance each time without cancelling previous renders, so stale completions can flip `isRendering` and leave outdated HTML in place (`app/home/editor/components/PrintPreviewer.tsx`).
- Images are resolved **after** Paged.js paginates; page layout is calculated against placeholder `<img>` elements, so once S3 URLs load the pagination can drift from what users expect.
- Failed image requests hang the “Generating preview…” overlay because the loader never resolves when an `<img>` triggers `onerror`.
- The “Print” button resets its loading state immediately after calling `window.print()`, allowing repeat clicks while the browser dialog is still open.
- Print stylesheets (`/pagedstyles.css`, `/interface.css`) are fetched on every preview without caching, adding unnecessary latency on continuous edits.
- Paged.js is bundled eagerly with the editor; users pay the cost even if they never open preview mode.

## Improvement Concepts
1. **Preview lifecycle guard**
   - Reuse a single `Previewer` instance (or hold a generation token) and ignore late results.
   - Tie `isRendering` to that token so only the latest render can clear the spinner.
2. **Pre-resolve images**
   - Transform HTML before calling `preview()` to inject S3 URLs and wait for load/error events.
   - Provide fallbacks (e.g. placeholder image, toast) when an asset fails.
3. **Robust print trigger**
   - Use `beforeprint/afterprint` (or a `setTimeout`) to keep the Print button disabled until the dialog closes.
4. **Stylesheet caching**
   - Preload paged CSS once (link preload or fetch cache) and reuse the response across preview runs.
5. **On-demand Paged.js**
   - Dynamically import `pagedjs` when entering preview mode to shrink the main editor bundle.

## Implementation Outline

### Guarded Preview Lifecycle
- Store the `Previewer` instance in `useRef` so we reuse the same renderer; instantiate lazily when preview mode mounts.
- Maintain a `generationToken` (`useRef(0)`) and increment it before each render; capture the token locally and exit early if it no longer matches when async work resolves.
- Wrap `preview()` in `try/finally` and only mutate the container or flip `isRendering` when the token matches, preventing stale renders from racing.
- On cleanup, bump the token and clear the container so in-flight renders become no-ops.
- **Status:** ✅ Implemented in `app/home/editor/components/PrintPreviewer.tsx`.

### Pre-resolve Image Sources
- Parse the HTML string into a detached DOM (`new DOMParser().parseFromString(content, 'text/html')`).
- Resolve each `img[data-s3-path]` in parallel, set the resulting `src`, and attach `load`/`error` listeners that resolve either way.
- On errors, inject a placeholder element and emit a toast/console warning so users know a photo is missing while the spinner still clears.
- Serialize the updated DOM back to a string and feed that HTML to Paged.js, ensuring pagination reflects the actual image dimensions.
- **Status:** ✅ Implemented in `app/home/editor/components/PrintPreviewer.tsx`.

### Error Handling & User Feedback
- Surface toast notifications when preview generation fails or images cannot be loaded, and prevent duplicate alerts across rapid edits.
- Ensure rendering state clears even on failure so users can retry.
- **Status:** ✅ Implemented in `app/home/editor/components/PrintPreviewer.tsx`.

### Reliable Print Trigger
- Register `beforeprint`/`afterprint` listeners once to toggle `isDownloading`; remove them in the cleanup function.
- Fall back to a microtask (`setTimeout`) if the browser lacks the events so the state unlock happens after `window.print()` returns.
- Disable the button when either `isRendering` or `isDownloading` is true to prevent double-triggering.

### Stylesheet Prefetch & Reuse
- Kick off fetches for `/pagedstyles.css` and `/interface.css` when preview mode loads; cache the promises in refs.
- Convert the fetched text into Blob URLs and pass those to `preview()` so later renders reuse the cached styles without hitting the network.
- Optionally add `<link rel="preload">` tags on the editor page template to prime the browser cache.

### Lazy-load Paged.js
- Replace the static import with `const { Previewer } = await import('pagedjs');` inside the preview effect.
- Hold the module in a ref and gate rendering on a `isPagedReady` flag; show the spinner while loading the library.
- Validate TypeScript definitions via `import('pagedjs').Previewer` to preserve type safety.

## Next Steps
1. Introduce cached stylesheet handling plus dynamic `pagedjs` import; measure bundle size and preview latency before/after.
2. Update developer documentation and add regression tests (unit + E2E) covering print button disablement and image error fallbacks.
