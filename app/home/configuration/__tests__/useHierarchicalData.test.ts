import { renderHook, waitFor } from '@testing-library/react';
import { mockSections, mockElements, mockComponents, mockConditions } from './utils/mockData';

// Mock the Database module with factory function
jest.mock('../../clients/Database', () => {
  const createMockStore = (data: any[]) => ({
    useList: jest.fn().mockReturnValue([true, data]),
  });

  return {
    sectionStore: createMockStore(mockSections),
    elementStore: createMockStore(mockElements),
    componentStore: createMockStore(mockComponents),
    phraseStore: createMockStore(mockConditions),
  };
});

// Import after mock setup
import { useHierarchicalData } from '../hooks/useHierarchicalData';
import * as Database from '../../clients/Database';

// Get references to mocked stores for test manipulation
const mockSectionStore = Database.sectionStore as jest.Mocked<typeof Database.sectionStore>;
const mockElementStore = Database.elementStore as jest.Mocked<typeof Database.elementStore>;
const mockComponentStore = Database.componentStore as jest.Mocked<typeof Database.componentStore>;
const mockPhraseStore = Database.phraseStore as jest.Mocked<typeof Database.phraseStore>;

describe('useHierarchicalData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset store mocks to default state
    mockSectionStore.useList.mockReturnValue([true, mockSections]);
    mockElementStore.useList.mockReturnValue([true, mockElements]);
    mockComponentStore.useList.mockReturnValue([true, mockComponents]);
    mockPhraseStore.useList.mockReturnValue([true, mockConditions]);
  });

  describe('Data Structure Tests', () => {
    it('should build correct hierarchy from flat data', async () => {
      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.treeData).toHaveLength(3); // 3 sections
      
      // Check section structure
      const structureSection = result.current.treeData.find(node => node.id === 'section-1');
      expect(structureSection).toBeDefined();
      expect(structureSection?.name).toBe('Structure');
      expect(structureSection?.type).toBe('section');
      expect(structureSection?.children).toHaveLength(2); // Foundation and Walls elements
      
      // Check element structure
      const foundationElement = structureSection?.children.find(child => child.id === 'element-1');
      expect(foundationElement).toBeDefined();
      expect(foundationElement?.name).toBe('Foundation');
      expect(foundationElement?.type).toBe('element');
      expect(foundationElement?.children).toHaveLength(3); // 1 component + 2 element conditions
      
      // Check component structure
      const concreteComponent = foundationElement?.children.find(child => child.id === 'component-1');
      expect(concreteComponent).toBeDefined();
      expect(concreteComponent?.name).toBe('Concrete Footing');
      expect(concreteComponent?.type).toBe('component');
      expect(concreteComponent?.children).toHaveLength(1); // 1 condition
      
      // Check condition structure
      const crackCondition = concreteComponent?.children.find(child => child.id === 'condition-condition-1');
      expect(crackCondition).toBeDefined();
      expect(crackCondition?.name).toBe('Crack in Foundation');
      expect(crackCondition?.type).toBe('condition');
      expect(crackCondition?.children).toHaveLength(0); // Leaf node
    });

    it('should sort sections and elements by order', async () => {
      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Sections should be ordered
      expect(result.current.treeData[0].name).toBe('Structure'); // order: 1
      expect(result.current.treeData[1].name).toBe('Electrical'); // order: 2
      expect(result.current.treeData[2].name).toBe('Plumbing'); // order: 3

      // Elements within Structure section should be ordered
      const structureSection = result.current.treeData[0];
      expect(structureSection.children[0].name).toBe('Foundation'); // order: 1
      expect(structureSection.children[1].name).toBe('Walls'); // order: 2
    });

    it('should associate conditions with correct entities', async () => {
      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Find component-level condition
      const structureSection = result.current.treeData[0];
      const foundationElement = structureSection.children[0];
      const concreteComponent = foundationElement.children.find(child => child.type === 'component');
      const componentCondition = concreteComponent?.children[0];

      expect(componentCondition?.type).toBe('condition');
      if (componentCondition?.type === 'condition') {
        expect((componentCondition.data as any).associatedComponentIds).toContain('component-1');
      }

      // Find element-level condition (no component association) - should be condition-5
      const elementCondition = foundationElement.children.find(child => 
        child.type === 'condition' && child.data.id === 'condition-5'
      );
      expect(elementCondition?.type).toBe('condition');
      if (elementCondition?.type === 'condition') {
        expect((elementCondition.data as any).associatedComponentIds).toHaveLength(0);
        expect((elementCondition.data as any).associatedElementIds).toContain('element-1');
      }
    });

    it('should handle empty data sets', async () => {
      mockSectionStore.useList.mockReturnValue([true, []]);
      mockElementStore.useList.mockReturnValue([true, []]);
      mockComponentStore.useList.mockReturnValue([true, []]);
      mockPhraseStore.useList.mockReturnValue([true, []]);

      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.treeData).toHaveLength(0);
    });

    it('should handle missing relationships gracefully', async () => {
      // Create orphaned elements and components
      const orphanedElements = [
        {
          ...mockElements[0],
          sectionId: 'non-existent-section-id',
        },
      ];
      
      const orphanedComponents = [
        {
          ...mockComponents[0],
          elementId: 'non-existent-element-id',
        },
      ];

      mockElementStore.useList.mockReturnValue([true, orphanedElements]);
      mockComponentStore.useList.mockReturnValue([true, orphanedComponents]);

      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still render sections, but orphaned elements/components should be ignored
      expect(result.current.treeData).toHaveLength(3);
      expect(result.current.treeData[0].children).toHaveLength(0); // No orphaned elements
    });
  });

  describe('Loading State Tests', () => {
    it('should return loading state when stores are not hydrated', () => {
      mockSectionStore.useList.mockReturnValue([false, []]);

      const { result } = renderHook(() => useHierarchicalData());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.treeData).toHaveLength(0);
    });

    it('should return data when all stores are hydrated', async () => {
      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.treeData.length).toBeGreaterThan(0);
    });

    it('should wait for all stores to be hydrated', () => {
      mockSectionStore.useList.mockReturnValue([true, mockSections]);
      mockElementStore.useList.mockReturnValue([true, mockElements]);
      mockComponentStore.useList.mockReturnValue([false, []]);
      mockPhraseStore.useList.mockReturnValue([true, mockConditions]);

      const { result } = renderHook(() => useHierarchicalData());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain referential integrity in tree structure', async () => {
      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify parent-child relationships
      const structureSection = result.current.treeData[0];
      expect(structureSection.data.id).toBe('section-1');

      const foundationElement = structureSection.children[0];
      if (foundationElement.type === 'element') {
        expect((foundationElement.data as any).sectionId).toBe('section-1');
      }

      const concreteComponent = foundationElement.children.find(child => child.type === 'component');
      if (concreteComponent?.type === 'component') {
        expect((concreteComponent.data as any).elementId).toBe('element-1');
      }

      const condition = concreteComponent?.children[0];
      if (condition?.type === 'condition') {
        expect((condition.data as any).associatedElementIds).toContain('element-1');
        expect((condition.data as any).associatedComponentIds).toContain('component-1');
      }
    });

    it('should handle circular references safely', async () => {
      // Create a circular reference scenario (shouldn't happen in real data but test for safety)
      const circularElements = [
        { ...mockElements[0], sectionId: 'element-1' }, // Element referencing itself indirectly
      ];

      mockElementStore.useList.mockReturnValue([true, circularElements]);

      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not crash and should handle gracefully
      expect(result.current.isLoading).toBe(false);
      expect(result.current.treeData).toBeDefined();
    });

    it('should preserve all entity metadata', async () => {
      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const structureSection = result.current.treeData[0];
      expect(structureSection.data).toEqual(mockSections[0]);

      const foundationElement = structureSection.children[0];
      expect(foundationElement.data).toEqual(mockElements[0]);

      const concreteComponent = foundationElement.children.find(child => child.type === 'component');
      expect(concreteComponent?.data).toEqual(mockComponents[0]);

      const condition = concreteComponent?.children[0];
      expect(condition?.data).toEqual(mockConditions[0]);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeSections = Array.from({ length: 100 }, (_, i) => ({
        ...mockSections[0],
        id: `section-${i}`,
        name: `Section ${i}`,
        order: i,
      }));

      const largeElements = Array.from({ length: 1000 }, (_, i) => ({
        ...mockElements[0],
        id: `element-${i}`,
        name: `Element ${i}`,
        sectionId: `section-${i % 100}`,
        order: i,
      }));

      mockSectionStore.useList.mockReturnValue([true, largeSections]);
      mockElementStore.useList.mockReturnValue([true, largeElements]);

      const startTime = performance.now();
      
      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.current.treeData).toHaveLength(100);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should memoize results to avoid unnecessary recalculations', async () => {
      const { result, rerender } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstResult = result.current.treeData;

      // Rerender should return same reference if data hasn't changed
      rerender();

      expect(result.current.treeData).toBe(firstResult);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle store errors by throwing', () => {
      mockSectionStore.useList.mockImplementation(() => {
        throw new Error('Store error');
      });

      // Should throw the error since no error handling is implemented
      expect(() => {
        renderHook(() => useHierarchicalData());
      }).toThrow('Store error');
    });

    it('should handle malformed data gracefully', async () => {
      const malformedSections = [
        { ...mockSections[0], id: null, name: undefined }, // Missing required fields
      ];

      mockSectionStore.useList.mockReturnValue([true, malformedSections as any]);

      const { result } = renderHook(() => useHierarchicalData());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should filter out malformed data or handle gracefully
      expect(result.current.isLoading).toBe(false);
    });
  });
});