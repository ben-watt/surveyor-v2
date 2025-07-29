import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigSearchBar } from '../components/ConfigSearchBar';
import { cleanupMocks } from './utils/testUtils';
import { mockHierarchicalData } from './utils/mockData';

describe('ConfigSearchBar', () => {
  const defaultProps = {
    onSearch: jest.fn(),
    treeData: mockHierarchicalData.treeData,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Search Functionality Tests', () => {
    it('should update search query on input change', async () => {
      const mockOnSearch = jest.fn();
      
      render(<ConfigSearchBar {...defaultProps} onSearch={mockOnSearch} />);
      
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'foundation' } });

      // Wait for the useEffect to trigger the search
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('foundation', expect.any(Array));
      });
    });

    it('should trigger search on Enter key', async () => {
      const mockOnSearch = jest.fn();
      
      render(<ConfigSearchBar {...defaultProps} onSearch={mockOnSearch} />);
      
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'foundation' } });
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('foundation', expect.any(Array));
      });
    });

    it('should have a filter dropdown', () => {
      const mockOnSearch = jest.fn();
      
      render(<ConfigSearchBar {...defaultProps} onSearch={mockOnSearch} />);
      
      // Should have a combobox for filtering
      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toBeInTheDocument();
    });

    it('should clear search when clicking clear button', async () => {
      const mockOnSearch = jest.fn();
      
      render(<ConfigSearchBar {...defaultProps} onSearch={mockOnSearch} />);
      
      // First, enter a search query to make the clear button appear
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'foundation' } });
      
      // Wait for clear button to appear
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole('button');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('', expect.any(Array));
      });
    });

    it('should only show clear button when search query exists', async () => {
      render(<ConfigSearchBar {...defaultProps} />);
      
      // Initially no clear button visible
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      
      // Enter a search query
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'foundation' } });
      
      // Clear button should now appear
      await waitFor(() => {
        const clearButton = screen.queryByRole('button');
        expect(clearButton).toBeInTheDocument();
      });
    });
  });

  describe('Results Display Tests', () => {
    it('should show match count when searching', async () => {
      render(<ConfigSearchBar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'Foundation' } });
      
      await waitFor(() => {
        expect(screen.getByText(/results found/)).toBeInTheDocument();
      });
    });

    it('should not show match count when no search query', () => {
      render(<ConfigSearchBar {...defaultProps} />);
      
      expect(screen.queryByText(/results found/)).not.toBeInTheDocument();
    });

    it('should show entity filter badge when filter is active', async () => {
      render(<ConfigSearchBar {...defaultProps} />);
      
      // Enter search query first (needed to show badges)
      const searchInput = screen.getByPlaceholderText(/search configuration/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Change filter
      const selectTrigger = screen.getByRole('combobox');
      fireEvent.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByText('Sections')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Sections'));
      
      await waitFor(() => {
        expect(screen.getByText('section')).toBeInTheDocument();
      });
    });

  });

  describe('Component Rendering Tests', () => {
    it('should render search input and filter dropdown', () => {
      render(<ConfigSearchBar {...defaultProps} />);
      
      expect(screen.getByPlaceholderText(/search configuration/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should call onSearch when component mounts', async () => {
      const mockOnSearch = jest.fn();
      
      render(<ConfigSearchBar {...defaultProps} onSearch={mockOnSearch} />);
      
      // The component has a 300ms debounce, so we need to wait
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      }, { timeout: 500 });
    });
  });
});