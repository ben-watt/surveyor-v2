# Feature Status Dashboard

**Last Updated**: November 24, 2025
**Auto-generated** - Run `npm run docs:index` to refresh

This document tracks the implementation status of all features documented in the `/docs` folder.

---

## Status Legend

- ✅ **Implemented** - Feature is fully implemented and production-ready
- 🚧 **Partial** - Feature is partially implemented or in progress
- 📋 **Planned** - Feature is documented but not yet implemented
- 🗄️ **Archived** - Feature plan is obsolete or superseded

---

## Quick Stats

- **Total Features**: 38
- **Implemented**: 17 (45%)
- **Partial**: 5 (13%)
- **Planned**: 14 (37%)
- **Archived**: 2 (5%)

---

## Feature Status by Category

### 📝 Editor Features

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| Image Reordering (Drag-and-Drop) | ✅ Implemented | [image-reordering-plan.md](./editor/image-reordering-plan.md) | - | dnd-kit, images, drag-drop |
| Inline Conditions Editor | ✅ Implemented | [inline-conditions-editor.md](./editor/inline-conditions-editor.md) | - | tiptap, conditions, inline-select |
| Line Spacing Controls | ✅ Implemented | [line-spacing-implementation-summary.md](./editor/line-spacing-implementation-summary.md) | - | tiptap, formatting, typography |
| Paged Preview Improvements | ✅ Implemented | [paged-preview-improvements.md](./editor/paged-preview-improvements.md) | - | paged-js, print, preview |
| Survey Document Editor | ✅ Implemented | [survey-document-editor-plan.md](./editor/survey-document-editor-plan.md) | - | tiptap, wysiwyg, print, document-versioning |
| Inline Header & Footer Editing | 🚧 Partial | [inline-header-footer-plan.md](./editor/inline-header-footer-plan.md) | high | tiptap, print, headers, footers, paged-js |
| Print-Aware Block Editor Enhancements | 🚧 Partial | [print-aware-editor-plan.md](./editor/print-aware-editor-plan.md) | medium | tiptap, print, paged-js, page-layout |

### ⚙️ Configuration Features

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| Condition Completion Feedback | ✅ Implemented | [condition-completion-feedback.md](./configuration/condition-completion-feedback.md) | - | validation, badges, conditions |
| Drag-and-Drop Configuration | ✅ Implemented | [drag-and-drop-configuration-feature-plan.md](./configuration/drag-and-drop-configuration-feature-plan.md) | - | dnd-kit, reordering, tree-view |
| Element Reordering Fix | ✅ Implemented | [element-reordering-fix.md](./configuration/element-reordering-fix.md) | - | dnd-kit, bug-fix, reordering |
| Hierarchical Configuration View | ✅ Implemented | [hierarchical-configuration-feature-plan.md](./configuration/hierarchical-configuration-feature-plan.md) | - | tree-view, sections, elements, components |

### 🖼️ Images & Media Features

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| Camera Integration (PWA) | ✅ Implemented | [camera-integration-plan.md](./images-media/camera-integration-plan.md) | - | webrtc, pwa, camera, media |
| Image Upload Architecture | ✅ Implemented | [image-upload-architecture.md](./images-media/image-upload-architecture.md) | - | s3, indexeddb, offline-first, thumbnails |
| Autosave for Image Upload Forms | 🚧 Partial | [autosave-image-upload-plan.md](./images-media/autosave-image-upload-plan.md) | high | autosave, images, react-hook-form |
| Capacitor Native Camera Migration | 📋 Planned | [capacitor-native-camera-migration.md](./images-media/capacitor-native-camera-migration.md) | low | capacitor, native, camera, mobile |
| Export Photos as ZIP | 📋 Planned | [export-photos-zip-plan.md](./images-media/export-photos-zip-plan.md) | low | export, archiver, photos |
| Progressive Image Loading | 📋 Planned | [progressive-image-loading-plan.md](./images-media/progressive-image-loading-plan.md) | low | performance, blur-up, thumbnails |

### 📊 Reports Features

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| Survey Report Templates Proposal | ✅ Implemented | [survey-report-templates-proposal.md](./reports/survey-report-templates-proposal.md) | - | templates, reports, architecture |
| Building Survey Report Refactoring | 🚧 Partial | [building-survey-report-refactoring.md](./reports/building-survey-report-refactoring.md) | medium | refactoring, modular-architecture, reports |
| Building Survey Report Refactoring Plan (Archived) | 🗄️ Archived | [building-survey-report-refactoring-plan.md](./reports/building-survey-report-refactoring-plan.md) | - | refactoring, reports, archived |
| Phase 1 Checklist (Archived) | 🗄️ Archived | [phase-1-checklist.md](./reports/phase-1-checklist.md) | - | refactoring, reports, archived |

