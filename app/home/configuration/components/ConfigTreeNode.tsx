import React from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Grid2x2,
  Blocks,
  MessageSquare,
  MoreHorizontal,
  Plus,
  GripVertical,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TreeNode } from '../hooks/useHierarchicalData';
import { Component, Phrase, SyncStatus as SyncStatusEnum } from '../../clients/Dexie';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sectionStore, elementStore, componentStore, phraseStore } from '../../clients/Database';
import { setNavigationContext } from '../utils/stateUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface ConfigTreeNodeProps {
  node: TreeNode;
  onToggleExpand: (nodeId: string) => void;
  level: number;
  lastEditedEntity?: { id: string; type: string; timestamp: number } | null;
  expandedNodes?: Set<string>;
  onCreateChild?: (parentType: string, parentId: string, childType: string) => void;
  dragAttributes?: any;
  dragListeners?: any;
  headerOnly?: boolean; // When true, only render the header without children
}

export function ConfigTreeNode({
  node,
  onToggleExpand,
  level,
  lastEditedEntity,
  expandedNodes,
  onCreateChild,
  dragAttributes,
  dragListeners,
  headerOnly = false,
}: ConfigTreeNodeProps) {
  const router = useRouter();
  const hasChildren = node.children.length > 0;

  /**
   * Resolve a store instance by node type.
   */
  const getStoreForType = () => {
    switch (node.type) {
      case 'section':
        return sectionStore;
      case 'element':
        return elementStore;
      case 'component':
        return componentStore;
      case 'condition':
        return phraseStore;
      default:
        return undefined;
    }
  };

  /**
   * Convert a sync status into icon metadata for rendering.
   */
  const getSyncMeta = (status: string | undefined) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case SyncStatusEnum.Synced:
        return { Icon: Cloud, className: 'text-gray-900 dark:text-gray-100', label: 'Synced' };
      case SyncStatusEnum.Queued:
        return { Icon: RefreshCw, className: 'text-blue-500 animate-spin', label: 'Queued' };
      case SyncStatusEnum.Draft:
        return { Icon: CloudOff, className: 'text-yellow-500', label: 'Draft' };
      case SyncStatusEnum.Failed:
        return { Icon: AlertTriangle, className: 'text-red-500', label: 'Failed' };
      case SyncStatusEnum.PendingDelete:
        return { Icon: Trash2, className: 'text-orange-500', label: 'Pending delete' };
      case SyncStatusEnum.Archived:
        return { Icon: Archive, className: 'text-gray-400', label: 'Archived' };
      default:
        return { Icon: CloudOff, className: 'text-muted-foreground', label: 'Unknown' } as const;
    }
  };

  /**
   * Retry syncing the current entity by re-queuing and triggering a sync.
   */
  const handleRetrySync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const store = getStoreForType();
    if (!store) return;
    try {
      await store.update((node.data as any).id, (draft) => {
        (draft as any).syncStatus = SyncStatusEnum.Queued;
        (draft as any).syncError = undefined;
      });
      await store.sync();
    } catch (error) {
      console.error('Failed to retry sync:', error);
    }
  };

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
        router.push(
          `/home/configuration/sections/${encodeURIComponent(entityId)}?returnTo=${encodeURIComponent(returnUrl.toString())}`,
        );
        break;
      case 'element':
        router.push(
          `/home/configuration/elements/${encodeURIComponent(entityId)}?returnTo=${encodeURIComponent(returnUrl.toString())}`,
        );
        break;
      case 'component':
        router.push(
          `/home/configuration/components/${encodeURIComponent(entityId)}?returnTo=${encodeURIComponent(returnUrl.toString())}`,
        );
        break;
      case 'condition':
        router.push(
          `/home/configuration/conditions/${encodeURIComponent(entityId)}?returnTo=${encodeURIComponent(returnUrl.toString())}`,
        );
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
        return ['component'];
      case 'component':
        return ['condition'];
      default:
        return [];
    }
  };

  const getIcon = () => {
    switch (node.type) {
      case 'section':
        return <Layers className="h-5 w-5 flex-shrink-0 text-blue-600 sm:h-4 sm:w-4" />;
      case 'element':
        return <Grid2x2 className="h-5 w-5 flex-shrink-0 text-green-600 sm:h-4 sm:w-4" />;
      case 'component':
        return <Blocks className="h-5 w-5 flex-shrink-0 text-purple-600 sm:h-4 sm:w-4" />;
      case 'condition':
        return <MessageSquare className="h-5 w-5 flex-shrink-0 text-orange-600 sm:h-4 sm:w-4" />;
      default:
        return null;
    }
  };

  const getNodeDetails = () => {
    switch (node.type) {
      case 'section':
        const elementCount = node.children.filter((child) => child.type === 'element').length;
        return (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="font-medium">{node.name}</span>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {node.invalid && (
                <Badge variant="secondary" className="text-xs">
                  Missing name
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {elementCount} elements
              </Badge>
            </div>
          </div>
        );

      case 'element':
        const componentCount = node.children.filter((child) => child.type === 'component').length;
        const conditionCount = node.children.filter((child) => child.type === 'condition').length;
        return (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="font-medium">{node.name}</span>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {node.invalid && (
                <Badge variant="secondary" className="text-xs">
                  Missing name
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
          </div>
        );

      case 'component':
        const componentConditionCount = node.children.length;
        return (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="font-medium">{node.name}</span>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {node.invalid && (
                <Badge variant="secondary" className="text-xs">
                  Missing name
                </Badge>
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
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="truncate font-medium">{node.name}</span>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {node.invalid && (
                <Badge variant="secondary" className="text-xs">
                  Missing name
                </Badge>
              )}
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
  const isRecentlyEdited =
    lastEditedEntity &&
    (node.id === lastEditedEntity.id || node.data.id === lastEditedEntity.id) &&
    node.type === lastEditedEntity.type;

  return (
    <div className="select-none">
      <div
        className={`sm:min-h-auto group flex min-h-[48px] cursor-pointer items-center gap-2 rounded p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 sm:p-2 ${
          isRecentlyEdited
            ? 'border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
            : ''
        }`}
        style={{ paddingLeft: `${Math.max(level * 12 + 8, 8)}px` }}
      >
        {/* Drag handle - show for all draggable entities including conditions */}
        {dragAttributes && dragListeners && (
          <div
            {...dragAttributes}
            {...dragListeners}
            className="flex-shrink-0 cursor-grab rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 flex-shrink-0 p-0 sm:h-6 sm:w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
          >
            {expandedNodes?.has(node.id) || node.isExpanded ? (
              <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4" />
            ) : (
              <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
            )}
          </Button>
        ) : (
          <div className="h-8 w-8 flex-shrink-0 sm:h-6 sm:w-6" />
        )}

        {getIcon()}

        <div className="min-w-0 flex-1" onClick={handleNodeClick}>
          {getNodeDetails()}
        </div>

        {/* Per-entity sync status */}
        {(() => {
          const status = (node.data as any)?.syncStatus as string | undefined;
          const meta = getSyncMeta(status);
          const IconComp = meta.Icon;
          const aria = `Sync status: ${meta.label}${(node.data as any)?.syncError ? '. Click for details' : ''}`;
          return (
            <TooltipProvider>
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        aria-label={aria}
                        role="button"
                        className={`mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 sm:h-6 sm:w-6`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconComp className={`h-4 w-4 ${meta.className}`} />
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span className="text-xs">
                      {meta.label}
                      {(node.data as any)?.syncError ? ' — click for details' : ''}
                    </span>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  align="end"
                  className="w-72 p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <IconComp className={`h-4 w-4 ${meta.className}`} />
                      <span className="text-sm font-medium">{meta.label}</span>
                    </div>
                    {(node.data as any)?.updatedAt && (
                      <div className="text-xs text-muted-foreground">
                        Updated: {new Date((node.data as any).updatedAt).toLocaleString()}
                      </div>
                    )}
                    {(node.data as any)?.syncError && (
                      <div className="break-words text-xs text-red-600 dark:text-red-400">
                        {(node.data as any).syncError}
                      </div>
                    )}
                    {status === SyncStatusEnum.Failed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetrySync}
                        aria-label="Retry sync"
                      >
                        <RefreshCw className="mr-2 h-3 w-3" /> Retry sync
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </TooltipProvider>
          );
        })()}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 w-10 flex-shrink-0 p-0 opacity-100 transition-opacity sm:h-8 sm:w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleNodeClick}>Edit</DropdownMenuItem>
            {getAvailableChildTypes().length > 0 && (
              <>
                {getAvailableChildTypes().map((childType) => (
                  <DropdownMenuItem key={childType} onClick={() => handleCreateChild(childType)}>
                    Add{' '}
                    {childType === 'component'
                      ? 'Component'
                      : childType === 'element'
                        ? 'Element'
                        : 'Condition'}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuItem className="text-red-500" onClick={handleDelete}>
              <span className="text-red-500">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!headerOnly && hasChildren && (expandedNodes?.has(node.id) || node.isExpanded) && (
        <div>
          {node.children.map((child) => (
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
