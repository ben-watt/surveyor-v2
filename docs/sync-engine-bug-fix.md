# Sync Engine Bug Fix

## Problem Description

The sync engine had a critical bug that caused data to get stuck in the "queued" state. This happened because:

1. **Incorrect Status Assignment**: When fetching remote data, items that didn't exist locally were incorrectly marked as `SyncStatus.Queued` instead of `SyncStatus.Synced`.

2. **ID Mismatch Issues**: The sync process used compound IDs (`id + '#' + tenantId`) but didn't handle ID lookups consistently between local and remote data.

3. **Poor Error Handling**: Failed sync attempts didn't have proper retry mechanisms, leaving items permanently in "failed" state.

## Root Cause

The main bug was in `app/home/clients/Dexie.ts` in the `syncWithServer` function:

```typescript
// BUGGY CODE
if(!local) {
  console.debug("[syncWithServer] Local item not found, creating...", remote);
  await table.add({ ...remote, syncStatus: SyncStatus.Queued }); // ❌ Wrong!
  continue;
}
```

This created a cycle where:
1. Remote items were fetched and marked as "Queued" locally
2. The sync process tried to sync these "Queued" items back to the server
3. The server rejected them (because they already exist)
4. The items remained stuck in "Queued" state

## Solution

### 1. Fixed Status Assignment (Minimal Change)

The core fix was simply changing the sync status assignment for remote items:

```typescript
// BUGGY CODE
if(!local) {
  console.debug("[syncWithServer] Local item not found, creating...", remote);
  await table.add({ ...remote, syncStatus: SyncStatus.Queued }); // ❌ Wrong!
  continue;
}

// FIXED CODE
if(!local) {
  console.debug("[syncWithServer] Local item not found, creating as synced...", remote);
  await table.add({ ...remote, syncStatus: SyncStatus.Synced }); // ✅ Correct!
  continue;
}
```

### 2. Enhanced Error Handling

- Added retry mechanism for failed items (up to 3 attempts)
- Improved error messages and logging
- Added `forceSync` method for manual sync operations

### 3. Added Debugging Tools

- Added "Force Sync" button in the SyncStatus component
- Enhanced sync status display with detailed counts
- Added manual sync capabilities in the settings page

## Files Modified

1. `app/home/clients/Dexie.ts` - Core sync logic fixes
2. `app/home/clients/Database.ts` - Added forceSync to surveyStore wrapper
3. `app/home/components/SyncStatus.tsx` - Added force sync UI
4. `app/home/settings/page.tsx` - Updated to use forceSync

## Testing

To test the fix:

1. Create some items while offline
2. Go online and check that items sync properly
3. Use the "Force Sync" button in the sync status indicator
4. Check the settings page sync functionality

## Prevention

To prevent similar issues in the future:

1. Always mark remote items as `Synced` when creating them locally
2. Use consistent ID formats throughout the sync process
3. Implement proper retry mechanisms for failed operations
4. Add comprehensive logging for debugging sync issues
5. Test sync scenarios thoroughly, especially offline/online transitions 