# AGENTS.md

This file provides guidance for AI coding assistants (Claude, Cursor, etc.) when working with code in this repository.

---

## Quick Reference

### Common Commands

**Development:**

```bash
npm run dev              # Start development server with Turbopack
npm run sandbox          # Start Amplify sandbox with local environment
npm run docs:index       # Regenerate FEATURE_STATUS.md from doc frontmatter
```

**Building & Testing:**

```bash
npm run build            # Build production application
npm run test             # Run Jest tests
npm run test:watch       # Run tests in watch mode
npm run ts-lint          # Type-check TypeScript without emitting
npm run lint             # Run ESLint
npm run fix              # Auto-fix linting issues
```

**Pre-commit Checks (automated via Husky):**

- TypeScript type checking (`npm run ts-lint`)
- ESLint validation (`npm run lint`)
- Jest tests (`npm run test`)

---

## Architecture Overview

This is an **offline-first surveyor application** built with Next.js 15 and AWS Amplify Gen2. The architecture prioritizes reliability in poor network conditions while supporting multi-tenant data isolation.

### Key Architectural Patterns

1. **Offline-First with IndexedDB**
   - All data operations go through Dexie (IndexedDB wrapper) first
   - Sync engine reconciles local and remote changes every 30 seconds
   - Queue-based sync mechanism handles offline changes
   - Located in `app/home/clients/` directory

2. **Multi-Tenant Data Isolation**
   - Composite keys: `tenantId#entityId` pattern throughout
   - Group-based authorization in Amplify schema
   - Tenant context provider manages current tenant

3. **Document Versioning System**
   - Single-table DynamoDB design for documents
   - Custom Lambda (`amplify/functions/version-document/`) handles atomic versioning
   - S3 stores content, DynamoDB stores metadata
   - Maintains last 10 versions with automatic pruning

### Data Flow

```
User Action → React Hook Form → Local Store (Dexie) → Sync Queue → AWS Amplify → DynamoDB/S3
                                      ↓                     ↑
                                 Auto-save              Periodic Sync
```

### Important Services & Stores

| Store | Location | Purpose |
|-------|----------|---------|
| Survey Store | `app/home/clients/surveyStore.ts` | Building survey management |
| Document Store | `app/home/clients/documentStore.ts` | Document versioning |
| Image Store | `app/home/clients/imageStore.ts` | Image upload queue |
| Sync Engine | `app/home/clients/sync.ts` | Handles offline/online sync |

### Key Technologies

- **UI**: React 19, Next.js 15 App Router, Tailwind CSS, shadcn/ui
- **Forms**: React Hook Form with Zod validation
- **Rich Text**: TipTap editor with custom extensions
- **Backend**: AWS Amplify Gen2, DynamoDB, S3, Cognito
- **Offline**: Dexie.js, Service Worker (Serwist)

---

## Coding Conventions

### Style

- 2-space indentation, single quotes, trailing commas
- TypeScript strict mode enabled
- React components in PascalCase
- Event handlers prefixed with `handle`
- Test files: `*.test.ts` in `__tests__/` directories

### Testing Layout

- Prefer colocating tests next to the code they cover inside a `__tests__` directory within the relevant feature/module folder (e.g. `app/home/configuration/__tests__`, `lib/conditions/__tests__`, `components/__tests__`).
- When adding new tests, place them under the closest feature path rather than a top-level `__tests__` folder.
- Use `*.test.ts` / `*.test.tsx` naming. Keep imports identical to production code (use the same path aliases like `@/...`).
- Integration tests should live near the feature they exercise.
- Avoid cross-feature test coupling; keep test utilities under a local `__tests__/utils` or a shared testing utils folder if already established.

### Best Practices

- When creating or editing files, always run `ts-lint` to ensure there are no linter errors
- When asked to create a new feature, create a feature document in `/docs` as a markdown file first with proper frontmatter
- Feature docs should include references to key files and an outline of what will need to be done

---

## Documentation System

### Finding Documentation

All feature documentation lives in `/docs` organized by category:

| Category | Path | Topics |
|----------|------|--------|
| Editor | `docs/editor/` | TipTap, WYSIWYG, print preview, conditions |
| Configuration | `docs/configuration/` | Tree view, drag-drop, hierarchy |
| Images & Media | `docs/images-media/` | Upload, camera, progressive loading |
| Reports | `docs/reports/` | Report generation, templates |
| Templates | `docs/templates/` | Template builder, Handlebars |
| Forms & Survey | `docs/forms-survey/` | Survey forms, components |
| Data Validation | `docs/data-validation/` | Zod schemas, validation |
| Autosave | `docs/autosave/` | Autosave implementation |
| Auth | `docs/auth/` | Authentication, signup |
| Architecture | `docs/plans/` | CRDT, DynamoDB, sync plans |

### Frontmatter for LLM Search

All docs use YAML frontmatter for searchability:

```yaml
---
title: "Feature Name"
status: implemented | partial | planned | archived
category: editor | configuration | images-media | ...
tags: [relevant, keywords]
priority: high | medium | low  # for partial/planned only
---
```

**Quick filters:**
- Find in-progress work: `status: partial`
- Find high-priority planned work: `status: planned` + `priority: high`
- Find by technology: search `tags:` for `tiptap`, `zod`, `dnd-kit`, etc.

### Local Agent Files

Area-specific context is available in `agent.md` files:
- `components/ui/agent.md` - UI component conventions
- `lib/conditions/agent.md` - Conditions parsing/validation
- `app/utils/capacitor/agent.md` - Mobile/Capacitor context
- `app/home/configuration/agent.md` - Configuration module context

---

## Working with Amplify

The backend is defined in `amplify/` directory:

- `amplify/data/resource.ts` - Data schema and authorization
- `amplify/auth/resource.ts` - Authentication configuration
- `amplify/storage/resource.ts` - S3 bucket configuration
- `amplify/functions/` - Lambda functions

To modify backend resources, edit these files and the sandbox will hot-reload changes.

### Authentication Flow

- Cognito User Pools for authentication
- Groups: `global-admin`, tenant-specific groups
- Owner-based access for documents
- Middleware handles auth redirects in `middleware.ts`

---

## Feature-Specific Context

### Image Upload Architecture

Images are uploaded progressively:

1. Added to local queue immediately
2. Upload starts when online
3. Metadata saved to DynamoDB after S3 upload
4. Status tracked in IndexedDB during process

See: `docs/images-media/image-upload-architecture.md`

### Auto-save Implementation

Forms auto-save after 2 seconds of inactivity:

- Validation can be enforced before save
- Visual indicators show save status
- Works offline with sync queue

See: `docs/autosave/autosave-implementation.md`

### Template Builder

Template-driven report generation with Handlebars:

- Block editor for template authoring
- Dynamic data binding with survey context
- Print-ready output with paged.js

See: `docs/templates/template-builder-complete.md`
