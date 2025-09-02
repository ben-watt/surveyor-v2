import React from 'react';
import { render, screen } from '@testing-library/react';
import DraggableTreeNode from '@/app/home/configuration/components/DraggableTreeNode';
import { createMockTreeNode } from '@/test-utils/drag-drop-utils';
import { DragState } from '@/app/home/configuration/hooks/useDragDrop';

// Mock Next.js app router hooks used by ConfigTreeNode
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useSortable to avoid requiring full DnD context
jest.mock('@dnd-kit/sortable', () => {
  const actual = jest.requireActual('@dnd-kit/sortable');
  return {
    ...actual,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      transition: null,
      isDragging: false,
      isOver: false,
    }),
    SortableContext: ({ children }: any) => <div>{children}</div>,
    verticalListSortingStrategy: jest.fn(),
  };
});

describe('DraggableTreeNode collapse behavior during drag', () => {
  const baseDragState: DragState = {
    isDragging: true,
    activeId: null,
    activeNode: null,
    overId: null,
    overNode: null,
    dropPosition: null,
    validDropTargets: new Set(),
  };

  it('keeps parent expanded when hovered during drag (parent should not collapse)', () => {
    const elementChild = createMockTreeNode('element-1', 'Element 1', 'element', 1000);
    const section = createMockTreeNode('section-1', 'Section 1', 'section', 1000, [elementChild]);
    section.isExpanded = true;

    render(
      <DraggableTreeNode
        node={section}
        depth={0}
        isExpanded={true}
        onToggle={() => {}}
        searchQuery=""
        isDragEnabled={true}
        dragState={{ ...baseDragState, activeId: 'element-1', overId: 'section-1' }}
      />
    );

    // The child should still be visible because the parent remains expanded
    expect(screen.getByText('Element 1')).toBeInTheDocument();
  });

  it('collapses only the active dragged node (its children are hidden)', () => {
    const componentChild = createMockTreeNode('component-1', 'Comp 1', 'component', 1000);
    const element = createMockTreeNode('element-1', 'Element 1', 'element', 1000, [componentChild]);
    element.isExpanded = true;

    render(
      <DraggableTreeNode
        node={element}
        depth={0}
        isExpanded={true}
        onToggle={() => {}}
        searchQuery=""
        isDragEnabled={true}
        dragState={{ ...baseDragState, activeId: 'element-1' }}
      />
    );

    // Header should be visible
    expect(screen.getByText('Element 1')).toBeInTheDocument();
    // Child content should be hidden while dragging the node itself
    expect(screen.queryByText('Comp 1')).not.toBeInTheDocument();
  });
});