### 📋 Templates Features

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| Template Builder | ✅ Implemented | [template-builder-complete.md](./templates/template-builder-complete.md) | - | templates, handlebars, tiptap, block-editor |
| Template Builder Quick Start | ✅ Implemented | [TEMPLATE_BUILDER_README.md](./templates/TEMPLATE_BUILDER_README.md) | - | templates, quick-start |

### 📝 Forms & Survey Features

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| Dynamic ComboBox | ✅ Implemented | [dynamic-combobox-feature.md](./forms-survey/dynamic-combobox-feature.md) | - | mobile, responsive, combobox, drawer |
| Local Survey-Scoped Components | 📋 Planned | [local-survey-components-feature-plan.md](./forms-survey/local-survey-components-feature-plan.md) | medium | components, survey-scope, forms |

### ✅ Data Validation Features

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| Zod-Based Status Validation | ✅ Implemented | [zod-based-status-validation.md](./data-validation/zod-based-status-validation.md) | - | zod, validation, type-safety |
| Zod Validation Migration Plan | 🚧 Partial | [zod-validation-migration-plan.md](./data-validation/zod-validation-migration-plan.md) | medium | zod, migration, validation |

### 💾 Autosave Features

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| Autosave Implementation | ✅ Implemented | [autosave-implementation.md](./autosave/autosave-implementation.md) | - | autosave, react-hook-form, debounce |

### 🔐 Auth Features

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| Signup Flow Improvements | 📋 Planned | [signup-flow-improvements.md](./auth/signup-flow-improvements.md) | high | cognito, authentication, onboarding |

### 📐 Architectural Plans

| Feature | Status | Documentation | Priority | Tags |
|---------|--------|---------------|----------|------|
| CRDT Integration Plan | 📋 Planned | [crdt-integration-plan.md](./plans/crdt-integration-plan.md) | low | crdt, collaboration, sync |
| Entity Consolidation Plan | 📋 Planned | [entity-consolidation-plan.md](./plans/entity-consolidation-plan.md) | low | dynamodb, schema, entities, flexibility |
| Generate Report Flow | 📋 Planned | [generate-report-flow.md](./plans/generate-report-flow.md) | medium | reports, ui, document-generation |
| Legend-State Migration Comparison | 📋 Planned | [legend-state-migration-comparison.md](./plans/legend-state-migration-comparison.md) | low | legend-state, state-management, offline-first, dexie |
| Minimal Yjs Integration Plan | 📋 Planned | [minimal-yjs-integration-plan.md](./plans/minimal-yjs-integration-plan.md) | low | yjs, crdt, collaboration, text-editing |
| Real-time Subscriptions Plan | 📋 Planned | [real-time-subscriptions-plan.md](./plans/real-time-subscriptions-plan.md) | low | amplify, subscriptions, realtime, websocket |
| Single-Table Design Migration | 📋 Planned | [single-table-design-migration.md](./plans/single-table-design-migration.md) | low | dynamodb, single-table, migration, aws |
| Single Table Entity Design V5 | 📋 Planned | [single-table-entity-design-v5-practical.md](./plans/single-table-entity-design-v5-practical.md) | low | dynamodb, single-table, functional, typescript |
| Survey Entity Normalization Plan | 📋 Planned | [survey-entity-normalization-plan.md](./plans/survey-entity-normalization-plan.md) | low | dynamodb, normalization, data-model |

---

## Outstanding Work by Priority

### High Priority

1. **Signup Flow Improvements** (📋 planned)
   - [signup-flow-improvements.md](./auth/signup-flow-improvements.md)
1. **Inline Header & Footer Editing** (🚧 partial)
   - [inline-header-footer-plan.md](./editor/inline-header-footer-plan.md)
1. **Autosave for Image Upload Forms** (🚧 partial)
   - [autosave-image-upload-plan.md](./images-media/autosave-image-upload-plan.md)

### Medium Priority

1. **Zod Validation Migration Plan** (🚧 partial)
   - [zod-validation-migration-plan.md](./data-validation/zod-validation-migration-plan.md)
1. **Print-Aware Block Editor Enhancements** (🚧 partial)
   - [print-aware-editor-plan.md](./editor/print-aware-editor-plan.md)
1. **Local Survey-Scoped Components** (📋 planned)
   - [local-survey-components-feature-plan.md](./forms-survey/local-survey-components-feature-plan.md)
1. **Generate Report Flow** (📋 planned)
   - [generate-report-flow.md](./plans/generate-report-flow.md)
1. **Building Survey Report Refactoring** (🚧 partial)
   - [building-survey-report-refactoring.md](./reports/building-survey-report-refactoring.md)

---

## Notes

- This file is auto-generated from frontmatter in documentation files
- Run `npm run docs:index` to regenerate after adding or updating docs
- See [README.md](./README.md) for frontmatter schema and contribution guidelines
