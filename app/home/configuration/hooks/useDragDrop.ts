import { useState, useCallback } from 'react';
import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { TreeNode } from './useHierarchicalData';
import { 
  canDrop, 
  DropPosition, 
  getDropParentId,
  calculateReorderedItems,
  NodeType 
} from '../utils/dragValidation';
import toast from 'react-hot-toast';

export interface DragState {
  isDragging: boolean;
  activeId: string | null;
  activeNode: TreeNode | null;
  overId: string | null;
  overNode: TreeNode | null;
  dropPosition: DropPosition | null;
  validDropTargets: Set<string>;
}

export interface UseDragDropProps {
  nodes: TreeNode[];
  onReorder: (updates: Array<{ id: string; order: number }>) => Promise<void>;
  onMove: (nodeId: string, newParentId: string | undefined, order: number) => Promise<void>;
}

export function useDragDrop({ nodes, onReorder, onMove }: UseDragDropProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    activeId: null,
    activeNode: null,
    overId: null,
    overNode: null,
    dropPosition: null,
    validDropTargets: new Set(),
  });

  // Find a node by ID in the tree
  const findNode = useCallback((nodeId: string, searchNodes: TreeNode[] = nodes): TreeNode | null => {
    for (const node of searchNodes) {
      if (node.id === nodeId) return node;
      const found = findNode(nodeId, node.children);
      if (found) return found;
    }
    return null;
  }, [nodes]);

  // Get the parent of a node
  const getParentNode = useCallback((nodeId: string, searchNodes: TreeNode[] = nodes): TreeNode | null => {
    for (const node of searchNodes) {
      if (node.children.some(child => child.id === nodeId)) {
        return node;
      }
      const found = getParentNode(nodeId, node.children);
      if (found) return found;
    }
    return null;
  }, [nodes]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeNode = findNode(active.id as string);
    
    if (!activeNode) return;

    // Calculate valid drop targets
    const validTargets = new Set<string>();
    const checkValidTargets = (checkNodes: TreeNode[]) => {
      checkNodes.forEach(node => {
        // Check if can drop inside this node
        if (canDrop(activeNode, node, 'inside').isValid) {
          validTargets.add(node.id);
        }
        // Check if can drop before/after siblings
        if (activeNode.type === node.type && activeNode.id !== node.id) {
          const parent = getParentNode(node.id);
          if (parent?.id === getParentNode(activeNode.id)?.id || 
              (activeNode.type === 'section' && node.type === 'section')) {
            validTargets.add(node.id);
          }
        }
        checkValidTargets(node.children);
      });
    };
    checkValidTargets(nodes);

    setDragState({
      isDragging: true,
      activeId: active.id as string,
      activeNode,
      overId: null,
      overNode: null,
      dropPosition: null,
      validDropTargets: validTargets,
    });
  }, [findNode, getParentNode, nodes]);

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (!over || !dragState.activeNode) return;

    // Check if we're over a drop zone
    const overData = over.data?.current;
    if (overData?.type === 'dropzone') {
      setDragState(prev => ({
        ...prev,
        overId: over.id as string,
        overNode: null,
        dropPosition: overData.position as 'before' | 'after',
      }));
      return;
    }

    const overNode = findNode(over.id as string);
    if (!overNode) return;

    // Determine drop position based on cursor position
    const dropPosition = determineDropPosition(event, overNode);
    
    setDragState(prev => ({
      ...prev,
      overId: over.id as string,
      overNode,
      dropPosition,
    }));
  }, [dragState.activeNode, findNode]);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !dragState.activeNode) {
      resetDragState();
      return;
    }

    // Check if we're dropping on a drop zone
    const overData = over.data?.current;
    if (overData?.type === 'dropzone') {
      try {
        await handleDropZoneDrop(dragState.activeNode, overData);
        toast.success(`${dragState.activeNode.name} moved successfully`);
      } catch (error) {
        console.error('Failed to complete drop zone operation:', error);
        toast.error("Failed to move item. Please try again.");
      }
      resetDragState();
      return;
    }

    const overNode = findNode(over.id as string);
    if (!overNode) {
      resetDragState();
      return;
    }

    const dropPosition = determineDropPosition(event, overNode);
    const validation = canDrop(dragState.activeNode, overNode, dropPosition);
    
    if (!validation.isValid) {
      // Special case: moving across parents by dropping on a sibling in a different container
      const source = dragState.activeNode;
      const sourceParent = getParentNode(source.id);
      const targetParent = getParentNode(overNode.id);
      const isSameType = source.type === overNode.type;
      const isSameParent = sourceParent?.id === targetParent?.id;
      const isSiblingPosition = dropPosition === 'before' || dropPosition === 'after';
      if (isSameType && !isSameParent && isSiblingPosition && targetParent) {
        try {
          // Compute a new order near the target inside targetParent
          const siblings = targetParent.children.filter(child => child.type === source.type);
          const targetIdx = siblings.findIndex(s => s.id === overNode.id);
          const targetOrder = (overNode.data as any).order || 0;
          const prevOrder = targetIdx > 0 ? ((siblings[targetIdx - 1].data as any).order || 0) : null;
          const nextOrder = targetIdx < siblings.length - 1 ? ((siblings[targetIdx + 1].data as any).order || 0) : null;

          let newOrder = targetOrder;
          if (dropPosition === 'before') {
            newOrder = prevOrder !== null && prevOrder !== undefined ? (prevOrder + targetOrder) / 2 : targetOrder - 1000;
          } else {
            newOrder = nextOrder !== null && nextOrder !== undefined ? (targetOrder + nextOrder) / 2 : targetOrder + 1000;
          }

          await onMove(source.id, targetParent.id, newOrder);
          toast.success(`${source.name} moved successfully`);
        } catch (error) {
          console.error('Failed to move item across parents:', error);
          toast.error('Failed to move item. Please try again.');
        }
        resetDragState();
        return;
      }

      toast.error(validation.reason || "Invalid drop location");
      resetDragState();
      return;
    }

    try {
      const source = dragState.activeNode;
      const sourceParent = getParentNode(source.id);
      const targetParent = getParentNode(overNode.id);

      // Cross-parent reorder via before/after on a target in another container → treat as move
      const isCrossParentSiblingDrop =
        (dropPosition === 'before' || dropPosition === 'after') &&
        source.type === overNode.type &&
        (sourceParent?.id !== targetParent?.id) && !!targetParent;

      if (isCrossParentSiblingDrop && targetParent) {
        const siblings = targetParent.children.filter(child => child.type === source.type);
        const targetIdx = siblings.findIndex(s => s.id === overNode.id);
        const targetOrder = (overNode.data as any).order || 0;
        const prevOrder = targetIdx > 0 ? ((siblings[targetIdx - 1].data as any).order || 0) : null;
        const nextOrder = targetIdx < siblings.length - 1 ? ((siblings[targetIdx + 1].data as any).order || 0) : null;
        let newOrder = targetOrder;
        if (dropPosition === 'before') {
          newOrder = prevOrder !== null && prevOrder !== undefined ? (prevOrder + targetOrder) / 2 : targetOrder - 1000;
        } else {
          newOrder = nextOrder !== null && nextOrder !== undefined ? (targetOrder + nextOrder) / 2 : targetOrder + 1000;
        }
        await onMove(source.id, targetParent.id, newOrder);
      } else if (dropPosition === 'inside') {
        // Moving to a new parent
        await handleMoveToNewParent(source, overNode);
      } else {
        // Reordering within same parent
        await handleReorderSiblings(source, overNode, dropPosition);
      }
      
      toast.success(`${dragState.activeNode.name} moved successfully`);
    } catch (error) {
      console.error('Failed to complete drag operation:', error);
      toast.error("Failed to move item. Please try again.");
    }

    resetDragState();
  }, [dragState.activeNode, findNode]);

  // Handle dropping on a drop zone
  const handleDropZoneDrop = async (source: TreeNode, dropZoneData: any) => {
    const { position, parentType, parentId } = dropZoneData;
    
    // Calculate the order based on position and existing siblings
    let siblings: TreeNode[] = [];
    let newParentId: string | undefined = parentId;
    let order: number;
    
    if (parentType === 'root') {
      // Dropping at root level (sections)
      if (source.type !== 'section') {
        throw new Error('Only sections can be placed at root level');
      }
      siblings = nodes.filter(n => n.type === 'section');
    } else if (parentType === 'section') {
      // Dropping in a section (elements)
      if (source.type !== 'element') {
        throw new Error('Only elements can be placed in sections');
      }
      const parentNode = findNode(parentId);
      if (parentNode) {
        siblings = parentNode.children.filter(child => child.type === 'element');
      }
    } else if (parentType === 'element') {
      // Dropping in an element (components)
      if (source.type !== 'component') {
        throw new Error('Only components can be placed in elements');
      }
      const parentNode = findNode(parentId);
      if (parentNode) {
        siblings = parentNode.children.filter(child => child.type === 'component');
      }
    } else if (parentType === 'component') {
      // Dropping in a component (conditions)
      if (source.type !== 'condition') {
        throw new Error('Only conditions can be placed in components');
      }
      const parentNode = findNode(parentId);
      if (parentNode) {
        siblings = parentNode.children.filter(child => child.type === 'condition');
      }
    }
    
    // Calculate order based on position
    if (position === 'top' || siblings.length === 0) {
      order = siblings.length > 0 
        ? Math.min(...siblings.map(s => (s.data as any).order || 0)) - 1000
        : 1000;
    } else { // position === 'bottom'
      order = siblings.length > 0
        ? Math.max(...siblings.map(s => (s.data as any).order || 0)) + 1000
        : 1000;
    }
    
    // Ensure order is positive
    if (order <= 0) {
      order = 1000;
    }
    
    // Execute the move
    if (source.type === 'section') {
      // Reorder section
      const updates = [{ id: source.id, order, type: 'section' as const }];
      await onReorder(updates);
    } else if (source.type === 'element' || source.type === 'component' || source.type === 'condition') {
      // Move to new parent
      await onMove(source.id, newParentId, order);
    } else {
      // No-op for unknown types
    }
  };

  // Handle moving to a new parent
  const handleMoveToNewParent = async (source: TreeNode, target: TreeNode) => {
    const newParentId = target.id;
    
    // Get existing children of target to calculate order
    const existingChildren = target.children.filter(child => child.type === source.type);
    const newOrder = existingChildren.length > 0
      ? Math.max(...existingChildren.map(c => (c.data as any).order || 0)) + 1000
      : 1000;
    
    await onMove(source.id, newParentId, newOrder);
  };

  // Handle reordering siblings
  const handleReorderSiblings = async (
    source: TreeNode, 
    target: TreeNode, 
    position: 'before' | 'after'
  ) => {
    const sourceParent = getParentNode(source.id);
    const targetParent = getParentNode(target.id);
    
    // Get siblings of the same type
    let siblings: TreeNode[];
    if (source.type === 'section') {
      siblings = nodes.filter(n => n.type === 'section');
    } else if (sourceParent) {
      siblings = sourceParent.children.filter(child => child.type === source.type);
    } else {
      return;
    }
    
    // Calculate new orders
    const items = siblings.map(s => ({
      id: s.id,
      order: (s.data as any).order || 0,
    }));
    
    const updates = calculateReorderedItems(items, source.id, target.id, position);
    await onReorder(updates);
  };

  // Reset drag state
  const resetDragState = () => {
    setDragState({
      isDragging: false,
      activeId: null,
      activeNode: null,
      overId: null,
      overNode: null,
      dropPosition: null,
      validDropTargets: new Set(),
    });
  };

  // Determine drop position based on cursor position
  const determineDropPosition = (event: DragOverEvent | DragEndEvent, overNode: TreeNode): DropPosition => {
    const activeNode = dragState.activeNode;
    if (!activeNode) return 'after';

    // Prefer rects provided by DnD Kit to avoid relying on the initial activator event
    const overRect = event.over?.rect;
    const activeRect = (event as any).active?.rect?.current?.translated || (event as any).active?.rect?.current?.initial;
    const pointerY = activeRect
      ? (activeRect.top + activeRect.height / 2)
      : ((event as any).activatorEvent?.clientY as number | undefined);

    // Check if dragging over a sibling (same parent and type)
    const activeParent = getParentNode(activeNode.id);
    const overParent = getParentNode(overNode.id);
    const areSiblings = activeParent?.id === overParent?.id && activeNode.type === overNode.type;

    // For root-level sections, they are siblings if both are sections
    const areRootSiblings = !activeParent && !overParent && activeNode.type === 'section' && overNode.type === 'section';

    if ((areSiblings || areRootSiblings) && overRect) {
      const overMidY = overRect.top + overRect.height / 2;
      if (pointerY !== undefined) {
        return pointerY < overMidY ? 'before' : 'after';
      }
    }

    // Force 'inside' when dragging into valid container headers to avoid invalid before/after
    if (
      (activeNode.type === 'element' && overNode.type === 'section') ||
      (activeNode.type === 'component' && overNode.type === 'element') ||
      (activeNode.type === 'condition' && overNode.type === 'component')
    ) {
      return 'inside';
    }

    // For non-siblings, check if can drop inside containers
    if ((overNode.type === 'section' || overNode.type === 'element' || (overNode.type === 'component' && activeNode.type === 'condition')) && overRect) {
      const validation = canDrop(activeNode, overNode, 'inside');
      if (validation.isValid) {
        const threshold = overRect.height * 0.25;
        if (pointerY !== undefined) {
          if (pointerY < overRect.top + threshold) return 'before';
          if (pointerY > overRect.bottom - threshold) return 'after';
          return 'inside';
        }
      }
    }

    // Fallback to before/after based on midpoints
    if (overRect && pointerY !== undefined) {
      const overMidY = overRect.top + overRect.height / 2;
      return pointerY < overMidY ? 'before' : 'after';
    }

    return 'after';
  };

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    findNode,
    getParentNode,
  };
}