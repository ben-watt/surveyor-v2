---
title: "Progressive Image Loading"
status: planned
category: images-media
created: 2025-10-01
updated: 2025-11-24
tags: [performance, blur-up, thumbnails]
related: [./image-upload-architecture.md]
priority: low
---

# Progressive Image Loading — Plan & TODOs

## Goals

- Eliminate layout jumps when images load (stable boxes, no CLS).
- Improve perceived performance with better placeholders (blur-up using thumbnails).
- Keep API changes minimal; preserve existing usage in Thumbnail and galleries.

## Approach

- Stable layout

  - Make ProgressiveImage’s wrapper control layout (aspect ratio, rounding, overflow).
  - Force the img to absolute-fill the wrapper (`object-cover`) to avoid intrinsic-size shifts.
  - Keep skeletons inside the same wrapper footprint.

- Blur-up placeholder

  - Use existing `thumbnailDataUrl` as a blurred, slightly scaled placeholder until the full image is decoded.
  - Fade and un-blur on swap.

- Modern image loading
  - Add `loading="lazy"`, `decoding="async"`, and `sizes`.
  - If dimensions exist in metadata, apply `width`/`height` to improve stability.

## Future (optional)

- Dominant color background derived from thumbnail and memoized per image.
- IntersectionObserver to auto-load full images near viewport.
- `content-visibility`/`contain-intrinsic-size` hints for large feeds.

## TODOs

1. Implement blur-up + stable layout in `ProgressiveImage` (first pass)
2. Adjust `Thumbnail` to pass only aspect/box classes to the wrapper
3. Type check + spot check existing tests
4. (Optional) Add avg-color placeholder util and wire it
5. (Optional) Add IO-based eager loading for near-viewport images
