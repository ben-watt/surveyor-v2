import React, { useState, useCallback, useEffect } from 'react';
import { ConfigTreeNode } from './ConfigTreeNode';
import DraggableTreeNode from './DraggableTreeNode';
import DropZone from './DropZone';
import { ConfigSearchBar } from './ConfigSearchBar';
import { useHierarchicalData, TreeNode } from '../hooks/useHierarchicalData';
import { useDragDrop } from '../hooks/useDragDrop';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expand, Minimize2, Loader2, Plus, Layers, Grid2x2, Blocks, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  saveConfigurationState, 
  loadConfigurationState, 
  findPathToEntity,
  getEntityDisplayId,
} from '../utils/stateUtils';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import { updateSectionOrder, updateElementOrder, updateComponentOrder, batchUpdateOrders, moveConditionToComponent, updateConditionOrder } from '../utils/storeOperations';

export function HierarchicalConfigView() {
  const router = useRouter();
  const { isLoading, treeData } = useHierarchicalData();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<TreeNode[]>([]);
  const [lastEditedEntity, setLastEditedEntity] = useState<{ id: string; type: string; timestamp: number } | null>(null);
  const searchParams = useSearchParams();

  // Drag and drop handlers
  const handleReorder = useCallback(async (updates: Array<{ id: string; order: number }>) => {
    try {
      // Find node types for all updates
      const findNodeType = (
        nodeId: string,
        nodes: TreeNode[]
      ): 'section' | 'element' | 'component' | 'condition' | null => {
        for (const node of nodes) {
          if (node.id === nodeId) return node.type as 'section' | 'element' | 'component' | 'condition';
          const found = findNodeType(nodeId, node.children);
          if (found) return found;
        }
        return null;
      };

      const typedUpdates = updates.map(update => {
        const type = findNodeType(update.id, treeData);
        if (!type) throw new Error(`Node type not found for ${update.id}`);
        return { ...update, type };
      });

      const result = await batchUpdateOrders(typedUpdates);
      if (result.err) {
        throw result.val;
      }
    } catch (error) {
      console.error('Failed to reorder items:', error);
      throw error;
    }
  }, [treeData]);

  const handleMove = useCallback(async (nodeId: string, newParentId: string | undefined, order: number) => {
    try {
      // Find the node type
      const findNode = (nodes: TreeNode[]): TreeNode | null => {
        for (const node of nodes) {
          if (node.id === nodeId) return node;
          const found = findNode(node.children);
          if (found) return found;
        }
        return null;
      };
      
      const findParentId = (id: string, nodes: TreeNode[], parentId?: string): string | undefined => {
        for (const node of nodes) {
          if (node.id === id) return parentId;
          const found = findParentId(id, node.children, node.id);
          if (found !== undefined) return found;
        }
        return undefined;
      };

      const node = findNode(treeData);
      if (!node) throw new Error('Node not found');
      
      if (node.type === 'element' && newParentId) {
        // Moving element to different section
        const result = await updateElementOrder(nodeId, order, newParentId);
        if (result.err) throw result.val;
      } else if (node.type === 'component' && newParentId) {
        // Moving component to different element  
        const result = await updateComponentOrder(nodeId, order, newParentId);
        if (result.err) throw result.val;
      } else if (node.type === 'condition' && newParentId) {
        // Moving condition to different component
        const fromParentId = findParentId(nodeId, treeData);
        const result = await moveConditionToComponent(nodeId, fromParentId, newParentId, order);
        if (result.err) throw result.val;
      } else if (node.type === 'condition') {
        // Reordering condition within same component
        const result = await updateConditionOrder(nodeId, order);
        if (result.err) throw result.val;
      }
    } catch (error) {
      console.error('Failed to move item:', error);
      throw error;
    }
  }, [treeData]);

  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useDragDrop({
    nodes: searchQuery ? filteredData : treeData,
    onReorder: handleReorder,
    onMove: handleMove,
  });

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      
      // Save state to localStorage
      const currentState = loadConfigurationState() || { expandedNodes: [] };
      saveConfigurationState({
        ...currentState,
        expandedNodes: Array.from(newSet),
      });
      
      return newSet;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allNodeIds = new Set<string>();
    
    const collectNodeIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allNodeIds.add(node.id);
          collectNodeIds(node.children);
        }
      });
    };
    
    collectNodeIds(searchQuery ? filteredData : treeData);
    setExpandedNodes(allNodeIds);
  }, [treeData, filteredData, searchQuery]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const handleSearch = useCallback((query: string, results: TreeNode[]) => {
    setSearchQuery(query);
    setFilteredData(results);
    
    // Expand all nodes when searching to show results
    if (query) {
      const allNodeIds = new Set<string>();
      const collectNodeIds = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          if (node.children.length > 0) {
            allNodeIds.add(node.id);
            collectNodeIds(node.children);
          }
        });
      };
      collectNodeIds(results);
      setExpandedNodes(allNodeIds);
    }
    
    // Save search state
    const currentState = loadConfigurationState() || { expandedNodes: [] };
    saveConfigurationState({
      ...currentState,
      searchQuery: query,
      expandedNodes: Array.from(expandedNodes),
    });
  }, [expandedNodes]);

  // Update tree data with expanded state
  const updateTreeWithExpandedState = useCallback((nodes: TreeNode[]): TreeNode[] => {
    return nodes.map(node => ({
      ...node,
      isExpanded: expandedNodes.has(node.id),
      children: updateTreeWithExpandedState(node.children),
    }));
  }, [expandedNodes]);

  const displayData = updateTreeWithExpandedState(searchQuery ? filteredData : treeData);

  const handleCreateEntity = (entityType: 'section' | 'element' | 'component' | 'condition') => {
    const returnUrl = new URL('/home/configuration', window.location.origin);
    returnUrl.searchParams.set('returnFrom', 'create');
    returnUrl.searchParams.set('createdType', entityType);
    
    const createUrl = `/home/configuration/${entityType === 'component' ? 'components' : `${entityType}s`}/create?returnTo=${encodeURIComponent(returnUrl.toString())}`;
    router.push(createUrl);
  };

  const handleCreateChild = useCallback((parentType: string, parentId: string, childType: string) => {
    const returnUrl = new URL('/home/configuration', window.location.origin);
    returnUrl.searchParams.set('returnFrom', 'create');
    returnUrl.searchParams.set('createdType', childType);
    returnUrl.searchParams.set('parentType', parentType);
    returnUrl.searchParams.set('parentId', parentId);
    
    const createUrl = `/home/configuration/${childType === 'component' ? 'components' : `${childType}s`}/create?returnTo=${encodeURIComponent(returnUrl.toString())}&parentType=${encodeURIComponent(parentType)}&parentId=${encodeURIComponent(parentId)}`;
    router.push(createUrl);
  }, [router]);

  // Effect to restore state on component mount and handle URL parameters
  useEffect(() => {
    if (isLoading || treeData.length === 0) return;

    const savedState = loadConfigurationState();
    
    // Check for URL parameters indicating a return from editing or creating
    const returnFrom = searchParams.get('returnFrom');
    const editedId = searchParams.get('editedId');
    const editedType = searchParams.get('editedType') as 'section' | 'element' | 'component' | 'condition' | null;
    const createdType = searchParams.get('createdType') as 'section' | 'element' | 'component' | 'condition' | null;
    
    if (returnFrom === 'edit' && editedId && editedType) {
      // User returned from editing via the button - expand path to edited entity and highlight it
      const pathToEntity = findPathToEntity(treeData, editedId);
      const entityDisplayId = getEntityDisplayId(editedId, editedType);
      
      setExpandedNodes(new Set([...pathToEntity, entityDisplayId]));
      setLastEditedEntity({
        id: entityDisplayId,
        type: editedType,
        timestamp: Date.now(),
      });
      
      // Save updated state
      saveConfigurationState({
        expandedNodes: [...pathToEntity, entityDisplayId],
        lastEditedEntity: {
          id: entityDisplayId,
          type: editedType,
          timestamp: Date.now(),
        },
        searchQuery: savedState?.searchQuery || '',
      });
      
      // Clear URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('returnFrom');
      newUrl.searchParams.delete('editedId');
      newUrl.searchParams.delete('editedType');
      window.history.replaceState({}, '', newUrl.toString());
      
    } else if (returnFrom === 'create' && createdType) {
      // User returned from creating - just restore the saved state and expand all to show new entity
      if (savedState) {
        setExpandedNodes(new Set(savedState.expandedNodes));
        if (savedState.searchQuery) {
          setSearchQuery(savedState.searchQuery);
        }
      }
      
      // Clear URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('returnFrom');
      newUrl.searchParams.delete('createdType');
      newUrl.searchParams.delete('parentType');
      newUrl.searchParams.delete('parentId');
      window.history.replaceState({}, '', newUrl.toString());
      
    } else if (savedState) {
      // Restore saved state (including browser back button navigation)
      setExpandedNodes(new Set(savedState.expandedNodes));
      if (savedState.searchQuery) {
        setSearchQuery(savedState.searchQuery);
      }
      if (savedState.lastEditedEntity) {
        // Check if we should highlight the last edited entity
        const timeSinceEdit = Date.now() - savedState.lastEditedEntity.timestamp;
        if (timeSinceEdit < 5 * 60 * 1000) { // 5 minutes
          setLastEditedEntity(savedState.lastEditedEntity);
          
          // If we have a recently edited entity, make sure its path is expanded
          const pathToEntity = findPathToEntity(treeData, savedState.lastEditedEntity.id);
          const entityDisplayId = getEntityDisplayId(savedState.lastEditedEntity.id, savedState.lastEditedEntity.type);
          const allExpandedNodes = new Set([...savedState.expandedNodes, ...pathToEntity, entityDisplayId]);
          setExpandedNodes(allExpandedNodes);
          
          // Update saved state with expanded path
          saveConfigurationState({
            ...savedState,
            expandedNodes: Array.from(allExpandedNodes),
          });
        }
      }
    }
  }, [isLoading, treeData, searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ConfigSearchBar onSearch={handleSearch} treeData={treeData} initialQuery={searchQuery} />
      
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex gap-2 flex-wrap w-full">
          <Button variant="outline" size="sm" onClick={expandAll} className="flex-1 sm:flex-none">
            <Expand className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Expand All</span>
            <span className="sm:hidden">Expand</span>
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="flex-1 sm:flex-none">
            <Minimize2 className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Collapse All</span>
            <span className="sm:hidden">Collapse</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Create New</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreateEntity('section')}>
                <Layers className="w-4 h-4 mr-2" />
                New Section
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateEntity('element')}>
                <Grid2x2 className="w-4 h-4 mr-2" />
                New Element
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateEntity('component')}>
                <Blocks className="w-4 h-4 mr-2" />
                New Component
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateEntity('condition')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                New Condition
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {searchQuery && (
          <div className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">Showing {filteredData.length} results for "{searchQuery}"</span>
            <span className="sm:hidden">{filteredData.length} results</span>
          </div>
        )}
      </div>

      <Card className="p-2 sm:p-4">
        {displayData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No results found' : 'No configuration data available'}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayData.map(n => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {/* Top drop zone for root level */}
                <DropZone
                  id="root-drop-top"
                  position="top"
                  parentType="root"
                  isActive={dragState.isDragging && dragState.activeNode?.type === 'section'}
                />
                
                {displayData.map(node => (
                  <DraggableTreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    isExpanded={expandedNodes.has(node.id)}
                    onToggle={handleToggleExpand}
                    searchQuery={searchQuery}
                    isDragEnabled={true}
                    isValidDropTarget={dragState.validDropTargets.has(node.id)}
                    isDropping={dragState.overId === node.id}
                    dropPosition={dragState.overId === node.id ? dragState.dropPosition : null}
                    dragState={dragState}
                    lastEditedEntity={lastEditedEntity}
                    expandedNodes={expandedNodes}
                    onCreateChild={handleCreateChild}
                  />
                ))}
                
                {/* Bottom drop zone for root level */}
                <DropZone
                  id="root-drop-bottom"
                  position="bottom"
                  parentType="root"
                  isActive={dragState.isDragging && dragState.activeNode?.type === 'section'}
                />
              </div>
            </SortableContext>
            
            {/* Drag overlay for visual feedback */}
            <DragOverlay>
              {dragState.activeNode ? (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2 opacity-90">
                  <ConfigTreeNode
                    node={dragState.activeNode}
                    onToggleExpand={() => {}}
                    level={0}
                    expandedNodes={new Set()}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </Card>
    </div>
  );
}