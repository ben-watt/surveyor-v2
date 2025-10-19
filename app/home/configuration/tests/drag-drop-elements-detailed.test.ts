import { renderHook, act } from '@testing-library/react';
import { useDragDrop } from '@/app/home/configuration/hooks/useDragDrop';
import { TreeNode } from '@/app/home/configuration/hooks/useHierarchicalData';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { canDrop } from '@/app/home/configuration/utils/dragValidation';
import {
  createMockTreeNode,
  createDragStartEvent,
  createDragEndEvent,
} from './utils/drag-drop-utils';

// Mock toast to capture error messages
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const toast = require('react-hot-toast');

describe('Drag and Drop - Element Reordering Issue Analysis', () => {
  const mockTreeData: TreeNode[] = [
    createMockTreeNode('section-1', 'Test Section', 'section', 1000, [
      createMockTreeNode('element-1', 'Element 1', 'element', 1000),
      createMockTreeNode('element-2', 'Element 2', 'element', 2000),
    ]),
  ];
  mockTreeData[0].isExpanded = true;

  const mockOnReorder = jest.fn().mockResolvedValue(undefined);
  const mockOnMove = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Root Cause Analysis', () => {
    it('should demonstrate that element cannot be dropped "inside" another element', () => {
      const element1: TreeNode = mockTreeData[0].children[0];
      const element2: TreeNode = mockTreeData[0].children[1];

      // Test validation for dropping element inside another element
      const insideValidation = canDrop(element1, element2, 'inside');
      expect(insideValidation.isValid).toBe(false);
      expect(insideValidation.reason).toContain('Element cannot be placed inside Element');

      // Test validation for dropping element before/after another element
      const beforeValidation = canDrop(element1, element2, 'before');
      expect(beforeValidation.isValid).toBe(true);

      const afterValidation = canDrop(element1, element2, 'after');
      expect(afterValidation.isValid).toBe(true);
    });

    it('should now work correctly: elements can be reordered as siblings', async () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        }),
      );

      // Start dragging element-1
      act(() => {
        result.current.handleDragStart(createDragStartEvent('element-1'));
      });

      // Drop element-1 on element-2 WITH proper rect data
      const dragEndEvent = createDragEndEvent(
        'element-1',
        'element-2',
        { top: 100, bottom: 150, height: 50, left: 0, right: 100, width: 100 },
        140, // After midpoint (125), should be 'after'
      );

      await act(async () => {
        await result.current.handleDragEnd(dragEndEvent);
      });

      // The operation should succeed with the fix
      expect(mockOnReorder).toHaveBeenCalled();
      expect(mockOnMove).not.toHaveBeenCalled();

      // No error should be thrown
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should show the problem: missing rect data causes incorrect drop position', async () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        }),
      );

      // Start dragging element-2
      act(() => {
        result.current.handleDragStart(createDragStartEvent('element-2'));
      });

      // Drop with proper rect data to simulate 'before' position
      const dragEndEventWithRect = createDragEndEvent(
        'element-2',
        'element-1',
        { top: 100, bottom: 150, height: 50, left: 0, right: 100, width: 100 },
        120, // At midpoint (125) - 5, should be 'before'
      );

      await act(async () => {
        await result.current.handleDragEnd(dragEndEventWithRect);
      });

      // This should now work with the fix - elements can be reordered as siblings
      expect(mockOnReorder).toHaveBeenCalled();
    });

    it('should work when cursor position indicates before/after for siblings', async () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        }),
      );

      // Start dragging element-2
      act(() => {
        result.current.handleDragStart(createDragStartEvent('element-2'));
      });

      // Drop with cursor position to indicate 'before'
      const dragEndEvent = createDragEndEvent(
        'element-2',
        'element-1',
        { top: 100, bottom: 150, height: 50, left: 0, right: 100, width: 100 },
        110, // Less than midpoint (125), should be 'before'
      );

      await act(async () => {
        await result.current.handleDragEnd(dragEndEvent);
      });

      // This should work because siblings are detected and position is determined by midpoint
      expect(mockOnReorder).toHaveBeenCalled();
    });
  });

  describe('Expected Behavior', () => {
    it('should allow element reordering when siblings in same section', async () => {
      const { result } = renderHook(() =>
        useDragDrop({
          nodes: mockTreeData,
          onReorder: mockOnReorder,
          onMove: mockOnMove,
        }),
      );

      // Start dragging
      act(() => {
        result.current.handleDragStart({
          active: { id: 'element-1' },
        } as DragStartEvent);
      });

      // The issue is that for element-to-element dragging within the same parent,
      // we should use 'before' or 'after' positioning, not 'inside'

      // This test demonstrates what SHOULD happen:
      // When dragging element-1 over element-2 (both children of section-1),
      // the system should recognize this as a sibling reorder operation

      expect(result.current.dragState.activeNode?.type).toBe('element');

      // Both elements should be recognized as valid drop targets for reordering
      expect(result.current.dragState.validDropTargets.has('element-2')).toBe(true);
    });
  });
});
