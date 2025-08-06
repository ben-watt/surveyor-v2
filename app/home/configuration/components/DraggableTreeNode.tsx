'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TreeNode } from '../hooks/useHierarchicalData';
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
  dragState?: {
    isDragging: boolean;
    activeNode: TreeNode | null;
  };
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
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: node.id,
    disabled: !isDragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'opacity-50',
        isOver && isValidDropTarget && 'bg-green-50 dark:bg-green-950',
        isOver && !isValidDropTarget && 'bg-red-50 dark:bg-red-950'
      )}
    >
      {/* Drop indicator line */}
      {isDropping && dropPosition === 'before' && (
        <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-blue-500 z-10" />
      )}
      
      <div className="relative">
        {/* Node header with drag handle - only the header row, not children */}
        <div className="relative group">
          {/* Drag handle - only show for draggable entities (not conditions) */}
          {isDragEnabled && node.type !== 'condition' && (
            <div
              {...attributes}
              {...listeners}
              className={cn(
                'absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab z-20',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                'p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700',
                'touch-none', // Prevent touch scrolling when dragging
                isDragging && 'cursor-grabbing opacity-100'
              )}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          
          {/* Node header content - render just the header without expanded children */}
          <div className={cn(
            'relative',
            isDropping && dropPosition === 'inside' && 
            'ring-2 ring-blue-500 ring-offset-2 rounded-lg'
          )}>
            <ConfigTreeNode
              node={{...node, isExpanded: false}} // Force header-only rendering
              onToggleExpand={onToggle}
              level={depth}
              expandedNodes={new Set()}
            />
          </div>
        </div>
        
        {/* Render children separately, outside of the draggable container */}
        {isExpanded && (
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
                    (
                      (node.type === 'section' && dragState.activeNode.type === 'element') ||
                      (node.type === 'element' && dragState.activeNode.type === 'component')
                    )
                  )}
                />
                
                {node.children.map((child) => {
                  // Each element and component gets its own drag handle
                  if (child.type === 'element' || child.type === 'component') {
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
                      />
                    );
                  } else {
                    // Conditions render as regular tree nodes
                    return (
                      <ConfigTreeNode
                        key={child.id}
                        node={child}
                        onToggleExpand={onToggle}
                        level={depth + 1}
                        expandedNodes={new Set(child.isExpanded ? [child.id] : [])}
                      />
                    );
                  }
                })}
                
                {/* Bottom drop zone */}
                <DropZone
                  id={`${node.id}-drop-bottom`}
                  position="bottom"
                  parentType={node.type}
                  parentId={node.id}
                  isActive={Boolean(
                    dragState?.isDragging && 
                    dragState?.activeNode &&
                    (
                      (node.type === 'section' && dragState.activeNode.type === 'element') ||
                      (node.type === 'element' && dragState.activeNode.type === 'component')
                    )
                  )}
                />
              </>
            )}
            
            {/* Render children for non-container nodes */}
            {node.type !== 'section' && node.type !== 'element' && node.children.length > 0 && (
              node.children.map((child) => (
                <ConfigTreeNode
                  key={child.id}
                  node={child}
                  onToggleExpand={onToggle}
                  level={depth + 1}
                  expandedNodes={new Set(child.isExpanded ? [child.id] : [])}
                />
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Drop indicator line */}
      {isDropping && dropPosition === 'after' && (
        <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 z-10" />
      )}
      
    </div>
  );
};

export default DraggableTreeNode;