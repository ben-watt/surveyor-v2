import { TreeNode } from '../hooks/useHierarchicalData';

export type NodeType = 'section' | 'element' | 'component' | 'condition';
export type DropPosition = 'before' | 'after' | 'inside';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface DragItem {
  id: string;
  type: NodeType;
  parentId?: string;
  index: number;
}

// Validation rules for each entity type
const validationRules: Record<
  NodeType,
  {
    allowedParents: NodeType[];
    cannotBeChildOf: NodeType[];
    canReorder: boolean;
  }
> = {
  section: {
    allowedParents: [],
    cannotBeChildOf: ['section', 'element', 'component', 'condition'],
    canReorder: true,
  },
  element: {
    allowedParents: ['section'],
    cannotBeChildOf: ['element', 'component', 'condition'],
    canReorder: true,
  },
  component: {
    allowedParents: ['element'],
    cannotBeChildOf: ['section', 'component', 'condition'],
    canReorder: true,
  },
  condition: {
    allowedParents: ['component'],
    cannotBeChildOf: ['section', 'element', 'condition'],
    canReorder: true,
  },
};

// Check if a node can be dropped at a specific position relative to a target
export function canDrop(
  source: TreeNode,
  target: TreeNode,
  position: DropPosition,
): ValidationResult {
  // Can't drop on itself
  if (source.id === target.id) {
    return { isValid: false, reason: 'Cannot drop item on itself' };
  }

  // Check if source is an ancestor of target (prevent circular dependencies)
  if (isAncestor(source, target)) {
    return { isValid: false, reason: 'Cannot move parent into its own child' };
  }

  const sourceType = source.type;
  const targetType = target.type;
  const rules = validationRules[sourceType];

  if (position === 'inside') {
    // Dropping inside means target becomes parent
    if (!rules.allowedParents.includes(targetType)) {
      return {
        isValid: false,
        reason: `${capitalize(sourceType)} cannot be placed inside ${capitalize(targetType)}`,
      };
    }
  } else {
    // Dropping before/after means they share the same parent
    // For sections, parent is root (null)
    if (sourceType === 'section' && targetType !== 'section') {
      return { isValid: false, reason: 'Sections can only be reordered at root level' };
    }

    if (sourceType !== 'section' && targetType === 'section') {
      return { isValid: false, reason: `${capitalize(sourceType)} cannot be placed at root level` };
    }

    // For other types, they must be siblings (same type)
    if (sourceType !== targetType && sourceType !== 'section') {
      return {
        isValid: false,
        reason: `Can only reorder ${sourceType}s with other ${sourceType}s`,
      };
    }
  }

  return { isValid: true };
}

// Check if source node is an ancestor of target node
function isAncestor(source: TreeNode, target: TreeNode): boolean {
  const checkChildren = (node: TreeNode): boolean => {
    if (node.id === target.id) return true;
    return node.children.some((child) => checkChildren(child));
  };

  return source.children.some((child) => checkChildren(child));
}

// Get all valid drop targets for a given source node
export function getValidDropTargets(source: TreeNode, allNodes: TreeNode[]): Set<string> {
  const validTargets = new Set<string>();

  const checkNode = (node: TreeNode) => {
    // Check if can drop inside
    if (canDrop(source, node, 'inside').isValid) {
      validTargets.add(node.id);
    }

    // Check children recursively
    node.children.forEach(checkNode);
  };

  allNodes.forEach(checkNode);
  return validTargets;
}

// Calculate the new order value for an item being moved
export function calculateNewOrder(prevOrder: number | null, nextOrder: number | null): number {
  // Use gap-based ordering to minimize updates
  if (!prevOrder) return nextOrder ? nextOrder / 2 : 1000;
  if (!nextOrder) return prevOrder + 1000;
  return (prevOrder + nextOrder) / 2;
}

// Rebalance order values to prevent precision issues
export function rebalanceOrders<T extends { order?: number }>(entities: T[]): T[] {
  return entities
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((entity, index) => ({
      ...entity,
      order: (index + 1) * 1000,
    }));
}

// Helper to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Get the parent ID for a drop operation
export function getDropParentId(
  target: TreeNode,
  position: DropPosition,
  targetParentId?: string,
): string | undefined {
  if (position === 'inside') {
    // Dropping inside target makes target the parent
    return target.id;
  } else {
    // Dropping before/after target means same parent as target
    return targetParentId;
  }
}

// Get siblings for reordering
export function getSiblings(node: TreeNode, allNodes: TreeNode[], parentId?: string): TreeNode[] {
  if (!parentId) {
    // Root level - return all sections
    return allNodes.filter((n) => n.type === 'section');
  }

  // Find parent and return its children of the same type
  const findParent = (nodes: TreeNode[]): TreeNode | null => {
    for (const n of nodes) {
      if (n.id === parentId) return n;
      const found = findParent(n.children);
      if (found) return found;
    }
    return null;
  };

  const parent = findParent(allNodes);
  if (!parent) return [];

  return parent.children.filter((child) => child.type === node.type);
}

// Calculate new order for all affected items after a drag operation
export function calculateReorderedItems<T extends { id: string; order?: number }>(
  items: T[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'after',
): Array<{ id: string; order: number }> {
  const sortedItems = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
  const draggedIndex = sortedItems.findIndex((item) => item.id === draggedId);
  const targetIndex = sortedItems.findIndex((item) => item.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) return [];

  // Remove dragged item and reinsert at new position
  const [draggedItem] = sortedItems.splice(draggedIndex, 1);
  const newIndex =
    position === 'before'
      ? draggedIndex < targetIndex
        ? targetIndex - 1
        : targetIndex
      : draggedIndex < targetIndex
        ? targetIndex
        : targetIndex + 1;

  sortedItems.splice(newIndex, 0, draggedItem);

  // Return items with new order values
  return sortedItems.map((item, index) => ({
    id: item.id,
    order: (index + 1) * 1000,
  }));
}
