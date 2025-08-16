# Drag and Drop Configuration Feature Plan

## Overview

This feature will add drag-and-drop capabilities to the existing hierarchical configuration view, allowing users to:
- **Reorder** entities within the same level (sections, elements within sections, components within elements)
- **Move** entities between different parents (elements to different sections, components to different elements)
- **Organize** conditions by associating them with different elements or components
- **Bulk operations** via multi-select and drag

## Current State Analysis

### Existing Hierarchical View
The configuration page at `/home/configuration` currently provides:
- Tree structure display: Sections → Elements → Components → Conditions
- Expand/collapse functionality with state persistence
- Search and filtering across all entity types
- CRUD operations via navigation to edit pages
- Delete functionality with confirmation dialogs
- Mobile-responsive design

### Data Model Constraints
```
Sections (order: number) → Elements (sectionId, order) → Components (elementId, order)
                             ↓                                ↓
                        Conditions[]                     Conditions[]
```

**Key Relationships:**
- Elements must belong to exactly one Section
- Components must belong to exactly one Element
- Conditions can be associated with multiple Elements OR Components via arrays
- All entities have an `order` field for sequencing

## Proposed Solution

### 1. Drag and Drop Capabilities

#### 1.1 Reordering Within Same Level
- **Sections**: Drag to reorder at root level
- **Elements**: Drag to reorder within same section
- **Components**: Drag to reorder within same element
- **Conditions**: Drag to reorder within associated entity

#### 1.2 Moving Between Parents
- **Elements**: Drag from one section to another
- **Components**: Drag from one element to another
- **Conditions**: Drag to associate/disassociate with elements/components

#### 1.3 Validation Rules
```typescript
interface DragValidation {
  canDrop: (source: TreeNode, target: TreeNode) => boolean;
  getAllowedTargets: (source: TreeNode) => NodeType[];
  validateMove: (source: TreeNode, target: TreeNode) => ValidationResult;
}

// Example validation rules
const validationRules = {
  element: {
    allowedParents: ['section'],
    cannotBeChildOf: ['element', 'component', 'condition']
  },
  component: {
    allowedParents: ['element'],
    cannotBeChildOf: ['section', 'component', 'condition']
  },
  condition: {
    allowedParents: ['element', 'component'],
    cannotBeChildOf: ['section', 'condition']
  }
};
```

### 2. User Interface Design

#### 2.1 Visual Feedback
```typescript
interface DragVisualState {
  isDragging: boolean;
  draggedNode: TreeNode | null;
  dropTarget: TreeNode | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
  validDropTargets: Set<string>;
  invalidDropTargets: Set<string>;
}
```

**Visual Indicators:**
- **Drag handle**: Grip icon (⋮⋮) appears on hover
- **Dragging state**: Semi-transparent ghost element follows cursor
- **Valid drop zones**: Green highlight with dashed border
- **Invalid drop zones**: Red overlay with not-allowed cursor
- **Drop position**: Line indicator for before/after, box highlight for inside
- **Multi-select**: Checkbox mode with bulk drag capability

#### 2.2 Interaction Patterns
- **Desktop**: Click and hold drag handle to initiate drag
- **Mobile**: Long-press to enter drag mode, visual feedback for selection
- **Keyboard**: Arrow keys with modifier for moving items
- **Accessibility**: Announce drag operations to screen readers

### 3. Technical Implementation

#### 3.1 Library Selection
**Recommended: @dnd-kit/sortable**
- Modern React drag-and-drop library
- Excellent accessibility support
- Touch-friendly with mobile gestures
- Virtualization compatible
- Auto-scrolling support
- Customizable animations

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

#### 3.2 Core Components

```typescript
// New components to create
interface DragDropComponents {
  DraggableTreeNode: React.FC<{
    node: TreeNode;
    onDragStart: (node: TreeNode) => void;
    onDragEnd: (result: DropResult) => void;
  }>;
  
  DroppableContainer: React.FC<{
    parentNode: TreeNode;
    acceptTypes: NodeType[];
    onDrop: (source: TreeNode, target: TreeNode, position: DropPosition) => void;
  }>;
  
  DragOverlay: React.FC<{
    activeNode: TreeNode | null;
  }>;
  
  DropIndicator: React.FC<{
    position: 'before' | 'after' | 'inside';
    isValid: boolean;
  }>;
}
```

#### 3.3 State Management

```typescript
// Enhanced tree state with drag-drop
interface EnhancedTreeState {
  // Existing state
  nodes: TreeNode[];
  expandedNodes: Set<string>;
  searchQuery: string;
  
  // New drag-drop state
  dragState: {
    isDragging: boolean;
    activeId: string | null;
    overId: string | null;
    dropPosition: DropPosition | null;
  };
  
  // Multi-select state
  selectedNodes: Set<string>;
  selectionMode: 'single' | 'multiple';
}

// New actions for drag-drop
interface DragDropActions {
  startDrag: (nodeId: string) => void;
  updateDropTarget: (targetId: string, position: DropPosition) => void;
  completeDrop: (sourceId: string, targetId: string, position: DropPosition) => Promise<void>;
  cancelDrag: () => void;
  
  // Multi-select actions
  toggleSelection: (nodeId: string) => void;
  selectRange: (fromId: string, toId: string) => void;
  clearSelection: () => void;
  moveSelected: (targetId: string, position: DropPosition) => Promise<void>;
}
```

