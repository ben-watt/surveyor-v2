# Hierarchical Configuration View Feature Plan

## Overview

This feature will create a unified configuration page that displays the hierarchical structure of Sections > Elements > Components > Conditions in an expandable tree view, replacing the need to navigate between separate pages.

## Current State Analysis

### Existing Configuration Pages

- **Sections** (`/home/sections`) - Top-level survey groupings with order property
- **Elements** (`/home/elements`) - Belong to sections, contain components
- **Components** (`/home/building-components`) - Primary inspection items with materials
- **Conditions** (`/home/conditions`) - Standard text phrases (called "Phrases" in schema)

### Data Model Relationships

```
Sections (1:many) → Elements (1:many) → Components
                      ↓                    ↓
                 Conditions          Conditions
```

- Conditions/Phrases are associated with Elements OR Components via arrays
- Components belong to Elements
- Elements belong to Sections

### Previous Navigation Pattern

Users previously navigated through 4 separate table views with individual create/edit forms. **This has been replaced with the unified hierarchical configuration view.**

## Proposed Solution

### 1. New Unified Configuration Page

**Location**: `/home/configuration`

**Core Features**:

- Hierarchical tree view with expandable nodes
- Inline editing capabilities
- Drag-and-drop reordering
- Bulk operations (copy, move, delete)
- Search and filtering across all levels

### 2. Tree Structure Design

```
📁 Section Name (Order: 1)
  ├── 📄 Element Name
  │   ├── 🔧 Component Name [Materials: Timber, Steel]
  │   │   └── 📝 Associated Conditions (2)
  │   │       ├── Condition: "Good condition overall..."
  │   │       └── Condition: "Minor wear observed..."
  │   └── 🔧 Component Name [Materials: Concrete]
  │       └── 📝 Associated Conditions (1)
  │           └── Condition: "Requires maintenance..."
  └── 📄 Element Name
      ├── 🔧 Component Name [Materials: Glass]
      └── 📝 Associated Conditions (1)
          └── Condition: "Element-level condition..."
```

### 3. Technical Implementation

#### 3.1 New Components

- `HierarchicalConfigView` - Main container component
- `ConfigTreeNode` - Recursive tree node component
- `InlineEditForm` - Quick edit overlay
- `EntityActionMenu` - Context menu for CRUD operations
- `ConfigSearchBar` - Multi-level search functionality

#### 3.2 Data Loading Strategy

```typescript
// Load all configuration data upfront
const [sectionsLoaded, sections] = sectionStore.useList();
const [elementsLoaded, elements] = elementStore.useList();
const [componentsLoaded, components] = componentStore.useList();
const [phrasesLoaded, phrases] = phraseStore.useList();

// Build hierarchical structure
const hierarchicalData = useMemo(
  () => buildHierarchy(sections, elements, components, phrases),
  [sections, elements, components, phrases],
);
```

#### 3.3 Tree Node Structure

```typescript
interface TreeNode {
  id: string;
  type: 'section' | 'element' | 'component' | 'condition';
  name: string;
  data: Section | Element | Component | Phrase;
  children: TreeNode[];
  isExpanded: boolean;
  parentId?: string;
}
```

### 4. User Experience Features

#### 4.1 Interaction Modes

- **View Mode**: Collapsed tree, read-only display
- **Edit Mode**: Inline editing, drag-and-drop enabled
- **Bulk Mode**: Multi-select with batch operations

#### 4.2 Quick Actions

- **Right-click context menus** for each node type
- **Inline add buttons** (+ Section, + Element, + Component)
- **Quick duplicate** functionality
- **Bulk move/copy** operations

#### 4.3 Visual Indicators

- **Icons** for each entity type (Section: 📁, Element: 📄, Component: 🔧, Condition: 📝)
- **Color coding** for sync status (synced, draft, queued, failed)
- **Badges** for counts (element count, component count, condition count)
- **Material tags** on components

### 5. Advanced Features

#### 5.1 Search & Filter

```typescript
interface SearchOptions {
  query: string;
  entityTypes: ('section' | 'element' | 'component' | 'condition')[];
  materials?: string[];
  syncStatus?: string[];
}
```

#### 5.2 Bulk Operations

- **Multi-select** with checkboxes
- **Bulk edit** properties
- **Bulk move** to different parent
- **Bulk delete** with confirmation
- **Export/Import** configuration

#### 5.3 Ordering & Organization

- **Drag-and-drop reordering** within same level
- **Move between sections** via drag-and-drop
- **Auto-save order changes**
- **Undo/redo** for structural changes

### 6. Implementation Phases

#### Phase 1: Basic Tree View (2-3 days)

