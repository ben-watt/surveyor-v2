import { TreeNode } from '@/app/home/configuration/hooks/useHierarchicalData';
import { DragStartEvent, DragEndEvent, DragOverEvent, Active, Over } from '@dnd-kit/core';

// Create proper mock data that satisfies TypeScript
export const createMockTreeNode = (
  id: string,
  name: string,
  type: 'section' | 'element' | 'component' | 'condition',
  order: number,
  children: TreeNode[] = []
): TreeNode => ({
  id,
  name,
  type,
  data: {
    id,
    name,
    order,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced',
    type,
    sectionId: type === 'element' ? 'section-1' : undefined,
    elementId: type === 'component' ? 'element-1' : undefined,
  } as any,
  children,
  isExpanded: false,
});

// Helper to create drag events with proper types
export const createDragStartEvent = (activeId: string): DragStartEvent => ({
  active: {
    id: activeId,
    data: {
      current: undefined,
    },
    rect: {
      current: {
        initial: null,
        translated: null,
      },
    },
  } as Active,
  activatorEvent: new MouseEvent('mousedown'),
} as DragStartEvent);

export const createDragEndEvent = (
  activeId: string,
  overId: string,
  rect: { top: number; bottom: number; height: number; left: number; right: number; width: number },
  clientY: number
): DragEndEvent => ({
  active: {
    id: activeId,
    data: {
      current: undefined,
    },
    rect: {
      current: {
        initial: null,
        translated: null,
      },
    },
  } as Active,
  over: {
    id: overId,
    rect,
    data: {
      current: undefined,
    },
    disabled: false,
  } as Over,
  activatorEvent: new MouseEvent('mouseup', { clientY }),
  delta: { x: 0, y: 0 },
  collisions: null,
});

export const createDragOverEvent = (
  activeId: string,
  overId: string,
  rect: { top: number; bottom: number; height: number; left: number; right: number; width: number },
  clientY: number
): DragOverEvent => ({
  active: {
    id: activeId,
    data: {
      current: undefined,
    },
    rect: {
      current: {
        initial: null,
        translated: null,
      },
    },
  } as Active,
  over: {
    id: overId,
    rect,
    data: {
      current: undefined,
    },
    disabled: false,
  } as Over,
  activatorEvent: new MouseEvent('mousemove', { clientY }),
  delta: { x: 0, y: 0 },
  collisions: null,
});