#### 3.4 Data Operations

```typescript
// Operations to implement in stores
interface StoreOperations {
  // Reorder within same parent
  reorderEntity: (
    entityType: EntityType,
    entityId: string,
    newOrder: number
  ) => Promise<void>;
  
  // Move to different parent
  moveEntity: (
    entityType: EntityType,
    entityId: string,
    newParentId: string,
    newOrder: number
  ) => Promise<void>;
  
  // Bulk operations
  bulkReorder: (
    entityType: EntityType,
    updates: Array<{id: string, order: number}>
  ) => Promise<void>;
  
  bulkMove: (
    entityType: EntityType,
    entityIds: string[],
    newParentId: string
  ) => Promise<void>;
  
  // Condition associations
  associateCondition: (
    conditionId: string,
    targetType: 'element' | 'component',
    targetId: string
  ) => Promise<void>;
  
  disassociateCondition: (
    conditionId: string,
    targetType: 'element' | 'component',
    targetId: string
  ) => Promise<void>;
}
```

### 4. Implementation Phases

#### Phase 1: Basic Drag and Drop (3-4 days)
- Install and configure @dnd-kit
- Create DraggableTreeNode wrapper component
- Implement reordering within same level
- Add visual feedback and animations
- Update order in backend stores

**Key Files:**
- `app/home/configuration/components/DraggableTreeNode.tsx`
- `app/home/configuration/hooks/useDragDrop.ts`
- `app/home/configuration/utils/dragValidation.ts`

#### Phase 2: Cross-Parent Movement (2-3 days)
- Implement moving between different parents
- Add validation rules for allowed moves
- Update parent relationships in stores
- Handle edge cases (circular dependencies, max depth)
- Add undo/redo capability

**Key Files:**
- `app/home/configuration/components/DroppableContainer.tsx`
- `app/home/configuration/utils/treeOperations.ts` (enhanced)
- `app/home/configuration/hooks/useTreeMutation.ts`

#### Phase 3: Multi-Select and Bulk Operations (2-3 days)
- Add checkbox selection mode
- Implement range selection (shift-click)
- Enable bulk drag of multiple items
- Add bulk action menu (move, delete, duplicate)
- Optimize performance for large selections

**Key Files:**
- `app/home/configuration/components/SelectionManager.tsx`
- `app/home/configuration/components/BulkActionBar.tsx`
- `app/home/configuration/hooks/useMultiSelect.ts`

#### Phase 4: Advanced Features (2-3 days)
- Auto-scroll when dragging near edges
- Keyboard navigation and operations
- Touch gesture support for mobile
- Accessibility announcements
- Performance optimization with virtualization

**Key Files:**
- `app/home/configuration/components/AutoScroller.tsx`
- `app/home/configuration/hooks/useKeyboardDrag.ts`
- `app/home/configuration/utils/a11y.ts`

#### Phase 5: Testing and Polish (2 days)
- Comprehensive unit tests
- Integration tests for drag operations
- Performance testing with large datasets
- Cross-browser compatibility
- Documentation and examples

### 5. User Experience Enhancements

#### 5.1 Smart Defaults
- Auto-expand target when hovering during drag
- Collapse source after moving all children
- Maintain selection after drop
- Scroll to dropped item
- Show success toast after operation

#### 5.2 Conflict Resolution
- Detect and prevent circular dependencies
- Handle concurrent edits from multiple users
- Optimistic updates with rollback on failure
- Queue operations when offline
- Merge conflicts on sync

#### 5.3 Performance Optimizations
```typescript
// Optimization strategies
const optimizations = {
  // Virtualize large lists
  virtualizeThreshold: 100,
  
  // Debounce reorder operations
  reorderDebounce: 300,
  
  // Batch database updates
  batchSize: 10,
  
  // Memoize validation checks
  memoizeValidation: true,
  
  // Lazy load drag library
  lazyLoadDragDrop: true
};
```

### 6. Mobile Considerations

#### 6.1 Touch Interactions
- **Long press** (500ms) to initiate drag
- **Haptic feedback** on selection
- **Larger drop zones** (min 48px)
- **Floating action button** for mode toggle
- **Gesture hints** on first use

#### 6.2 Responsive Behavior
```typescript
const mobileAdaptations = {
  // Simplified drag preview on mobile
  dragPreview: 'compact',
  
  // Bigger touch targets
  touchTargetSize: 48,
  
  // Disable hover effects
  hoverEffects: false,
  
  // Show drag handles always
  persistentHandles: true,
  
  // Reduce animation complexity
  reducedMotion: true
};
```

### 7. Database Schema Updates