- Create hierarchical data structure
- Build basic expandable tree component
- Display all entities in read-only mode
- Add search functionality

#### Phase 2: Inline Editing (2-3 days)

- Add inline edit forms for each entity type
- Implement auto-save functionality
- Add validation and error handling
- Create context menus

#### Phase 3: Advanced Features (3-4 days)

- Implement drag-and-drop reordering
- Add bulk operations
- Create filtering system
- Add export/import functionality

#### Phase 4: Polish & Testing (1-2 days)

- Performance optimization
- Accessibility improvements
- Comprehensive testing
- Documentation

### 7. Technical Considerations

#### 7.1 Performance

- **Virtualization** for large datasets (react-window)
- **Lazy loading** of condition details
- **Memoization** of tree structure calculations
- **Debounced search** and auto-save

#### 7.2 State Management

- **Local state** for UI interactions (expand/collapse)
- **Existing stores** for data persistence
- **Optimistic updates** for better UX
- **Conflict resolution** for concurrent edits

#### 7.3 Offline Support

- **Queue modifications** when offline
- **Visual indicators** for sync status
- **Retry logic** for failed operations
- **Merge conflict resolution**

### 8. Migration Strategy

#### 8.1 Coexistence Period

- Keep existing individual pages functional
- Add navigation links between old and new views
- Gradual user adoption with feature flags

#### 8.2 Data Integrity

- Ensure all CRUD operations work identically
- Maintain existing sync mechanisms
- Preserve audit trails and timestamps

### 9. Success Criteria

#### 9.1 Functional Requirements

- ✅ Display complete hierarchy in single view
- ✅ Support all existing CRUD operations
- ✅ Maintain data consistency with existing pages
- ✅ Work offline with sync queue

#### 9.2 Performance Requirements

- ✅ Load complete view within 2 seconds
- ✅ Smooth interactions (expand/collapse < 200ms)
- ✅ Handle 1000+ entities without lag
- ✅ Search results within 500ms

#### 9.3 Usability Requirements

- ✅ Intuitive navigation and discovery
- ✅ Clear visual hierarchy
- ✅ Accessible keyboard navigation
- ✅ Mobile responsive design

## Files to Create/Modify

### New Files

- `app/home/configuration/page.tsx` - Main configuration page
- `app/home/configuration/components/HierarchicalConfigView.tsx`
- `app/home/configuration/components/ConfigTreeNode.tsx`
- `app/home/configuration/components/InlineEditForm.tsx`
- `app/home/configuration/components/EntityActionMenu.tsx`
- `app/home/configuration/components/ConfigSearchBar.tsx`
- `app/home/configuration/hooks/useHierarchicalData.ts`
- `app/home/configuration/utils/treeOperations.ts`

### Modified Files

- Update navigation in sidebar to include Configuration link
- Add route handling in layout components
- Update existing stores if needed for bulk operations

### Testing Files

- `app/home/configuration/__tests__/HierarchicalConfigView.test.tsx`
- `app/home/configuration/__tests__/treeOperations.test.ts`
- `app/home/configuration/__tests__/useHierarchicalData.test.ts`

This feature will significantly improve the user experience by providing a comprehensive overview of the configuration hierarchy while maintaining all existing functionality in a more intuitive interface.

## Implementation Status

### ✅ Completed - Phase 1: Basic Tree View (Completed)

- ✅ Created main configuration page at `/home/configuration`
- ✅ Built hierarchical data structure utility (`useHierarchicalData.ts`)
- ✅ Implemented basic expandable tree component (`HierarchicalConfigView.tsx`)
- ✅ Created tree node component with proper icons and badges (`ConfigTreeNode.tsx`)
- ✅ Added comprehensive search functionality with filtering (`ConfigSearchBar.tsx`)
- ✅ Updated navigation sidebar to include Configuration link
- ✅ Fixed TypeScript errors and ensured type safety
- ✅ Displays all entities in read-only mode with proper hierarchy
- ✅ **Updated icons to match sidebar menu** (Layers, Grid2x2, Blocks, MessageSquare)
- ✅ **Added click navigation to edit pages** for all entity types
- ✅ **Proper event handling** with stopPropagation for expand/collapse vs navigation
- ✅ **Added ellipsis menu with delete functionality** - hover to reveal three-dot menu
- ✅ **Delete confirmation dialogs** with proper error handling for all entity types
- ✅ **Mobile-responsive design** with touch-friendly interactions and layouts
- ✅ **Adaptive UI elements** - larger touch targets, stacked layouts, condensed text on mobile
- ✅ **State persistence** - maintains expanded nodes and search state using localStorage
- ✅ **Return navigation** - preserves hierarchy state when navigating to/from edit pages
- ✅ **Entity highlighting** - highlights recently edited entities with visual feedback
- ✅ **Auto-expansion** - automatically expands path to edited entity on return
- ✅ **Simplified navigation** - removed individual list pages, unified configuration interface
- ✅ **Hierarchical routing** - restructured routes under `/home/configuration/` for better organization
- ✅ **Create functionality** - added ability to create new entities from hierarchical view
- ✅ **Context-aware creation** - contextual create options based on entity relationships

