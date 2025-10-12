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

export const setLastEditedEntity = (
  id: string,
  type: 'section' | 'element' | 'component' | 'condition',
) => {
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

export const setNavigationContext = (
  entityId: string,
  entityType: 'section' | 'element' | 'component' | 'condition',
  expandedNodes: string[],
) => {
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

export const findPathToEntity = (treeData: any[], entityId: string): string[] => {
  const visited = new Set<string>();

  const findPath = (nodes: any[], targetId: string, currentPath: string[]): string[] | null => {
    if (!nodes || !Array.isArray(nodes)) return null;

    for (const node of nodes) {
      if (!node || typeof node !== 'object' || !node.id) continue;

      // Prevent circular references
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      // Add current node to path
      currentPath.push(node.id);

      if (node.id === targetId) {
        // Found target - return copy of current path
        const result = [...currentPath];
        currentPath.pop(); // Clean up for backtracking
        visited.delete(node.id);
        return result;
      }

      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        const result = findPath(node.children, targetId, currentPath);
        if (result) {
          currentPath.pop(); // Clean up for backtracking
          visited.delete(node.id);
          return result;
        }
      }

      // Backtrack
      currentPath.pop();
      visited.delete(node.id);
    }
    return null;
  };

  const result = findPath(treeData, entityId, []);
  return result || [];
};

export const getEntityDisplayId = (entityId: string, entityType: string): string => {
  // For conditions, we use the prefixed ID from the tree structure
  if (entityType === 'condition') {
    return entityId.startsWith('condition-') ? entityId : `condition-${entityId}`;
  }
  return entityId;
};

export const getConditionDisplayId = (
  conditionId: string,
  elementId?: string,
  componentId?: string,
): string => {
  if (!elementId) {
    return conditionId;
  }

  return `${elementId}-${conditionId}`;
};
