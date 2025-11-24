# Surveyor v2 Documentation

This directory contains organized documentation for the Surveyor v2 application, grouped by theme for easy navigation.

**📊 [Feature Status Dashboard](./FEATURE_STATUS.md)** - Track implementation status of all features (auto-generated)

---

## Frontmatter Schema

All documentation files use YAML frontmatter for LLM searchability and automated status tracking:

```yaml
---
title: "Feature Name"
status: implemented | partial | planned | archived
category: editor | configuration | images-media | reports | templates | forms-survey | data-validation | autosave | auth | architecture
created: 2025-01-15
updated: 2025-11-24
tags: [tiptap, offline, autosave]
related: [./other-doc.md, ../category/doc.md]
priority: high | medium | low  # for planned/partial only
---
```

### Status Values

| Status | Description |
|--------|-------------|
| `implemented` | Feature is fully implemented and production-ready |
| `partial` | Feature is partially implemented or in progress |
| `planned` | Feature is documented but not yet started |
| `archived` | Feature plan is obsolete or superseded |

### Searching Documentation

**For LLM agents**: Filter docs by frontmatter fields:
- By status: Find all `status: partial` docs to see work in progress
- By category: Filter `category: editor` for editor-related features
- By tags: Search for specific technologies like `tags: [tiptap]`
- By priority: Find high-priority planned work with `priority: high`

**For humans**: Use the [Feature Status Dashboard](./FEATURE_STATUS.md) for a quick overview, or browse by category below.

---

## Documentation Structure

### 📝 [Editor](./editor/)
Documentation for the survey document editor, including WYSIWYG editing, inline condition editing, print preview, image reordering, and formatting features.

### ⚙️ [Configuration](./configuration/)
Documentation for the hierarchical configuration view, drag-and-drop operations, element management, and condition completion features.

### 🖼️ [Images & Media](./images-media/)
Documentation for image upload architecture, camera integration, photo management, progressive loading, and export features.

### 📊 [Reports](./reports/)
Documentation for report generation, building survey report refactoring, and report template proposals.

### 📋 [Templates](./templates/)
Documentation for the Template Builder system, enabling reusable, data-driven report templates with Handlebars syntax.

### 📝 [Forms & Survey](./forms-survey/)
Documentation for survey form components, dynamic combobox features, and survey-specific functionality.

### ✅ [Data Validation](./data-validation/)
Documentation for Zod-based validation implementations and migration plans for type-safe data validation.

### 💾 [Autosave](./autosave/)
Documentation for the autosave functionality, including React Hook Form integration and status management.

### 🔐 [Auth](./auth/)
Documentation for authentication, user signup flows, and onboarding improvements.

### 📐 [Plans](./plans/)
High-level architectural plans including CRDT integration, entity consolidation, single-table design migrations, real-time subscriptions, and database normalization strategies.

## Quick Navigation

- **Working on the editor?** → See [Editor](./editor/)
- **Setting up image uploads?** → See [Images & Media](./images-media/)
- **Building reports?** → See [Reports](./reports/) and [Templates](./templates/)
- **Configuring survey structure?** → See [Configuration](./configuration/)
- **Implementing forms?** → See [Forms & Survey](./forms-survey/)
- **Adding validation?** → See [Data Validation](./data-validation/)
- **Architecture decisions?** → See [Plans](./plans/)

## Contributing

When adding new documentation:

1. **Add frontmatter** - Include the YAML frontmatter block at the top of your file with all required fields (title, status, category, created, updated, tags)
2. **Place in appropriate folder** - Put the file in the matching category folder
3. **Update folder README** - Add a link in the relevant folder's README.md
4. **Regenerate dashboard** - Run `npm run docs:index` to update FEATURE_STATUS.md

### Regenerating the Feature Status Dashboard

The dashboard is auto-generated from frontmatter. To update it:

```bash
npm run docs:index
```

This scans all `.md` files in `docs/`, parses their frontmatter, and regenerates `FEATURE_STATUS.md`.

