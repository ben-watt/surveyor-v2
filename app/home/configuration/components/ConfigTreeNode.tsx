import React from 'react';
import { ChevronRight, ChevronDown, Layers, Grid2x2, Blocks, MessageSquare, MoreHorizontal } from 'lucide-react';
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

interface ConfigTreeNodeProps {
  node: TreeNode;
  onToggleExpand: (nodeId: string) => void;
  level: number;
}

export function ConfigTreeNode({ node, onToggleExpand, level }: ConfigTreeNodeProps) {
  const router = useRouter();
  const hasChildren = node.children.length > 0;

  const handleNodeClick = () => {
    const entityId = node.data.id;
    
    switch (node.type) {
      case 'section':
        router.push(`/home/sections/${entityId}`);
        break;
      case 'element':
        router.push(`/home/elements/${entityId}`);
        break;
      case 'component':
        router.push(`/home/building-components/${entityId}`);
        break;
      case 'condition':
        router.push(`/home/conditions/${entityId}`);
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

  const getIcon = () => {
    switch (node.type) {
      case 'section':
        return <Layers className="w-4 h-4 text-blue-600" />;
      case 'element':
        return <Grid2x2 className="w-4 h-4 text-green-600" />;
      case 'component':
        return <Blocks className="w-4 h-4 text-purple-600" />;
      case 'condition':
        return <MessageSquare className="w-4 h-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getNodeDetails = () => {
    switch (node.type) {
      case 'section':
        const elementCount = node.children.filter(child => child.type === 'element').length;
        return (
          <div className="flex items-center gap-2">
            <span>{node.name}</span>
            {node.order !== undefined && (
              <Badge variant="outline" className="text-xs">
                Order: {node.order}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {elementCount} elements
            </Badge>
          </div>
        );
      
      case 'element':
        const componentCount = node.children.filter(child => child.type === 'component').length;
        const conditionCount = node.children.filter(child => child.type === 'condition').length;
        return (
          <div className="flex items-center gap-2">
            <span>{node.name}</span>
            {node.order !== undefined && (
              <Badge variant="outline" className="text-xs">
                Order: {node.order}
              </Badge>
            )}
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
        );
      
      case 'component':
        const component = node.data as Component;
        const componentConditionCount = node.children.length;
        return (
          <div className="flex items-center gap-2">
            <span>{node.name}</span>
            {component.materials && component.materials.length > 0 && (
              <div className="flex gap-1">
                {component.materials.map((material, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {material.name}
                  </Badge>
                ))}
              </div>
            )}
            {componentConditionCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {componentConditionCount} conditions
              </Badge>
            )}
          </div>
        );
      
      case 'condition':
        const condition = node.data as Phrase;
        return (
          <div className="flex items-center gap-2">
            <span className="truncate max-w-md">{node.name}</span>
            <Badge variant="outline" className="text-xs">
              {condition.type}
            </Badge>
            {condition.phraseLevel2 && (
              <Badge variant="secondary" className="text-xs">
                Level 2
              </Badge>
            )}
          </div>
        );
      
      default:
        return <span>{node.name}</span>;
    }
  };

  return (
    <div className="select-none">
      <div 
        className="group flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
          >
            {node.isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <div className="w-6 h-6" />
        )}
        
        {getIcon()}
        
        <div className="flex-1 min-w-0" onClick={handleNodeClick}>
          {getNodeDetails()}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleNodeClick}
            >
              Edit
            </DropdownMenuItem>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}