### 🔄 Remaining Work

#### Phase 2: Inline Editing (Not Started - 2-3 days)

- ❌ Add inline edit forms for each entity type
- ❌ Implement auto-save functionality
- ❌ Add validation and error handling
- ❌ Create context menus for CRUD operations

#### Phase 3: Advanced Features (Not Started - 3-4 days)

- ❌ Implement drag-and-drop reordering
- ❌ Add bulk operations (multi-select, bulk edit, bulk delete)
- ❌ Create filtering system beyond basic search
- ❌ Add export/import functionality

#### Phase 4: Polish & Testing (Not Started - 1-2 days)

- ❌ Performance optimization with virtualization for large datasets
- ❌ Accessibility improvements
- ❌ Comprehensive testing
- ❌ Documentation updates

### Files Created

- `app/home/configuration/page.tsx` - Main configuration page
- `app/home/configuration/components/HierarchicalConfigView.tsx` - Container component
- `app/home/configuration/components/ConfigTreeNode.tsx` - Tree node component
- `app/home/configuration/components/ConfigSearchBar.tsx` - Search component
- `app/home/configuration/hooks/useHierarchicalData.ts` - Data structure hook
- `app/home/configuration/utils/stateUtils.ts` - State persistence utilities
- `app/home/configuration/sections/[id]/page.tsx` - Section edit page under configuration
- `app/home/configuration/sections/create/page.tsx` - Section creation page under configuration
- `app/home/configuration/elements/[id]/page.tsx` - Element edit page under configuration
- `app/home/configuration/elements/create/page.tsx` - Element creation page under configuration
- `app/home/configuration/components/[id]/page.tsx` - Component edit page under configuration
- `app/home/configuration/components/create/page.tsx` - Component creation page under configuration
- `app/home/configuration/conditions/[id]/page.tsx` - Condition edit page under configuration
- `app/home/configuration/conditions/create/page.tsx` - Condition creation page under configuration

### Files Modified

- `components/app-sidebar.tsx` - Added Configuration link, removed individual list page links

### Files Removed

- `app/home/sections/` - Old sections list and edit pages (replaced by hierarchical structure)
- `app/home/elements/` - Old elements list and edit pages (replaced by hierarchical structure)
- `app/home/building-components/` - Old components list and edit pages (replaced by hierarchical structure)
- `app/home/conditions/` - Old conditions list and edit pages (replaced by hierarchical structure)

### Current Functionality

The basic hierarchical configuration view is now functional and includes:

- **Complete hierarchy display**: Shows Sections > Elements > Components > Conditions
- **Expand/collapse**: Users can expand and collapse tree nodes
- **Search with filtering**: Search across all entity types with type filtering
- **Visual indicators**: Icons matching sidebar menu (MessageSquare for conditions), badges for counts, material tags
- **Click navigation**: Click any entity to navigate to its edit page
- **Full CRUD operations**: Create, edit, and delete functionality integrated into tree view
- **Context-aware creation**: Create buttons show only valid child entity types (sections → elements, elements → components/conditions, etc.)
- **Multiple creation entry points**: Global "Create New" dropdown + contextual "Add X" options in entity menus
- **Mobile-responsive**: Touch-friendly 48px+ touch targets, stacked layouts on small screens
- **Adaptive content**: Badges stack vertically on mobile, condensed text, larger icons
- **State persistence**: Expanded nodes, search state, and navigation context preserved
- **Smart navigation**: Returns to exact hierarchy state after editing with visual highlighting
- **Hierarchical URLs**: Clean route structure under `/home/configuration/` (e.g., `/home/configuration/sections/123`)
- **Proper data relationships**: Conditions correctly associated with elements/components
- **TypeScript safety**: All components properly typed
- **Event handling**: Separate click zones for expand/collapse vs navigation vs menu actions

### Next Steps

To complete the feature, Phase 2 (Inline Editing) should be implemented next, which would add:

1. Right-click context menus for each node
2. Inline editing capabilities
3. Integration with existing CRUD operations from individual pages
4. Auto-save functionality matching existing patterns
