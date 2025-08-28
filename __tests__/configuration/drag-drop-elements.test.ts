import { renderHook, act, waitFor } from '@testing-library/react';
import { useDragDrop } from '@/app/home/configuration/hooks/useDragDrop';
import { TreeNode } from '@/app/home/configuration/hooks/useHierarchicalData';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { calculateReorderedItems } from '@/app/home/configuration/utils/dragValidation';
import { createMockTreeNode, createDragStartEvent, createDragEndEvent, createDragOverEvent } from '@/test-utils/drag-drop-utils';

// Mock toast to avoid errors
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe('Drag and Drop - Element Reordering within Section', () => {
  // Test data structure with a section containing multiple elements
  const mockTreeData: TreeNode[] = [
    createMockTreeNode('section-1', 'Test Section', 'section', 1000, [
      createMockTreeNode('element-1', 'Element 1', 'element', 1000),
      createMockTreeNode('element-2', 'Element 2', 'element', 2000),
      createMockTreeNode('element-3', 'Element 3', 'element', 3000),
    ]),
  ];
  
  // Update the expanded state
  mockTreeData[0].isExpanded = true;

  const mockOnReorder = jest.fn().mockResolvedValue(undefined);
  const mockOnMove = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateReorderedItems utility', () => {
    it('should correctly calculate new orders when moving element before another', () => {
      const items = [
        { id: 'element-1', order: 1000 },
        { id: 'element-2', order: 2000 },
        { id: 'element-3', order: 3000 },
      ];

      const result = calculateReorderedItems(items, 'element-3', 'element-1', 'before');
      
      expect(result).toEqual([
        { id: 'element-3', order: 1000 },
        { id: 'element-1', order: 2000 },
        { id: 'element-2', order: 3000 },
      ]);
    });

    it('should correctly calculate new orders when moving element after another', () => {
      const items = [
        { id: 'element-1', order: 1000 },
        { id: 'element-2', order: 2000 },
        { id: 'element-3', order: 3000 },
      ];

      const result = calculateReorderedItems(items, 'element-1', 'element-3', 'after');
      
      expect(result).toEqual([
        { id: 'element-2', order: 1000 },
        { id: 'element-3', order: 2000 },
        { id: 'element-1', order: 3000 },
      ]);
    });
  });

  describe('useDragDrop hook - Element reordering', () => {
    it('should initiate drag state when starting to drag an element', () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        })
      );

      const dragStartEvent = createDragStartEvent('element-2');

      act(() => {
        result.current.handleDragStart(dragStartEvent);
      });

      expect(result.current.dragState.isDragging).toBe(true);
      expect(result.current.dragState.activeId).toBe('element-2');
      expect(result.current.dragState.activeNode?.name).toBe('Element 2');
      expect(result.current.dragState.activeNode?.type).toBe('element');
    });

    it('should identify valid drop targets for elements within the same section', () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        })
      );

      const dragStartEvent = createDragStartEvent('element-2');

      act(() => {
        result.current.handleDragStart(dragStartEvent);
      });

      // Elements within the same section should be valid drop targets for reordering
      expect(result.current.dragState.validDropTargets.has('element-1')).toBe(true);
      expect(result.current.dragState.validDropTargets.has('element-3')).toBe(true);
      
      // The element being dragged should not be a valid target for itself
      expect(result.current.dragState.validDropTargets.has('element-2')).toBe(false);
    });

    it('should handle drag over event and update drop position', () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        })
      );

      // Start dragging element-2
      act(() => {
        result.current.handleDragStart({
          active: { id: 'element-2' },
        } as DragStartEvent);
      });

      // Simulate dragging over element-1
      const dragOverEvent = createDragOverEvent(
        'element-2',
        'element-1',
        { top: 100, bottom: 150, height: 50, left: 0, right: 100, width: 100 },
        110 // Near top, should be 'before'
      );

      act(() => {
        result.current.handleDragOver(dragOverEvent);
      });

      expect(result.current.dragState.overId).toBe('element-1');
      expect(result.current.dragState.overNode?.id).toBe('element-1');
    });

    it('should successfully reorder elements when dropping', async () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        })
      );

      // Start dragging element-3
      act(() => {
        result.current.handleDragStart(createDragStartEvent('element-3'));
      });

      // Drop element-3 before element-1
      const dragEndEvent = createDragEndEvent(
        'element-3',
        'element-1',
        { top: 100, bottom: 150, height: 50, left: 0, right: 100, width: 100 },
        110 // Near top, should be 'before'
      );

      await act(async () => {
        await result.current.handleDragEnd(dragEndEvent);
      });

      // Verify onReorder was called with correct updates
      expect(mockOnReorder).toHaveBeenCalledTimes(1);
      expect(mockOnReorder).toHaveBeenCalledWith([
        { id: 'element-3', order: 1000 },
        { id: 'element-1', order: 2000 },
        { id: 'element-2', order: 3000 },
      ]);

      // Verify drag state is reset
      expect(result.current.dragState.isDragging).toBe(false);
      expect(result.current.dragState.activeId).toBeNull();
    });

    it('should handle dropping element after another element', async () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        })
      );

      // Start dragging element-1
      act(() => {
        result.current.handleDragStart(createDragStartEvent('element-1'));
      });

      // Drop element-1 after element-2
      const dragEndEvent = createDragEndEvent(
        'element-1',
        'element-2',
        { top: 100, bottom: 150, height: 50, left: 0, right: 100, width: 100 },
        140 // Near bottom, should be 'after'
      );

      await act(async () => {
        await result.current.handleDragEnd(dragEndEvent);
      });

      // Verify onReorder was called with correct updates
      expect(mockOnReorder).toHaveBeenCalledTimes(1);
      expect(mockOnReorder).toHaveBeenCalledWith([
        { id: 'element-2', order: 1000 },
        { id: 'element-1', order: 2000 },
        { id: 'element-3', order: 3000 },
      ]);
    });

    it('should not allow dropping element on itself', async () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        })
      );

      // Start dragging element-2
      act(() => {
        result.current.handleDragStart({
          active: { id: 'element-2' },
        } as DragStartEvent);
      });

      // Try to drop element-2 on itself  
      const dragEndEvent = createDragEndEvent(
        'element-2',
        'element-2',
        { top: 100, bottom: 150, height: 50, left: 0, right: 100, width: 100 },
        125
      );

      await act(async () => {
        await result.current.handleDragEnd(dragEndEvent);
      });

      // Verify onReorder was NOT called
      expect(mockOnReorder).not.toHaveBeenCalled();
      expect(mockOnMove).not.toHaveBeenCalled();
    });

    it('should handle edge case with multiple elements in different sections', async () => {
      const multiSectionData: TreeNode[] = [
        createMockTreeNode('section-1', 'Section 1', 'section', 1000, [
          createMockTreeNode('element-1-1', 'Element 1-1', 'element', 1000),
          createMockTreeNode('element-1-2', 'Element 1-2', 'element', 2000),
        ]),
        createMockTreeNode('section-2', 'Section 2', 'section', 2000, [
          createMockTreeNode('element-2-1', 'Element 2-1', 'element', 1000),
        ]),
      ];
      multiSectionData[0].isExpanded = true;
      multiSectionData[1].isExpanded = true;

      const { result } = renderHook(() =>
        useDragDrop({
          nodes: multiSectionData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        })
      );

      // Start dragging element from section 1
      act(() => {
        result.current.handleDragStart(createDragStartEvent('element-1-2'));
      });

      // Should identify valid targets in same section
      expect(result.current.dragState.validDropTargets.has('element-1-1')).toBe(true);
      
      // Should identify section-2 as valid drop target (to move element into it)
      expect(result.current.dragState.validDropTargets.has('section-2')).toBe(true);
      
      // Elements in different section should NOT be valid targets for reordering
      expect(result.current.dragState.validDropTargets.has('element-2-1')).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle failed reorder operations gracefully', async () => {
      const failingOnReorder = jest.fn().mockRejectedValue(new Error('Reorder failed'));
      
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: failingOnReorder,
          onMove: mockOnMove,
        })
      );

      // Start dragging
      act(() => {
        result.current.handleDragStart({
          active: { id: 'element-2' },
        } as DragStartEvent);
      });

      // Try to complete drag
      const dragEndEvent = createDragEndEvent(
        'element-2',
        'element-1',
        { top: 100, bottom: 150, height: 50, left: 0, right: 100, width: 100 },
        110
      );

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      await act(async () => {
        await result.current.handleDragEnd(dragEndEvent);
      });

      console.error = originalError;

      // Verify drag state is reset even after error
      expect(result.current.dragState.isDragging).toBe(false);
      expect(failingOnReorder).toHaveBeenCalled();
    });
  });
});