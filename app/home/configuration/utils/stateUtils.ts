import { TreeNode } from '../hooks/useHierarchicalData';

const STORAGE_KEY = 'hierarchical-config-state';

export interface ConfigurationState {
  expandedNodes: string[];
  lastEditedEntity?: {
    id: string;
    type: 'section' | 'element' | 'component' | 'condition';
    timestamp: number;
  };
  searchQuery?: string;
}

export const saveConfigurationState = (state: ConfigurationState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save configuration state:', error);
  }
};

export const loadConfigurationState = (): ConfigurationState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const state = JSON.parse(saved) as ConfigurationState;
    
    // Clear old edited entity highlights (older than 5 minutes)
    if (state.lastEditedEntity && Date.now() - state.lastEditedEntity.timestamp > 5 * 60 * 1000) {
      state.lastEditedEntity = undefined;
    }
    
    return state;
  } catch (error) {
    console.warn('Failed to load configuration state:', error);
    return null;
  }
};

export const setLastEditedEntity = (id: string, type: 'section' | 'element' | 'component' | 'condition') => {
  const currentState = loadConfigurationState() || { expandedNodes: [] };
  const newState: ConfigurationState = {
    ...currentState,
    lastEditedEntity: {
      id,
      type,
      timestamp: Date.now(),
    },
  };
  saveConfigurationState(newState);
};

export const setNavigationContext = (entityId: string, entityType: 'section' | 'element' | 'component' | 'condition', expandedNodes: string[]) => {
  const currentState = loadConfigurationState() || { expandedNodes: [] };
  const newState: ConfigurationState = {
    ...currentState,
    expandedNodes,
    lastEditedEntity: {
      id: entityId,
      type: entityType,
      timestamp: Date.now(),
    },
  };
  saveConfigurationState(newState);
};

export const findPathToEntity = (
  treeData: TreeNode[],
  entityId: string,
  entityType: string
): string[] => {
  const path: string[] = [];
  
  const findPath = (nodes: TreeNode[], targetId: string, targetType: string, currentPath: string[]): boolean => {
    for (const node of nodes) {
      const newPath = [...currentPath, node.id];
      
      if (node.data.id === targetId && node.type === targetType) {
        path.push(...newPath.slice(0, -1)); // Don't include the target node itself
        return true;
      }
      
      if (node.children.length > 0) {
        if (findPath(node.children, targetId, targetType, newPath)) {
          return true;
        }
      }
    }
    return false;
  };
  
  findPath(treeData, entityId, entityType, []);
  return path;
};

export const getEntityDisplayId = (entityId: string, entityType: string): string => {
  // For conditions, we use the prefixed ID from the tree structure
  if (entityType === 'condition') {
    return entityId.startsWith('condition-') ? entityId : `condition-${entityId}`;
  }
  return entityId;
};