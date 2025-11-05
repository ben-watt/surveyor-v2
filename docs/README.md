# Surveyor v2 Documentation

This directory contains organized documentation for the Surveyor v2 application, grouped by theme for easy navigation.

**📊 [Feature Status Dashboard](./FEATURE_STATUS.md)** - Track implementation status of all features

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
1. Place it in the appropriate theme folder
2. Update the relevant folder's README.md
3. Update [FEATURE_STATUS.md](./FEATURE_STATUS.md) to track implementation status
4. If it doesn't fit an existing theme, consider creating a new folder or placing it in a relevant existing folder

