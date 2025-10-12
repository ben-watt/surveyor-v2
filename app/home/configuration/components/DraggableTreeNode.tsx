'use client';

import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { TreeNode } from '../hooks/useHierarchicalData';
import { DragState } from '../hooks/useDragDrop';
import { ConfigTreeNode } from './ConfigTreeNode';
import DropZone from './DropZone';

interface DraggableTreeNodeProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
  searchQuery: string;
  isDragEnabled?: boolean;
  isValidDropTarget?: boolean;
  isDropping?: boolean;
  dropPosition?: 'before' | 'after' | 'inside' | null;
  dragState?: DragState;
  lastEditedEntity?: { id: string; type: string; timestamp: number } | null;
  expandedNodes?: Set<string>;
  onCreateChild?: (parentType: string, parentId: string, childType: string) => void;
}

const DraggableTreeNode: React.FC<DraggableTreeNodeProps> = ({
  node,
  depth,
  isExpanded,
  onToggle,
  searchQuery,
  isDragEnabled = false,
  isValidDropTarget = false,
  isDropping = false,
  dropPosition = null,
  dragState,
  lastEditedEntity,
  expandedNodes,
  onCreateChild,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
      id: node.id,
      disabled: !isDragEnabled,
      animateLayoutChanges: ({ isSorting, isDragging }) => !(isSorting || isDragging),
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: 'transform',
  } as React.CSSProperties;

  // Virtually collapse only the active dragged node (not parents) during drag
  const effectiveExpanded =
    isExpanded && !(dragState?.isDragging && dragState.activeId === node.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative transition-[background,box-shadow,opacity] duration-150',
        isDragging && 'opacity-90 shadow-lg',
      )}
    >
      {/* Drop indicator line */}
      {isDropping && dropPosition === 'before' && (
        <div className="absolute -top-0.5 left-2 right-2 z-10 h-0.5 rounded-full bg-blue-500" />
      )}

      <div className="relative">
        {/* Node header - only the header row, not children */}
        <div className="group relative">
          {/* Node header content - render just the header without expanded children */}
          <div className={cn('relative')}>
            <ConfigTreeNode
              node={node}
              onToggleExpand={onToggle}
              level={depth}
              expandedNodes={effectiveExpanded ? new Set([node.id]) : new Set()}
              dragAttributes={attributes}
              dragListeners={listeners}
              lastEditedEntity={lastEditedEntity}
              onCreateChild={onCreateChild}
              headerOnly={true}
            />
          </div>
        </div>

        {/* Render children separately, outside of the draggable container */}
        {effectiveExpanded && (
          <div className="ml-4">
            {/* Show drop zones for container nodes */}
            {(node.type === 'section' || node.type === 'element') && (
              <>
                {/* Top drop zone */}
                <DropZone
                  id={`${node.id}-drop-top`}
                  position="top"
                  parentType={node.type}
                  parentId={node.id}
                  isActive={Boolean(
                    dragState?.isDragging &&
                      dragState?.activeNode &&
                      ((node.type === 'section' && dragState.activeNode.type === 'element') ||
                        (node.type === 'element' && dragState.activeNode.type === 'component')),
                  )}
                />

                {/* Sortable list for immediate children at this level */}
                <SortableContext
                  items={node.children
                    .filter((c) =>
                      node.type === 'section' ? c.type === 'element' : c.type === 'component',
                    )
                    .map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {node.children.map((child) => {
                    // Each element and component gets its own drag handle
                    if (
                      (node.type === 'section' && child.type === 'element') ||
                      (node.type === 'element' && child.type === 'component')
                    ) {
                      return (
                        <DraggableTreeNode
                          key={child.id}
                          node={child}
                          depth={depth + 1}
                          isExpanded={child.isExpanded || false}
                          onToggle={onToggle}
                          searchQuery={searchQuery}
                          isDragEnabled={isDragEnabled}
                          isValidDropTarget={false}
                          isDropping={false}
                          dragState={dragState}
                          lastEditedEntity={lastEditedEntity}
                          expandedNodes={expandedNodes}
                          onCreateChild={onCreateChild}
                        />
                      );
                    }

                    // Conditions render as regular tree nodes for now
                    return (
                      <ConfigTreeNode
                        key={child.id}
                        node={child}
                        onToggleExpand={onToggle}
                        level={depth + 1}
                        expandedNodes={new Set(child.isExpanded ? [child.id] : [])}
                        lastEditedEntity={lastEditedEntity}
                        onCreateChild={onCreateChild}
                      />
                    );
                  })}
                </SortableContext>

                {/* Bottom drop zone */}
                <DropZone
                  id={`${node.id}-drop-bottom`}
                  position="bottom"
                  parentType={node.type}
                  parentId={node.id}
                  isActive={Boolean(
                    dragState?.isDragging &&
                      dragState?.activeNode &&
                      ((node.type === 'section' && dragState.activeNode.type === 'element') ||
                        (node.type === 'element' && dragState.activeNode.type === 'component')),
                  )}
                />
              </>
            )}

            {/* Render children for component (conditions) with sortable context and edge drop zones */}
            {node.type === 'component' && (
              <>
                <DropZone
                  id={`${node.id}-conditions-drop-top`}
                  position="top"
                  parentType="component"
                  parentId={node.id}
                  isActive={Boolean(
                    dragState?.isDragging &&
                      dragState?.activeNode &&
                      dragState.activeNode.type === 'condition',
                  )}
                />
                {node.children.length > 0 ? (
                  <SortableContext
                    items={node.children.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {node.children.map((child) => (
                      <DraggableTreeNode
                        key={child.id}
                        node={child}
                        depth={depth + 1}
                        isExpanded={child.isExpanded || false}
                        onToggle={onToggle}
                        searchQuery={searchQuery}
                        isDragEnabled={isDragEnabled}
                        isValidDropTarget={false}
                        isDropping={false}
                        dragState={dragState}
                        lastEditedEntity={lastEditedEntity}
                        expandedNodes={expandedNodes}
                        onCreateChild={onCreateChild}
                      />
                    ))}
                  </SortableContext>
                ) : null}
                <DropZone
                  id={`${node.id}-conditions-drop-bottom`}
                  position="bottom"
                  parentType="component"
                  parentId={node.id}
                  isActive={Boolean(
                    dragState?.isDragging &&
                      dragState?.activeNode &&
                      dragState.activeNode.type === 'condition',
                  )}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Drop indicator line */}
      {isDropping && dropPosition === 'after' && (
        <div className="absolute -bottom-0.5 left-2 right-2 z-10 h-0.5 rounded-full bg-blue-500" />
      )}
    </div>
  );
};

export default DraggableTreeNode;
