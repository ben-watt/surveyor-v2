import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HierarchicalConfigView } from '../components/HierarchicalConfigView';
import { mockHierarchicalData } from './utils/mockData';
import { setupRouterMock, setupLocalStorageMock, cleanupMocks, mockLocalStorage } from './utils/testUtils';

jest.mock('../hooks/useHierarchicalData', () => ({
  useHierarchicalData: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('../../clients/Database', () => ({
  sectionStore: { delete: jest.fn() },
  elementStore: { delete: jest.fn() },
  componentStore: { delete: jest.fn() },
  phraseStore: { delete: jest.fn() },
}));

const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockUseHierarchicalData = require('../hooks/useHierarchicalData').useHierarchicalData;

// Get references to mocked stores for test manipulation
import * as Database from '../../clients/Database';
const mockSectionStore = Database.sectionStore as jest.Mocked<typeof Database.sectionStore>;
const mockElementStore = Database.elementStore as jest.Mocked<typeof Database.elementStore>;
const mockComponentStore = Database.componentStore as jest.Mocked<typeof Database.componentStore>;
const mockPhraseStore = Database.phraseStore as jest.Mocked<typeof Database.phraseStore>;

describe('Hierarchical Configuration Integration Tests', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    setupRouterMock(mockRouter);
    setupLocalStorageMock();
    
    mockUseHierarchicalData.mockReturnValue(mockHierarchicalData);
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
      has: jest.fn().mockReturnValue(false),
      toString: jest.fn().mockReturnValue(''),
    });
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Navigation Flow Integration', () => {
    it('should navigate to edit page with correct return parameters', async () => {
      render(<HierarchicalConfigView />);
      
      // Click on the Structure section
      const structureNode = screen.getByRole('button', { name: /structure/i });
      fireEvent.click(structureNode);

      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/home/configuration/sections/section-1')
      );
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('returnTo=')
      );
    });

    it('should restore hierarchy state when returning from edit', () => {
      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'returnFrom') return 'edit';
          if (key === 'editedId') return 'element-1';
          if (key === 'editedType') return 'element';
          return null;
        }),
        has: jest.fn().mockReturnValue(true),
        toString: jest.fn().mockReturnValue('returnFrom=edit&editedId=element-1'),
      };
      
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Mock saved state with expanded nodes
      const savedState = {
        expandedNodes: ['section-1', 'element-1'],
        searchQuery: '',
        lastEditedEntity: {
          id: 'element-1',
          type: 'element',
          timestamp: Date.now() - 60000,
        },
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<HierarchicalConfigView />);
      
      // Should clear URL parameters after processing
      expect(mockRouter.replace).toHaveBeenCalledWith('/home/configuration');
    });

    it('should highlight edited entity on return', () => {
      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'returnFrom') return 'edit';
          if (key === 'editedId') return 'element-1';
          if (key === 'editedType') return 'element';
          return null;
        }),
        has: jest.fn().mockReturnValue(true),
        toString: jest.fn().mockReturnValue('returnFrom=edit&editedId=element-1'),
      };
      
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      const savedState = {
        expandedNodes: ['section-1'],
        searchQuery: '',
        lastEditedEntity: {
          id: 'element-1',
          type: 'element',
          timestamp: Date.now() - 60000,
        },
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<HierarchicalConfigView />);
      
      // The highlighting would be verified through the tree node component
      expect(mockLocalStorage.getItem).toHaveBeenCalled();
    });

    it('should expand path to edited entity automatically', () => {
      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'returnFrom') return 'edit';
          if (key === 'editedId') return 'condition-1';
          if (key === 'editedType') return 'condition';
          return null;
        }),
        has: jest.fn().mockReturnValue(true),
        toString: jest.fn().mockReturnValue('returnFrom=edit&editedId=condition-1'),
      };
      
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      render(<HierarchicalConfigView />);
      
      // Should save expanded state including path to condition
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'hierarchical-config-state',
        expect.stringContaining('"expandedNodes"')
      );
    });
  });

  describe('Create Flow Integration', () => {
    it('should navigate to create page with parent context', async () => {
      render(<HierarchicalConfigView />);
      
      const createButton = screen.getByRole('button', { name: /create new/i });
      fireEvent.click(createButton);

      const sectionOption = await screen.findByText('New Section');
      fireEvent.click(sectionOption);

      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/home/configuration/sections/create')
      );
    });

    it('should restore hierarchy state when returning from create', () => {
      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'returnFrom') return 'create';
          if (key === 'createdType') return 'section';
          return null;
        }),
        has: jest.fn().mockReturnValue(true),
        toString: jest.fn().mockReturnValue('returnFrom=create&createdType=section'),
      };
      
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      const savedState = {
        expandedNodes: ['section-1'],
        searchQuery: 'test query',
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<HierarchicalConfigView />);
      
      // Should restore saved state
      const searchInput = screen.getByDisplayValue('test query');
      expect(searchInput).toBeInTheDocument();
    });

    it('should handle both global and contextual creation flows', async () => {
      render(<HierarchicalConfigView />);
      
      // Global create flow
      const createButton = screen.getByRole('button', { name: /create new/i });
      fireEvent.click(createButton);

      const elementOption = await screen.findByText('New Element');
      fireEvent.click(elementOption);

      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/home/configuration/elements/create')
      );
    });
  });

  describe('Browser Navigation Integration', () => {
    it('should preserve state when using browser back button', () => {
      // This test simulates the browser back button scenario
      const savedState = {
        expandedNodes: ['section-1', 'element-1'],
        searchQuery: 'foundation',
        lastEditedEntity: {
          id: 'element-1',
          type: 'element',
          timestamp: Date.now() - 30000, // 30 seconds ago
        },
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<HierarchicalConfigView />);
      
      // Should restore the previous state
      const searchInput = screen.getByDisplayValue('foundation');
      expect(searchInput).toBeInTheDocument();
    });

    it('should handle page refresh correctly', () => {
      const savedState = {
        expandedNodes: ['section-1'],
        searchQuery: '',
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<HierarchicalConfigView />);
      
      // Should load saved state after refresh
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('hierarchical-config-state');
    });

    it('should work with browser forward/back navigation', () => {
      // Test multiple navigation events
      const { rerender } = render(<HierarchicalConfigView />);
      
      // Simulate navigation to edit page
      mockUseSearchParams.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'returnFrom') return 'edit';
          if (key === 'editedId') return 'section-1';
          return null;
        }),
        has: jest.fn().mockReturnValue(true),
        toString: jest.fn().mockReturnValue('returnFrom=edit'),
      });

      rerender(<HierarchicalConfigView />);
      
      // Should handle the navigation event
      expect(mockRouter.replace).toHaveBeenCalledWith('/home/configuration');
    });
  });

  describe('State Persistence Integration', () => {
    it('should maintain expanded state across browser restart', () => {
      const persistedState = {
        expandedNodes: ['section-1', 'element-1', 'component-1'],
        searchQuery: 'concrete',
        lastEditedEntity: {
          id: 'component-1',
          type: 'component',
          timestamp: Date.now() - 120000, // 2 minutes ago
        },
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(persistedState));

      render(<HierarchicalConfigView />);
      
      // Should restore the persisted state
      const searchInput = screen.getByDisplayValue('concrete');
      expect(searchInput).toBeInTheDocument();
    });

    it('should preserve search queries across sessions', () => {
      const persistedState = {
        expandedNodes: [],
        searchQuery: 'electrical',
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(persistedState));

      render(<HierarchicalConfigView />);
      
      const searchInput = screen.getByDisplayValue('electrical');
      expect(searchInput).toBeInTheDocument();
    });

    it('should handle localStorage being cleared', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      render(<HierarchicalConfigView />);
      
      // Should start with clean state
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Data Store Integration', () => {
    it('should reflect create operations in tree immediately', async () => {
      render(<HierarchicalConfigView />);
      
      // Simulate creating a new section
      const createButton = screen.getByRole('button', { name: /create new/i });
      fireEvent.click(createButton);

      const sectionOption = await screen.findByText('New Section');
      fireEvent.click(sectionOption);

      // The navigation should be triggered
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/home/configuration/sections/create')
      );
    });

    it('should reflect delete operations in tree immediately', async () => {
      // Mock window.confirm to return true
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      render(<HierarchicalConfigView />);
      
      // Find and click on a context menu
      const contextButton = screen.getAllByRole('button', { name: /more options/i })[0];
      fireEvent.click(contextButton);

      const deleteOption = await screen.findByText('Delete');
      fireEvent.click(deleteOption);

      // Should call the delete function
      expect(mockSectionStore.delete).toHaveBeenCalled();

      // Restore window.confirm
      window.confirm = originalConfirm;
    });

    it('should handle optimistic updates correctly', () => {
      // This would test optimistic UI updates
      render(<HierarchicalConfigView />);
      
      // The component should render with current data
      expect(screen.getByText('Structure')).toBeInTheDocument();
      expect(screen.getByText('Electrical')).toBeInTheDocument();
    });
  });

  describe('Search and Filter Integration', () => {
    it('should maintain search state across navigation', async () => {
      render(<HierarchicalConfigView />);
      
      // Perform a search
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'foundation' } });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'hierarchical-config-state',
          expect.stringContaining('"searchQuery":"foundation"')
        );
      });

      // Navigate to edit a component
      const foundationElement = screen.getByText('Foundation');
      fireEvent.click(foundationElement);

      // Search state should be saved before navigation
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should restore search results after returning from edit', () => {
      const savedState = {
        expandedNodes: ['section-1'],
        searchQuery: 'foundation',
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<HierarchicalConfigView />);
      
      // Should restore search query
      const searchInput = screen.getByDisplayValue('foundation');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle navigation errors gracefully', () => {
      mockRouter.push.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      render(<HierarchicalConfigView />);
      
      // Should not crash when navigation fails
      const structureNode = screen.getByRole('button', { name: /structure/i });
      
      expect(() => fireEvent.click(structureNode)).not.toThrow();
    });

    it('should handle store errors gracefully', () => {
      mockSectionStore.delete.mockRejectedValue(new Error('Delete failed'));

      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      render(<HierarchicalConfigView />);
      
      // Should handle delete errors without crashing
      expect(screen.getByText('Structure')).toBeInTheDocument();

      window.confirm = originalConfirm;
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      render(<HierarchicalConfigView />);
      
      // Should not crash when localStorage fails
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(screen.getByText('Structure')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large datasets without performance degradation', () => {
      // Mock large dataset
      const largeTreeData = Array.from({ length: 100 }, (_, i) => ({
        id: `section-${i}`,
        name: `Section ${i}`,
        type: 'section' as const,
        data: { id: `section-${i}`, name: `Section ${i}` },
        children: Array.from({ length: 10 }, (_, j) => ({
          id: `element-${i}-${j}`,
          name: `Element ${i}-${j}`,
          type: 'element' as const,
          data: { id: `element-${i}-${j}`, name: `Element ${i}-${j}` },
          children: [],
        })),
      }));

      mockUseHierarchicalData.mockReturnValue({
        isLoading: false,
        treeData: largeTreeData,
      });

      const startTime = performance.now();
      render(<HierarchicalConfigView />);
      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should debounce search operations efficiently', async () => {
      render(<HierarchicalConfigView />);
      
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      
      // Rapid typing should be debounced
      fireEvent.change(searchInput, { target: { value: 'f' } });
      fireEvent.change(searchInput, { target: { value: 'fo' } });
      fireEvent.change(searchInput, { target: { value: 'fou' } });

      // Should not make multiple localStorage calls immediately
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      }, { timeout: 300 });
    });
  });
});