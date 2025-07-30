# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

**Development:**
```bash
npm run dev              # Start development server with Turbopack
npm run sandbox          # Start Amplify sandbox with local environment
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

## Coding Best Practices

- When creating or editing files, always run ts-lint to ensure there are no linter errors after editing
- When asked to create a new feature assume that we want to create a feature document in /docs as a markdown file first. This plan should include references to key files and an outline of what will need to be done. It should be consise and clear and provide code examples where appropriate.

## Architecture Overview

This is an offline-first surveyor application built with Next.js 15 and AWS Amplify Gen2. The architecture prioritizes reliability in poor network conditions while supporting multi-tenant data isolation.

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

- **Survey Store** (`app/home/clients/surveyStore.ts`) - Building survey management
- **Document Store** (`app/home/clients/documentStore.ts`) - Document versioning
- **Image Store** (`app/home/clients/imageStore.ts`) - Image upload queue
- **Sync Engine** (`app/home/clients/sync.ts`) - Handles offline/online sync

### Key Technologies

- **UI**: React 19, Next.js 15 App Router, Tailwind CSS, shadcn/ui
- **Forms**: React Hook Form with validation
- **Rich Text**: TipTap editor with custom extensions
- **Backend**: AWS Amplify Gen2, DynamoDB, S3, Cognito
- **Offline**: Dexie.js, Service Worker (Serwist)

### Code Style (from .cursorrules)

- 2-space indentation, single quotes, trailing commas
- TypeScript strict mode enabled
- React components in PascalCase
- Event handlers prefixed with `handle`
- Test files: `*.test.ts` in `__tests__/`

### Testing Approach

Use Jest with React Testing Library. Run individual tests with:
```bash
npm run test -- path/to/test.test.ts
```

### Working with Amplify

The backend is defined in `amplify/` directory:
- `amplify/data/resource.ts` - Data schema and authorization
- `amplify/auth/resource.ts` - Authentication configuration
- `amplify/storage/resource.ts` - S3 bucket configuration
- `amplify/functions/` - Lambda functions

To modify backend resources, edit these files and the sandbox will hot-reload changes.

### Image Upload Architecture

Images are uploaded progressively:
1. Added to local queue immediately
2. Upload starts when online
3. Metadata saved to DynamoDB after S3 upload
4. Status tracked in IndexedDB during process

### Auto-save Implementation

Forms auto-save after 2 seconds of inactivity:
- Validation can be enforced before save
- Visual indicators show save status
- Works offline with sync queue

### Authentication Flow

- Cognito User Pools for authentication
- Groups: `global-admin`, tenant-specific groups
- Owner-based access for documents
- Middleware handles auth redirects in `middleware.ts`

## Project Organization

- **Feature documents should go in the docs/ folder**