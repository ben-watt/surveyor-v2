### Tenant ID handling refactor: remove composite IDs and index by tenant

Goal
- Remove prepending tenant to `id` (e.g., `id#tenantId`).
- Keep `id` as the original ID; store `tenantId` in its own field.
- Make Dexie index by `tenantId` and ensure all queries are filtered by tenant.

Scope overview
- Data model: stop generating composite IDs; use `id` + `tenantId` as identity.
- Dexie schema: use `id` as the sole primary key; add an index on `tenantId`.
- Queries: replace post-filtering with indexed queries on `tenantId`.
- Accessors: update all `get/add/update/remove` helpers to work with non-composite IDs.
- Sync: stop splitting IDs for server ops; local `id` is already the server `id`.
- Tests: update unit tests that assert composite key behavior.

Current state (key places)
- Composite ID creation and usage:
  - `app/home/clients/Dexie.ts`: `getId`, `getOriginalId`, and use in `getItem`, `add`, `syncWithServer`.
  - Forms: extracting original ID on reset, e.g. `elements/form.tsx`, `conditions/form.tsx`, `building-components/form.tsx`.
  - Tests: `KeyHandling.test.ts`, `SyncBugFixes.test.ts` assert composite patterns.
- Dexie schema (v1):
  - Stores defined with `[id+tenantId]` and additional indexes: `updatedAt`, `syncStatus`.
  - Many queries filter by tenant in JS: `.filter(item => item.tenantId === tenantId)`.

Proposed design
- Identity and keys
  - Keep `entity.id` as the original ID (no tenant suffix).
  - Keep `entity.tenantId` as a top-level field.
  - Primary key: `id` only. Add secondary index `tenantId`. Also index `updatedAt` and `syncStatus`.

- Dexie schema changes
  - Define stores with `id` as PK and `tenantId` as an index:
```ts
db.version(2).stores({
  surveys: 'id, tenantId, updatedAt, syncStatus',
  components: 'id, tenantId, updatedAt, syncStatus',
  elements: 'id, tenantId, updatedAt, syncStatus',
  phrases: 'id, tenantId, updatedAt, syncStatus',
  sections: 'id, tenantId, updatedAt, syncStatus',
  imageUploads: 'id, tenantId, path, updatedAt, syncStatus',
  imageMetadata: 'id, tenantId, imagePath, updatedAt, syncStatus'
});
```
  - Optional performance indexes: `tenantId, [tenantId+updatedAt]` depending on query patterns.

- Accessor changes (`app/home/clients/Dexie.ts`)
  - Remove `getId` and `getOriginalId`.
  - `getItem(id)` → `table.get(id)`; optionally guard by asserting `result?.tenantId === tenantId`.
  - `add(data)` → store with `id: data.id` and `tenantId`; no transformation.
  - `update(id, updateFn)` → fetch via `table.get(id)`, `table.put(updated)`.
  - `remove(id)` → `table.delete(id)`.
  - `useList` → query by index: `.where('tenantId').equals(tenantId)` (drop JS `.filter`).
  - `syncWithServer`:
    - Pending deletes: send `id` as-is (already original).
    - Upserts from remote: `table.put({ ...remote, tenantId, syncStatus: Synced })`.
    - Local queued/failed: use `local.id` as server ID; no split/merge of ID strings.

- Form cleanup
  - Remove `.includes('#') ? .split('#')[0] :` logic in:
    - `app/home/elements/form.tsx`
    - `app/home/conditions/form.tsx`
    - `app/home/building-components/form.tsx`
  - After migration, `id` is already original everywhere.

- Query hygiene
  - Ensure every list/query is tenant-filtered with an indexed predicate:
    - Replace any `.filter(item => item.tenantId === tenantId)` with Dexie `.where('tenantId').equals(tenantId)`.
    - For direct fetch by `id`, rely on global ID uniqueness or assert `tenantId` on the returned row.

Data migration
- No migration required for this change (local stores can be reset during rollout if needed).

Code changes by file
- `app/home/clients/Dexie.ts`:
  - Remove `getId`, `getOriginalId` and all usages.
  - Update `getItem`, `add`, `update`, `remove` to use `id` as key and indexed tenant queries.
  - Update `useList`/`useGet` to use `where('tenantId').equals(tenantId)`.
- Forms:
  - Remove original-id extraction in elements/conditions/building-components.
- Tests:
  - Rewrite `KeyHandling.test.ts` and `SyncBugFixes.test.ts` to assert non-composite IDs and tenant-index behavior.

Acceptance criteria
- No composite IDs are generated or stored locally (verified via a smoke query over each table).
- All list queries use Dexie indexed tenant predicates; no `.filter(item => item.tenantId === tenantId)` remains.
- All CRUD paths work across tenants without ID collisions (assuming globally unique IDs).
- Full test suite green with updated tests.
- Manual verification: switch tenants and verify isolation across lists and gets.

Rollout plan
- Ship as a minor refactor with a local DB reset (if necessary) and test coverage.
- Optional: provide a local export/import utility for Dexie to recover if needed.

Risks and mitigations
- ID uniqueness across tenants must be guaranteed by ID generation; if not, collisions could occur.
- Existing references or caches holding composite IDs may break; search and remove any derived-state usages.
- Performance: ensure we add `tenantId` index so list queries stay fast.

Follow-ups (post-migration cleanup)
- Remove now-dead code paths in forms for ID splitting.
- Remove test helpers that create composite IDs.
- Consider adding `tenantId, updatedAt` compound index for faster sync scans per tenant.


