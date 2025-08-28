# Element Reordering Fix

## Problem
Elements within a section could not be reordered via drag and drop. The drag operation failed with the error "Element cannot be placed inside Element".

## Root Cause
The `determineDropPosition` function in `useDragDrop.ts` was incorrectly returning 'inside' positioning for all element-over-element scenarios, even when the elements were siblings that should be reordered.

## Solution
Updated `determineDropPosition` function to:

1. **Detect Sibling Relationships**: Check if the dragged element and target element have the same parent and type
2. **Handle Root-Level Siblings**: Special case for sections at root level  
3. **Use Proper Positioning**: For siblings, use 'before'/'after' based on cursor position instead of 'inside'
4. **Validate Container Drops**: Only return 'inside' for valid container relationships

## Code Changes

**File**: `app/home/configuration/hooks/useDragDrop.ts`

### Before
```typescript
if (overNode.type === 'section' || overNode.type === 'element') {
  // Always defaulted to 'inside' for elements
  return 'inside';
}
```

### After
```typescript
// Check if dragging over a sibling (same parent and type)
const activeParent = getParentNode(activeNode.id);
const overParent = getParentNode(overNode.id);
const areSiblings = activeParent?.id === overParent?.id && 
                    activeNode.type === overNode.type;

if (areSiblings || areRootSiblings) {
  // For siblings, determine before/after based on cursor position
  const midpoint = rect.top + rect.height / 2;
  return y < midpoint ? 'before' : 'after';
}
```

## Testing Results
- ✅ Element reordering within sections now works
- ✅ 'After' positioning test passes  
- ✅ No longer throws "Element cannot be placed inside Element" error
- ✅ `onReorder` callback is properly called with correct updates

## Impact
- Elements can now be reordered within their parent sections
- Drag and drop operations work intuitively for sibling elements
- Maintains existing functionality for cross-parent moves
- Provides proper visual feedback during drag operations