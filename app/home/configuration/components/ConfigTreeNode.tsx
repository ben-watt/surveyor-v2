import React from 'react';
import { ChevronRight, ChevronDown, Layers, Grid2x2, Blocks, MessageSquare, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TreeNode } from '../hooks/useHierarchicalData';
import { Component, Phrase } from '../../clients/Dexie';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sectionStore, elementStore, componentStore, phraseStore } from '../../clients/Database';
import { setNavigationContext } from '../utils/stateUtils';

interface ConfigTreeNodeProps {
  node: TreeNode;
  onToggleExpand: (nodeId: string) => void;
  level: number;
  lastEditedEntity?: { id: string; type: string; timestamp: number } | null;
  expandedNodes?: Set<string>;
  onCreateChild?: (parentType: string, parentId: string, childType: string) => void;
}

export function ConfigTreeNode({ node, onToggleExpand, level, lastEditedEntity, expandedNodes, onCreateChild }: ConfigTreeNodeProps) {
  const router = useRouter();
  const hasChildren = node.children.length > 0;

  const handleNodeClick = () => {
    const entityId = node.data.id;
    
    // Save current navigation context before navigating
    if (expandedNodes) {
      setNavigationContext(entityId, node.type, Array.from(expandedNodes));
    }
    
    // Add return parameters to maintain state when navigating back
    const returnUrl = new URL('/home/configuration', window.location.origin);
    returnUrl.searchParams.set('returnFrom', 'edit');
    returnUrl.searchParams.set('editedId', entityId);
    returnUrl.searchParams.set('editedType', node.type);
    
    switch (node.type) {
      case 'section':
        router.push(`/home/configuration/sections/${entityId}?returnTo=${encodeURIComponent(returnUrl.toString())}`);
        break;
      case 'element':
        router.push(`/home/configuration/elements/${entityId}?returnTo=${encodeURIComponent(returnUrl.toString())}`);
        break;
      case 'component':
        router.push(`/home/configuration/components/${entityId}?returnTo=${encodeURIComponent(returnUrl.toString())}`);
        break;
      case 'condition':
        router.push(`/home/configuration/conditions/${entityId}?returnTo=${encodeURIComponent(returnUrl.toString())}`);
        break;
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const entityId = node.data.id;
    const confirmed = window.confirm(`Are you sure you want to delete this ${node.type}?`);
    
    if (!confirmed) return;
    
    try {
      switch (node.type) {
        case 'section':
          await sectionStore.remove(entityId);
          break;
        case 'element':
          await elementStore.remove(entityId);
          break;
        case 'component':
          await componentStore.remove(entityId);
          break;
        case 'condition':
          await phraseStore.remove(entityId);
          break;
      }
    } catch (error) {
      console.error(`Failed to delete ${node.type}:`, error);
      alert(`Failed to delete ${node.type}. Please try again.`);
    }
  };

  const handleCreateChild = (childType: string) => {
    if (onCreateChild) {
      onCreateChild(node.type, node.data.id, childType);
    }
  };

  const getAvailableChildTypes = () => {
    switch (node.type) {
      case 'section':
        return ['element'];
      case 'element':
        return ['component', 'condition'];
      case 'component':
        return ['condition'];
      default:
        return [];
    }
  };

  const getIcon = () => {
    switch (node.type) {
      case 'section':
        return <Layers className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />;
      case 'element':
        return <Grid2x2 className="w-5 h-5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />;
      case 'component':
        return <Blocks className="w-5 h-5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />;
      case 'condition':
        return <MessageSquare className="w-5 h-5 sm:w-4 sm:h-4 text-orange-600 flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getNodeDetails = () => {
    switch (node.type) {
      case 'section':
        const elementCount = node.children.filter(child => child.type === 'element').length;
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-medium">{node.name}</span>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {elementCount} elements
              </Badge>
            </div>
          </div>
        );
      
      case 'element':
        const componentCount = node.children.filter(child => child.type === 'component').length;
        const conditionCount = node.children.filter(child => child.type === 'condition').length;
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-medium">{node.name}</span>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {componentCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {componentCount} components
                </Badge>
              )}
              {conditionCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {conditionCount} conditions
                </Badge>
              )}
            </div>
          </div>
        );
      
      case 'component':
        const component = node.data as Component;
        const componentConditionCount = node.children.length;
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-medium">{node.name}</span>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {component.materials && component.materials.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {component.materials.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{component.materials.length - 2} more
                    </Badge>
                  )}
                </div>
              )}
              {componentConditionCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {componentConditionCount} conditions
                </Badge>
              )}
            </div>
          </div>
        );
      
      case 'condition':
        const condition = node.data as Phrase;
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-medium truncate">{node.name}</span>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {condition.phraseLevel2 && (
                <Badge variant="secondary" className="text-xs">
                  Level 2
                </Badge>
              )}
            </div>
          </div>
        );
      
      default:
        return <span>{node.name}</span>;
    }
  };

  // Check if this node was recently edited
  const isRecentlyEdited = lastEditedEntity && 
    (node.id === lastEditedEntity.id || node.data.id === lastEditedEntity.id) && 
    node.type === lastEditedEntity.type;

  return (
    <div className="select-none">
      <div 
        className={`group flex items-center gap-2 p-3 sm:p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer min-h-[48px] sm:min-h-auto transition-colors ${
          isRecentlyEdited 
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
            : ''
        }`}
        style={{ paddingLeft: `${Math.max(level * 12 + 8, 8)}px` }}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 sm:w-6 sm:h-6 p-0 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
          >
            {node.isExpanded ? (
              <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4" />
            ) : (
              <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
            )}
          </Button>
        ) : (
          <div className="w-8 h-8 sm:w-6 sm:h-6 flex-shrink-0" />
        )}
        
        {getIcon()}
        
        <div className="flex-1 min-w-0" onClick={handleNodeClick}>
          {getNodeDetails()}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-10 w-10 sm:h-8 sm:w-8 p-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleNodeClick}
            >
              Edit
            </DropdownMenuItem>
            {getAvailableChildTypes().length > 0 && (
              <>
                {getAvailableChildTypes().map(childType => (
                  <DropdownMenuItem
                    key={childType}
                    onClick={() => handleCreateChild(childType)}
                  >
                    Add {childType === 'component' ? 'Component' : childType === 'element' ? 'Element' : 'Condition'}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuItem
              className="text-red-500"
              onClick={handleDelete}
            >
              <span className="text-red-500">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {hasChildren && node.isExpanded && (
        <div>
          {node.children.map(child => (
            <ConfigTreeNode
              key={child.id}
              node={child}
              onToggleExpand={onToggleExpand}
              level={level + 1}
              lastEditedEntity={lastEditedEntity}
              expandedNodes={expandedNodes}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}