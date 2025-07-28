import React, { useState, useCallback, useEffect } from 'react';
import { ConfigTreeNode } from './ConfigTreeNode';
import { ConfigSearchBar } from './ConfigSearchBar';
import { useHierarchicalData, TreeNode } from '../hooks/useHierarchicalData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expand, Minimize2, Loader2 } from 'lucide-react';
import { 
  saveConfigurationState, 
  loadConfigurationState, 
  findPathToEntity,
  getEntityDisplayId,
  ConfigurationState 
} from '../utils/stateUtils';
import { useSearchParams } from 'next/navigation';

export function HierarchicalConfigView() {
  const { isLoading, treeData } = useHierarchicalData();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<TreeNode[]>([]);
  const [lastEditedEntity, setLastEditedEntity] = useState<{ id: string; type: string; timestamp: number } | null>(null);
  const searchParams = useSearchParams();

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

  // Effect to restore state on component mount and handle URL parameters
  useEffect(() => {
    if (isLoading || treeData.length === 0) return;

    const savedState = loadConfigurationState();
    
    // Check for URL parameters indicating a return from editing
    const returnFromEdit = searchParams.get('returnFrom');
    const editedId = searchParams.get('editedId');
    const editedType = searchParams.get('editedType') as 'section' | 'element' | 'component' | 'condition' | null;
    
    if (returnFromEdit && editedId && editedType) {
      // User returned from editing - expand path to edited entity and highlight it
      const pathToEntity = findPathToEntity(treeData, editedId, editedType);
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
      
    } else if (savedState) {
      // Restore saved state
      setExpandedNodes(new Set(savedState.expandedNodes));
      if (savedState.searchQuery) {
        setSearchQuery(savedState.searchQuery);
      }
      if (savedState.lastEditedEntity) {
        setLastEditedEntity(savedState.lastEditedEntity);
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
      <ConfigSearchBar onSearch={handleSearch} treeData={treeData} />
      
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex gap-2">
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
          <div className="space-y-1">
            {displayData.map(node => (
              <ConfigTreeNode
                key={node.id}
                node={node}
                onToggleExpand={handleToggleExpand}
                level={0}
                lastEditedEntity={lastEditedEntity}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}