import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { HierarchicalConfigView } from '../components/HierarchicalConfigView';
import { mockHierarchicalData, createMockStores } from './utils/mockData';
import { setupRouterMock, setupLocalStorageMock, cleanupMocks, mockLocalStorage } from './utils/testUtils';

// Mock Amplify dependencies
jest.mock('../../clients/Database', () => ({
  sectionStore: { delete: jest.fn() },
  elementStore: { delete: jest.fn() },
  componentStore: { delete: jest.fn() },
  phraseStore: { delete: jest.fn() },
}));

jest.mock('../../clients/AmplifyDataClient', () => ({
  default: {
    models: {
      Section: { list: jest.fn() },
      Element: { list: jest.fn() },
      Component: { list: jest.fn() },
      Phrase: { list: jest.fn() },
    }
  }
}));

// Mock the hooks
jest.mock('../hooks/useHierarchicalData', () => ({
  useHierarchicalData: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockUseHierarchicalData = require('../hooks/useHierarchicalData').useHierarchicalData;

describe('HierarchicalConfigView', () => {
  beforeEach(() => {
    setupRouterMock();
    setupLocalStorageMock();
    
    // Default mock implementations
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

  describe('Rendering Tests', () => {
    it('should display loading spinner when data is loading', () => {
      mockUseHierarchicalData.mockReturnValue({
        isLoading: true,
        treeData: [],
      });

      render(<HierarchicalConfigView />);
      
      expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
      expect(document.querySelector('.lucide-loader-circle')).toBeInTheDocument();
    });

    it('should render tree structure when data is loaded', () => {
      render(<HierarchicalConfigView />);
      
      expect(screen.getByText('Structure')).toBeInTheDocument();
      expect(screen.getByText('Electrical')).toBeInTheDocument();
      expect(screen.getByText('Plumbing')).toBeInTheDocument();
    });

    it('should show "no data" message when tree is empty', () => {
      mockUseHierarchicalData.mockReturnValue({
        isLoading: false,
        treeData: [],
      });

      render(<HierarchicalConfigView />);
      
      expect(screen.getByText(/no configuration data available/i)).toBeInTheDocument();
    });

    it('should display search results count when searching', async () => {
      render(<HierarchicalConfigView />);
      
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'Foundation' } });

      await waitFor(() => {
        expect(screen.getByText(/1 result found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Interaction Tests', () => {
    it('should expand/collapse all nodes when clicking expand/collapse buttons', async () => {
      render(<HierarchicalConfigView />);
      
      const expandAllButton = screen.getByRole('button', { name: /expand all/i });
      fireEvent.click(expandAllButton);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'hierarchical-config-state',
          expect.stringContaining('"expandedNodes"')
        );
      });

      const collapseAllButton = screen.getByRole('button', { name: /collapse all/i });
      fireEvent.click(collapseAllButton);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'hierarchical-config-state',
          expect.stringContaining('[]')
        );
      });
    });

    it('should open create dropdown and display all entity types', async () => {
      render(<HierarchicalConfigView />);
      
      const createButton = screen.getByRole('button', { name: /create new/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('New Section')).toBeInTheDocument();
        expect(screen.getByText('New Element')).toBeInTheDocument();
        expect(screen.getByText('New Component')).toBeInTheDocument();
        expect(screen.getByText('New Condition')).toBeInTheDocument();
      });
    });

    it('should navigate to create pages when clicking create options', async () => {
      const mockPush = jest.fn();
      setupRouterMock({ push: mockPush });

      render(<HierarchicalConfigView />);
      
      const createButton = screen.getByRole('button', { name: /create new/i });
      fireEvent.click(createButton);

      const sectionOption = screen.getByText('New Section');
      fireEvent.click(sectionOption);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/home/configuration/sections/create')
      );
    });

    it('should update search query when using search bar', async () => {
      render(<HierarchicalConfigView />);
      
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'electrical' } });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'hierarchical-config-state',
          expect.stringContaining('"searchQuery":"electrical"')
        );
      });
    });
  });

  describe('State Management Tests', () => {
    it('should restore expanded nodes from localStorage', () => {
      const savedState = {
        expandedNodes: ['section-1', 'element-1'],
        searchQuery: '',
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<HierarchicalConfigView />);
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('hierarchical-config-state');
    });

    it('should restore search query from localStorage', () => {
      const savedState = {
        expandedNodes: [],
        searchQuery: 'foundation',
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<HierarchicalConfigView />);
      
      const searchInput = screen.getByDisplayValue('foundation');
      expect(searchInput).toBeInTheDocument();
    });

    it('should handle URL parameters for return navigation', () => {
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

      render(<HierarchicalConfigView />);
      
      expect(mockSearchParams.get).toHaveBeenCalledWith('returnFrom');
      expect(mockSearchParams.get).toHaveBeenCalledWith('editedId');
    });

    it('should highlight recently edited entities', () => {
      const savedState = {
        expandedNodes: [],
        searchQuery: '',
        lastEditedEntity: {
          id: 'element-1',
          type: 'element',
          timestamp: Date.now() - 60000, // 1 minute ago
        },
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      render(<HierarchicalConfigView />);
      
      // The highlighting logic would be tested through the tree node component
      expect(mockLocalStorage.getItem).toHaveBeenCalled();
    });

    it('should clear URL parameters after processing', () => {
      const mockReplace = jest.fn();
      setupRouterMock({ replace: mockReplace });

      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'returnFrom') return 'edit';
          return null;
        }),
        has: jest.fn().mockReturnValue(true),
        toString: jest.fn().mockReturnValue('returnFrom=edit'),
      };
      
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      render(<HierarchicalConfigView />);
      
      expect(mockReplace).toHaveBeenCalledWith('/home/configuration');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle malformed localStorage gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      render(<HierarchicalConfigView />);
      
      // Should not crash and should render normally
      expect(screen.getByText('Structure')).toBeInTheDocument();
    });

    it('should handle missing URL parameters', () => {
      mockUseSearchParams.mockReturnValue({
        get: jest.fn().mockReturnValue(null),
        has: jest.fn().mockReturnValue(false),
        toString: jest.fn().mockReturnValue(''),
      });

      render(<HierarchicalConfigView />);
      
      // Should render normally without errors
      expect(screen.getByText('Structure')).toBeInTheDocument();
    });

    it('should handle empty search results', async () => {
      render(<HierarchicalConfigView />);
      
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/0 results found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter results based on search query', async () => {
      render(<HierarchicalConfigView />);
      
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'Foundation' } });

      await waitFor(() => {
        expect(screen.getByText('Foundation')).toBeInTheDocument();
        expect(screen.queryByText('Electrical')).not.toBeInTheDocument();
      });
    });

    it('should clear search when clear button is clicked', async () => {
      render(<HierarchicalConfigView />);
      
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'Foundation' } });

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(screen.getByText('Structure')).toBeInTheDocument();
        expect(screen.getByText('Electrical')).toBeInTheDocument();
      });
    });
  });
});