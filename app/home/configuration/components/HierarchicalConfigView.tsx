import React, { useState, useCallback } from 'react';
import { ConfigTreeNode } from './ConfigTreeNode';
import { ConfigSearchBar } from './ConfigSearchBar';
import { useHierarchicalData, TreeNode } from '../hooks/useHierarchicalData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expand, Minimize2, Loader2 } from 'lucide-react';

export function HierarchicalConfigView() {
  const { isLoading, treeData } = useHierarchicalData();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<TreeNode[]>([]);

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
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
  }, []);

  // Update tree data with expanded state
  const updateTreeWithExpandedState = useCallback((nodes: TreeNode[]): TreeNode[] => {
    return nodes.map(node => ({
      ...node,
      isExpanded: expandedNodes.has(node.id),
      children: updateTreeWithExpandedState(node.children),
    }));
  }, [expandedNodes]);

  const displayData = updateTreeWithExpandedState(searchQuery ? filteredData : treeData);

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
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={expandAll}>
          <Expand className="w-4 h-4 mr-2" />
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          <Minimize2 className="w-4 h-4 mr-2" />
          Collapse All
        </Button>
        {searchQuery && (
          <div className="flex items-center text-sm text-muted-foreground">
            Showing {filteredData.length} results for "{searchQuery}"
          </div>
        )}
      </div>

      <Card className="p-4">
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
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}