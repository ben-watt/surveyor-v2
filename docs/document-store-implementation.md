# Document Store Implementation

## Overview

The document store provides a robust system for managing markdown documents with version control, online-only operations, and S3 integration. This implementation follows the project's offline-first architecture while maintaining strict online requirements for document operations.

---

## **Planned Changes: Simplified Document Store Design**

### **Goals**
- Simplify DynamoDB data model using a single-table design
- Store document versions as separate items, limited to 10 versions per document
- Centralize and improve access control management
- Maintain online-only operations and S3 integration

### **Proposed Architecture**

#### **Single Table Design**
- **Table Structure:**
  - **PK (Partition Key):** `tenantId#documentId`
  - **SK (Sort Key):**
    - `meta` (for main document metadata)
    - `version#<number>` (for each document version)
- **Document Metadata Item (SK = meta):**
  - Contains: id, displayName, fileName, fileType, size, currentVersion, lastModified, createdAt, updatedAt, tenantId, owner, editors, viewers
  - Points to the latest version
  - Holds access control fields
- **Version Items (SK = version#<number>):**
  - Contains: version number, author, createdAt, changeType, S3 object key, file size, etc.
  - Each version is a separate item (max 10 per document; oldest versions pruned as needed)

#### **Versioning**
- On each save, a new version item is created (up to 10 per document)
- If the limit is reached, the oldest version is deleted
- The main document item is updated to point to the latest version
- Version history is queried by PK, filtering SK by `version#` prefix

#### **Access Control**
- Owner, editors, and viewers are managed on the main document item
- All version items inherit access from the main document
- Only authorized users can create new versions or modify access

#### **Operations**
- **Create/Update Document:**
  - Check online status
  - Validate content (markdown, file size, file name, non-empty)
  - Create new version item
  - Update main document metadata
  - Prune old versions if over limit
- **Fetch Document:**
  - Retrieve main document item and latest version
- **Fetch Version History:**
  - Query by PK, filter SK by `version#`
- **Rollback:**
  - Update main document's pointer to a previous version
- **Access Management:**
  - Update owner/editors/viewers on main document item

### **Rationale for Changes**
- **Scalability:** Avoids item size limits and write contention by storing versions as separate items
- **Query Flexibility:** Enables efficient queries for version history and metadata
- **Atomicity:** Supports transactional updates for versioning and metadata
- **Centralized Access Control:** Simplifies permission management

---

## Revised Single-Table Design Plan

### **Single Table, Graph-Based Design**
- **All document metadata and versions are stored in a single DynamoDB table.**
- **Partition Key (pk):** `tenantId#documentId`
- **Sort Key (sk):**
  - `#LATEST` for the latest version/metadata
  - `v0`, `v1`, ... for historical versions (e.g., `v0` is the first version, `v9` is the 10th, etc.)
- **When querying:**
  - Use `sk = #LATEST` to fetch the current/latest version and metadata
  - Use `sk = v0`, `v1`, etc. to fetch specific historical versions
  - To list all versions, query by `pk` and filter `sk` by prefix `v`
- **All access control and document metadata are stored on the `#LATEST` item.**
- **Version items** store only version-specific data (author, timestamp, S3 key, etc.)

### **Future-Proofing with GSIs**
- **Consider adding GSIs** for common query patterns, such as:
  - Querying all documents for a tenant
  - Querying all documents a user can edit/view
  - Querying by owner or last modified
- **GSIs can be added to support new features without major refactoring.**

### **Benefits**
- **Simplicity:** All document data is in one table, easy to query by pk/sk.
- **Performance:** Efficient access to latest and historical versions.
- **Flexibility:** Easy to add new query patterns with GSIs.
- **Consistency:** Centralized access control and metadata.

### **Example Table Rows**
| pk                | sk      | type     | ...other fields... |
|-------------------|---------|----------|-------------------|
| tenant1#docA      | #LATEST | Document | ...               |
| tenant1#docA      | v0      | Version  | ...               |
| tenant1#docA      | v1      | Version  | ...               |
| tenant1#docB      | #LATEST | Document | ...               |
| tenant1#docB      | v0      | Version  | ...               |

### **Query Patterns**
- **Get latest:** `pk = tenantId#documentId, sk = #LATEST`
- **Get version:** `pk = tenantId#documentId, sk = vN`
- **List all versions:** `pk = tenantId#documentId, sk begins_with v`

### **Supporting Query: Get Docs Owned by Me**

To efficiently retrieve all documents owned by the current user, add a Global Secondary Index (GSI) on the `owner` field:

- **GSI Partition Key:** `owner`
- **GSI Sort Key:** `sk`
- This allows you to query for all documents where the owner matches the current user and filter for `sk = #LATEST` to get only the latest version/metadata for each document.

**Example GSI definition (in schema):**
```ts
.index('byOwner', ['owner', 'sk'])
```

**Example Query:**
- Query the `byOwner` GSI with `owner = <currentUser>` and `sk = #LATEST` to get all documents owned by the user.

**Benefits:**
- Efficiently supports user-centric document listing.
- Only returns the latest version for each document, avoiding duplicates from version history.

---

## **Server-Side Conflict Prevention & Atomic Versioning in Amplify Gen 2**

### **Why Server-Side Conflict Prevention?**
- To prevent race conditions and version conflicts when multiple clients attempt to update a document concurrently, all versioning and metadata updates must be performed atomically on the server side.
- This is especially important because Amplify Gen 2's generated data client does **not** natively support conditional writes or transactions. Instead, you must implement this logic using custom business logic (custom mutations) as described in the [Amplify Gen 2 documentation](https://docs.amplify.aws/react/build-a-backend/data/custom-business-logic/).

### **Recommended Approach**
- Implement a **custom mutation** (using a Lambda function or custom resolver) that:
  - Receives the update request with the expected current version.
  - Performs a DynamoDB transaction (TransactWriteItems) to:
    - Conditionally update the `#LATEST` item only if its `currentVersion` matches the expected value.
    - Create the new version item.
    - Prune the oldest version if over the limit.
  - Returns success or a conflict error to the client.
- The client should handle conflict errors by refetching and retrying, or surfacing the conflict to the user.

### **Implementation Steps (Amplify Gen 2)**
1. **Schema Design & Table Setup**
   - As before, define the single-table schema in Amplify Data/CloudFormation.
2. **Custom Mutation for Atomic Versioning**
   - Define a custom mutation in your Amplify Gen 2 schema using `a.mutation().handler(a.handler.function(...))` or `a.handler.custom(...)`.
   - Implement the handler (Lambda or custom resolver) to perform the transactional, conditional update logic in DynamoDB.
   - Reference: [Amplify Gen 2 Custom Business Logic](https://docs.amplify.aws/react/build-a-backend/data/custom-business-logic/)
3. **Code Implementation**
   - Update `DocumentStore.ts` and related client code to call the custom mutation for all document updates.
   - Ensure the client passes the expected current version and handles conflict errors.
4. **Testing**
   - Add/expand tests for concurrent updates, conflict handling, and atomicity.
5. **Rollout & Cleanup**
   - As before, deploy, monitor, and document the new approach.

### **Example Flow**
1. Client fetches `currentVersion` from `#LATEST`.
2. Client sends update request to custom mutation with `expectedCurrentVersion` and new content.
3. Handler (Lambda/custom resolver):
   - Reads `#LATEST` and checks `currentVersion`.
   - If matches, performs DynamoDB transaction:
     - Updates `#LATEST` (increment version, update metadata)
     - Puts new version item
     - Deletes oldest version if needed
   - If not, returns a conflict error.
4. Client handles success or conflict.

---

## **References**
- [Amplify Gen 2: Custom Business Logic (Custom Mutations)](https://docs.amplify.aws/react/build-a-backend/data/custom-business-logic/)

---

## Implementation Files

- **Core Implementation:** `app/home/clients/DocumentStore.ts`
  - Main document store logic, CRUD, S3/DynamoDB integration, versioning, access control
- **Editor Integration:** `app/home/editor/hooks/useEditorState.tsx`
  - Manages editor state, integrates with document store
- **Editor Page:** `app/home/editor/[id]/building-survey/page.tsx`
  - Document editor UI, saving, preview, user interactions

## Dependencies

- AWS Amplify v2
- TypeScript
- ts-results (for Result type)
- AWS S3
- AWS DynamoDB (via Amplify Data)
- React (for hooks integration)

---

## Migration & Implementation Plan

1. **Schema Design & Table Setup**
   - Define the new single-table schema in Amplify Data/CloudFormation.
   - Add new attributes (SK, versioning fields) to support the new design.
   - Deploy the table structure.

2. **Code Implementation**
   - Implement `DocumentStore.ts` to:
     - Use the new single-table access patterns (PK/SK queries).
     - Create new version items on save, prune old versions.
     - Update access control logic to use the main document item.
   - Update hooks and editor integration to use new APIs.

3. **Testing**
   - Add/expand unit and integration tests for:
     - Version creation, pruning, and rollback
     - Access control enforcement
   - Validate performance and correctness in staging.

4. **Rollout**
   - Deploy code and schema changes to production.
   - Monitor for errors and data consistency issues.
   - Communicate changes to users and provide rollback plan if needed.

5. **Cleanup**
   - Remove deprecated fields and code paths after successful rollout.
   - Document new data model and API usage for future development.

**Note:** Data migration is not required as this feature is not yet live and there is no existing data to migrate. 