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
  initialQuery?: string;
}

type EntityType = 'all' | 'section' | 'element' | 'component' | 'condition';

export function ConfigSearchBar({ onSearch, treeData, initialQuery = '' }: ConfigSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [entityFilter, setEntityFilter] = useState<EntityType>('all');

  // Update query when initialQuery changes
  React.useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

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
      node.children.forEach((child) => {
        if (searchInNode(child, [...ancestors, node])) {
          hasMatchingChildren = true;
          filteredChildren.push(child);
        }
      });

      // Include this node if it matches or has matching children
      if ((matchesQuery && matchesFilter) || hasMatchingChildren) {
        // If this node matches, include all its children
        const childrenToInclude = matchesQuery && matchesFilter ? node.children : filteredChildren;

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

    treeData.forEach((rootNode) => {
      searchInNode(rootNode);
    });

    return results;
  }, [query, entityFilter, treeData]);

  const handleClear = useCallback(() => {
    setQuery('');
    setEntityFilter('all');
    onSearch('', treeData);
  }, [onSearch, treeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onSearch(query, searchResults);
      }
    },
    [query, searchResults, onSearch],
  );

  // Auto-search as user types (debounced)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(query, searchResults);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, entityFilter, searchResults, onSearch]);

  const getResultCount = () => {
    let count = 0;
    const countNodes = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
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
    <div className="flex flex-col space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search configuration..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-10 pl-10 sm:h-9"
          />
        </div>

        <div className="flex gap-2">
          <Select
            value={entityFilter}
            onValueChange={(value: EntityType) => setEntityFilter(value)}
          >
            <SelectTrigger className="h-10 w-full sm:h-9 sm:w-40">
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
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              className="h-10 w-10 flex-shrink-0 sm:h-9 sm:w-9"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {query && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {getResultCount()} {getResultCount() === 1 ? 'result found' : 'results found'}
          </Badge>
          {entityFilter !== 'all' && (
            <Badge variant="outline" className="text-xs">
              {entityFilter}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