No schema changes required - existing `order` fields sufficient:
- Sections: `order: number`
- Elements: `order: number, sectionId: string`
- Components: `order: number, elementId: string`
- Conditions: Associated via arrays on Elements/Components

**Order Recalculation Strategy:**
```typescript
// Gap-based ordering to minimize updates
const calculateNewOrder = (
  prevOrder: number | null,
  nextOrder: number | null
): number => {
  if (!prevOrder) return nextOrder ? nextOrder / 2 : 1000;
  if (!nextOrder) return prevOrder + 1000;
  return (prevOrder + nextOrder) / 2;
};

// Periodic rebalancing to prevent precision issues
const rebalanceOrders = async (
  entities: Entity[]
): Promise<void> => {
  const rebalanced = entities.map((e, i) => ({
    ...e,
    order: (i + 1) * 1000
  }));
  await bulkUpdate(rebalanced);
};
```

### 8. Success Metrics

#### 8.1 Functional Requirements
- [ ] Reorder any entity within same parent
- [ ] Move elements between sections
- [ ] Move components between elements
- [ ] Associate/disassociate conditions
- [ ] Multi-select and bulk operations
- [ ] Undo/redo support
- [ ] Offline queue with sync

#### 8.2 Performance Requirements
- [ ] Drag initiation < 100ms
- [ ] Drop feedback < 50ms
- [ ] Smooth 60fps drag animation
- [ ] Handle 500+ items without lag
- [ ] Batch updates complete < 1s

#### 8.3 Usability Requirements
- [ ] Clear visual feedback at all stages
- [ ] Intuitive drop zones
- [ ] Accessible via keyboard
- [ ] Works on touch devices
- [ ] Prevents invalid operations
- [ ] Provides operation status feedback

### 9. Risk Mitigation

#### 9.1 Technical Risks
- **Performance degradation**: Implement virtualization early
- **Complex state management**: Use proven patterns (Redux Toolkit)
- **Browser compatibility**: Test early on all target browsers
- **Mobile complexity**: Progressive enhancement approach

#### 9.2 User Experience Risks
- **Accidental moves**: Require deliberate drag distance
- **Data loss**: Implement undo/redo
- **Confusion**: Clear visual indicators and tutorials
- **Conflicts**: Optimistic locking with clear resolution

### 10. Testing Strategy

#### 10.1 Unit Tests
```typescript
// Test files to create
describe('Drag and Drop Operations', () => {
  test('validates drop targets correctly');
  test('calculates new order values');
  test('updates parent relationships');
  test('handles multi-select operations');
  test('manages undo/redo stack');
});
```

#### 10.2 Integration Tests
- Drag between all entity type combinations
- Test with offline/online transitions
- Verify sync queue behavior
- Test concurrent user scenarios
- Validate data consistency

#### 10.3 E2E Tests
- Complete user workflows
- Mobile device testing
- Keyboard navigation testing
- Screen reader compatibility
- Performance benchmarks

### 11. Documentation Requirements

- User guide with animated GIFs
- Keyboard shortcuts reference
- Video tutorial for mobile usage
- Developer documentation for extending
- Troubleshooting guide for common issues

### 12. Alternative Approaches Considered

#### 12.1 Native HTML5 Drag and Drop
- **Pros**: No library dependency, native browser support
- **Cons**: Poor mobile support, limited customization, accessibility issues
- **Decision**: Rejected due to mobile and a11y requirements

#### 12.2 React Beautiful DnD
- **Pros**: Popular, well-documented
- **Cons**: No longer maintained, lacks touch support
- **Decision**: Rejected due to maintenance concerns

#### 12.3 Custom Implementation
- **Pros**: Full control, optimized for use case
- **Cons**: High development effort, accessibility complexity
- **Decision**: Rejected due to time constraints

### 13. Implementation Checklist

#### Pre-Development
- [ ] Review and approve feature plan
- [ ] Set up @dnd-kit dependencies
- [ ] Create feature branch
- [ ] Set up test environment

#### Development - Phase 1
- [ ] Create DraggableTreeNode component
- [ ] Implement basic reordering
- [ ] Add visual feedback
- [ ] Update stores with reorder logic
- [ ] Write unit tests

#### Development - Phase 2
- [ ] Implement cross-parent moves
- [ ] Add validation rules
- [ ] Handle edge cases
- [ ] Add undo/redo
- [ ] Write integration tests

#### Development - Phase 3
- [ ] Add multi-select capability
- [ ] Implement bulk operations
- [ ] Create bulk action UI
- [ ] Optimize performance
- [ ] Test with large datasets

#### Development - Phase 4
- [ ] Add auto-scroll
- [ ] Implement keyboard support
- [ ] Enhance mobile experience
- [ ] Add accessibility features
- [ ] Cross-browser testing

#### Post-Development
- [ ] Code review
- [ ] Performance audit
- [ ] Security review
- [ ] Documentation complete
- [ ] User acceptance testing
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production

This comprehensive plan builds upon the existing hierarchical configuration view to add intuitive drag-and-drop capabilities while maintaining data integrity, performance, and accessibility standards.