# Document Store Implementation

## Overview

The document store provides a robust system for managing markdown documents with version control, online-only operations, and S3 integration. This implementation follows the project's offline-first architecture while maintaining strict online requirements for document operations.

## Implementation Files

- **Core Implementation**: `app/home/clients/DocumentStore.ts`
  - Contains the main document store implementation with CRUD operations
  - Handles S3 and DynamoDB integration via AWS Amplify
  - Implements version control and access management

- **Editor Integration**: `app/home/editor/hooks/useEditorState.tsx`
  - Manages document state in the editor
  - Handles document template rendering
  - Integrates with the document store for saving and loading

- **Editor Page**: `app/home/editor/[id]/building-survey/page.tsx`
  - Implements the document editor UI
  - Handles document saving and preview functionality
  - Manages user interactions with the document

## Architecture

### Storage Layer
- **Remote Storage**: 
  - AWS S3 via Amplify for document content
  - DynamoDB via Amplify Data for document metadata, access control, and version history
- **Folder Structure**: `/documents/{tenantId}/{documentId}` in S3
- **Access Control**:
  - Authenticated users can read documents
  - Global admins have full access (read, write, delete, list)
  - Entity-based access control for document operations

## Key Features

1. **Online-Only Operations**
   - All write operations require online connection
   - Network status checked before operations
   - Clear error messages for offline state

2. **Content Validation**
   - Markdown validation
   - File size limits (10MB max)
   - File name sanitization
   - Empty content checks

3. **Version Control**
   - Automatic version incrementing
   - Version history tracking
   - Author attribution
   - Change type tracking

4. **Tenant Isolation**
   - Strict path separation in S3
   - Tenant-based access control
   - Tenant ID validation

5. **User Integration**
   - Current user context
   - Owner/editor/viewer management
   - User-based access control

## Dependencies

- AWS Amplify
- TypeScript
- ts-results (for Result type)
- AWS S3
- AWS DynamoDB (via Amplify Data)
- React (for hooks integration) 