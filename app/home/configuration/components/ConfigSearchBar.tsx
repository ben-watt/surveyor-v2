import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { TreeNode } from '../hooks/useHierarchicalData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ConfigSearchBarProps {
  onSearch: (query: string, results: TreeNode[]) => void;
  treeData: TreeNode[];
}

type EntityType = 'all' | 'section' | 'element' | 'component' | 'condition';

export function ConfigSearchBar({ onSearch, treeData }: ConfigSearchBarProps) {
  const [query, setQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<EntityType>('all');

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return treeData;
    }

    const searchTerm = query.toLowerCase();
    const results: TreeNode[] = [];

    const searchInNode = (node: TreeNode, ancestors: TreeNode[] = []): boolean => {
      const matchesQuery = node.name.toLowerCase().includes(searchTerm);
      const matchesFilter = entityFilter === 'all' || node.type === entityFilter;
      
      let hasMatchingChildren = false;
      const filteredChildren: TreeNode[] = [];

      // Recursively search children
      node.children.forEach(child => {
        if (searchInNode(child, [...ancestors, node])) {
          hasMatchingChildren = true;
          filteredChildren.push(child);
        }
      });

      // Include this node if it matches or has matching children
      if ((matchesQuery && matchesFilter) || hasMatchingChildren) {
        // If this node matches, include all its children
        const childrenToInclude = (matchesQuery && matchesFilter) ? node.children : filteredChildren;
        
        // Create a copy of the node with filtered children
        const nodeWithFilteredChildren = {
          ...node,
          children: childrenToInclude,
        };

        // If this is a top-level node (no ancestors), add to results
        if (ancestors.length === 0) {
          results.push(nodeWithFilteredChildren);
        }
        
        return true;
      }

      return false;
    };

    treeData.forEach(rootNode => {
      searchInNode(rootNode);
    });

    return results;
  }, [query, entityFilter, treeData]);

  const handleSearch = useCallback(() => {
    onSearch(query, searchResults);
  }, [query, searchResults, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setEntityFilter('all');
    onSearch('', treeData);
  }, [onSearch, treeData]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Auto-search as user types (debounced effect handled by parent)
  React.useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const getResultCount = () => {
    let count = 0;
    const countNodes = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (query.trim() && node.name.toLowerCase().includes(query.toLowerCase())) {
          if (entityFilter === 'all' || node.type === entityFilter) {
            count++;
          }
        }
        countNodes(node.children);
      });
    };
    countNodes(searchResults);
    return count;
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search sections, elements, components, or conditions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        
        <Select value={entityFilter} onValueChange={(value: EntityType) => setEntityFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="section">Sections</SelectItem>
            <SelectItem value="element">Elements</SelectItem>
            <SelectItem value="component">Components</SelectItem>
            <SelectItem value="condition">Conditions</SelectItem>
          </SelectContent>
        </Select>

        {query && (
          <Button variant="outline" size="icon" onClick={handleClear}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {query && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {getResultCount()} matches found
          </Badge>
          {entityFilter !== 'all' && (
            <Badge variant="outline">
              Filter: {entityFilter}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}