import {
  loadConfigurationState,
  saveConfigurationState,
  setNavigationContext,
  findPathToEntity,
  getConditionDisplayId,
  ConfigurationState,
} from '../utils/stateUtils';
import { mockHierarchicalData } from './utils/mockData';
import { setupLocalStorageMock, mockLocalStorage, cleanupMocks } from './utils/testUtils';

describe('stateUtils', () => {
  beforeEach(() => {
    setupLocalStorageMock();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Storage Operations Tests', () => {
    it('should save configuration state to localStorage', () => {
      const state: ConfigurationState = {
        expandedNodes: ['section-1', 'element-1'],
        searchQuery: 'foundation',
        lastEditedEntity: {
          id: 'element-1',
          type: 'element',
          timestamp: Date.now(),
        },
      };

      saveConfigurationState(state);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'hierarchical-config-state',
        JSON.stringify(state)
      );
    });

    it('should load configuration state from localStorage', () => {
      const state: ConfigurationState = {
        expandedNodes: ['section-1', 'element-1'],
        searchQuery: 'foundation',
        lastEditedEntity: {
          id: 'element-1',
          type: 'element',
          timestamp: Date.now(),
        },
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(state));

      const loadedState = loadConfigurationState();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('hierarchical-config-state');
      expect(loadedState).toEqual(state);
    });

    it('should handle localStorage quota exceeded errors', () => {
      const state: ConfigurationState = {
        expandedNodes: ['section-1'],
        searchQuery: '',
      };

      // Spy on console.warn to capture the warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => saveConfigurationState(state)).not.toThrow();
      
      // Should log the warning
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save configuration state:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed JSON in localStorage', () => {
      // Spy on console.warn to capture the warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockLocalStorage.getItem.mockReturnValue('invalid json {');

      const loadedState = loadConfigurationState();

      expect(loadedState).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load configuration state:', expect.any(SyntaxError));
      
      consoleSpy.mockRestore();
    });

    it('should return null when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const loadedState = loadConfigurationState();

      expect(loadedState).toBeNull();
    });

    it('should handle localStorage being unavailable', () => {
      // Mock localStorage being unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const state: ConfigurationState = {
        expandedNodes: ['section-1'],
        searchQuery: '',
      };

      // Should not throw
      expect(() => saveConfigurationState(state)).not.toThrow();
      expect(() => loadConfigurationState()).not.toThrow();
    });
  });

  describe('State Management Tests', () => {
    it('should set last edited entity with timestamp', () => {
      const initialState: ConfigurationState = {
        expandedNodes: ['section-1'],
        searchQuery: 'test',
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialState));

      const entityId = 'element-1';
      const entityType = 'element';
      const expandedNodes = ['section-1', 'element-1'];

      setNavigationContext(entityId, entityType, expandedNodes);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'hierarchical-config-state',
        expect.stringContaining(`"lastEditedEntity":{"id":"${entityId}","type":"${entityType}"`)
      );
    });

    it('should preserve existing state when setting navigation context', () => {
      const initialState: ConfigurationState = {
        expandedNodes: ['section-1'],
        searchQuery: 'existing query',
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialState));

      setNavigationContext('element-1', 'element', ['section-1', 'element-1']);

      const savedCall = mockLocalStorage.setItem.mock.calls[0];
      const savedState = JSON.parse(savedCall[1]);

      expect(savedState.searchQuery).toBe('existing query');
      expect(savedState.expandedNodes).toEqual(['section-1', 'element-1']);
      expect(savedState.lastEditedEntity.id).toBe('element-1');
    });

    it('should clear old edited entity highlights after 5 minutes', () => {
      const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      const state: ConfigurationState = {
        expandedNodes: ['section-1'],
        searchQuery: '',
        lastEditedEntity: {
          id: 'old-element',
          type: 'element',
          timestamp: oldTimestamp,
        },
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(state));

      const loadedState = loadConfigurationState();

      // Should have cleared the old edited entity
      expect(loadedState?.lastEditedEntity).toBeUndefined();
    });

    it('should preserve recent edited entity highlights', () => {
      const recentTimestamp = Date.now() - (2 * 60 * 1000); // 2 minutes ago
      const state: ConfigurationState = {
        expandedNodes: ['section-1'],
        searchQuery: '',
        lastEditedEntity: {
          id: 'recent-element',
          type: 'element',
          timestamp: recentTimestamp,
        },
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(state));

      const loadedState = loadConfigurationState();

      expect(loadedState?.lastEditedEntity).toEqual({
        id: 'recent-element',
        type: 'element',
        timestamp: recentTimestamp,
      });
    });

    it('should create new state when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      setNavigationContext('element-1', 'element', ['section-1']);

      const savedCall = mockLocalStorage.setItem.mock.calls[0];
      const savedState = JSON.parse(savedCall[1]);

      expect(savedState).toEqual({
        expandedNodes: ['section-1'],
        lastEditedEntity: {
          id: 'element-1',
          type: 'element',
          timestamp: expect.any(Number),
        },
      });
    });
  });

  describe('Path Finding Tests', () => {
    it('should find correct path to any entity in tree', () => {
      const tree = mockHierarchicalData.tree;

      // Find path to section
      const sectionPath = findPathToEntity(tree, 'section-1');
      expect(sectionPath).toEqual(['section-1']);

      // Find path to element
      const elementPath = findPathToEntity(tree, 'element-1');
      expect(elementPath).toEqual(['section-1', 'element-1']);

      // Find path to component
      const componentPath = findPathToEntity(tree, 'component-1');
      expect(componentPath).toEqual(['section-1', 'element-1', 'component-1']);

      // Find path to condition (using display ID)
      const conditionPath = findPathToEntity(tree, 'element-1-condition-1');
      expect(conditionPath).toEqual(['section-1', 'element-1', 'component-1', 'element-1-condition-1']);
    });

    it('should handle missing entities gracefully', () => {
      const tree = mockHierarchicalData.tree;

      const missingPath = findPathToEntity(tree, 'non-existent-id');
      expect(missingPath).toEqual([]);
    });

    it('should work with condition ID prefixing', () => {
      const tree = mockHierarchicalData.tree;

      // Component-level condition (only type supported now)
      const componentConditionPath = findPathToEntity(tree, 'element-1-condition-1');
      expect(componentConditionPath).toEqual(['section-1', 'element-1', 'component-1', 'element-1-condition-1']);
    });

    it('should return empty path for non-existent entities', () => {
      const tree = mockHierarchicalData.tree;

      const nonExistentPath = findPathToEntity(tree, 'does-not-exist');
      expect(nonExistentPath).toEqual([]);
    });

    it('should handle empty tree gracefully', () => {
      const emptyTree: any[] = [];

      const path = findPathToEntity(emptyTree, 'any-id');
      expect(path).toEqual([]);
    });

    it('should handle deeply nested structures', () => {
      // Create a deeper tree structure for testing
      const deepTree = [
        {
          id: 'section-1',
          children: [
            {
              id: 'element-1',
              children: [
                {
                  id: 'component-1',
                  children: [
                    {
                      id: 'condition-1',
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const path = findPathToEntity(deepTree, 'condition-1');
      expect(path).toEqual(['section-1', 'element-1', 'component-1', 'condition-1']);
    });
  });

  describe('Entity ID Handling Tests', () => {
    it('should generate correct display IDs for conditions', () => {
      // Component-level condition
      const componentConditionId = getConditionDisplayId('condition-1', 'element-1', 'component-1');
      expect(componentConditionId).toBe('element-1-condition-1');

      // Element-level condition (no component)
      const elementConditionId = getConditionDisplayId('condition-2', 'element-1');
      expect(elementConditionId).toBe('element-1-condition-2');
    });

    it('should handle missing element ID gracefully', () => {
      const conditionId = getConditionDisplayId('condition-1');
      expect(conditionId).toBe('condition-1');
    });

    it('should handle empty string IDs', () => {
      const conditionId = getConditionDisplayId('', 'element-1');
      expect(conditionId).toBe('element-1-');
    });

    it('should preserve special characters in IDs', () => {
      const conditionId = getConditionDisplayId('condition-1-special_chars', 'element-1-test');
      expect(conditionId).toBe('element-1-test-condition-1-special_chars');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large state objects efficiently', () => {
      const largeState: ConfigurationState = {
        expandedNodes: Array.from({ length: 10000 }, (_, i) => `node-${i}`),
        searchQuery: 'a'.repeat(1000),
        lastEditedEntity: {
          id: 'element-1',
          type: 'element',
          timestamp: Date.now(),
        },
      };

      const startTime = performance.now();
      saveConfigurationState(largeState);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle large tree structures efficiently in path finding', () => {
      // Create a large tree structure
      const largeTree = Array.from({ length: 1000 }, (_, i) => ({
        id: `section-${i}`,
        children: Array.from({ length: 100 }, (_, j) => ({
          id: `element-${i}-${j}`,
          children: [],
        })),
      }));

      const startTime = performance.now();
      const path = findPathToEntity(largeTree, 'element-500-50');
      const endTime = performance.now();

      expect(path).toEqual(['section-500', 'element-500-50']);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle circular references in tree traversal', () => {
      // Create a circular reference (shouldn't happen in real data)
      const circularNode: any = {
        id: 'circular',
        children: [],
      };
      circularNode.children.push(circularNode);

      const circularTree = [circularNode];

      // Should not cause infinite loop
      const path = findPathToEntity(circularTree, 'non-existent');
      expect(path).toEqual([]);
    });

    it('should handle null/undefined values in tree', () => {
      const malformedTree = [
        null,
        undefined,
        {
          id: 'valid-node',
          children: [null, undefined],
        },
      ] as any;

      const path = findPathToEntity(malformedTree, 'valid-node');
      expect(path).toEqual(['valid-node']);
    });

    it('should handle very long entity IDs', () => {
      const longId = 'a'.repeat(10000);
      const conditionId = getConditionDisplayId(longId, 'element-1');
      expect(conditionId).toBe(`element-1-${longId}`);
    });

    it('should handle special characters in entity IDs', () => {
      const specialId = 'entity-with-!@#$%^&*()-=+[]{}|;:,.<>?';
      const conditionId = getConditionDisplayId(specialId, 'element-1');
      expect(conditionId).toBe(`element-1-${specialId}`);
    });
  });

  describe('Backward Compatibility Tests', () => {
    it('should handle old state format gracefully', () => {
      // Simulate old state format without lastEditedEntity
      const oldState = {
        expandedNodes: ['section-1'],
        searchQuery: 'test',
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(oldState));

      const loadedState = loadConfigurationState();

      expect(loadedState).toEqual({
        expandedNodes: ['section-1'],
        searchQuery: 'test',
      });
    });

    it('should handle state with additional unknown properties', () => {
      const stateWithExtraProps = {
        expandedNodes: ['section-1'],
        searchQuery: 'test',
        unknownProperty: 'value',
        anotherUnknownProperty: 123,
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(stateWithExtraProps));

      const loadedState = loadConfigurationState();

      // Should preserve known properties and ignore unknown ones
      expect(loadedState).toEqual({
        expandedNodes: ['section-1'],
        searchQuery: 'test',
        unknownProperty: 'value',
        anotherUnknownProperty: 123,
      });
    });
  });
});