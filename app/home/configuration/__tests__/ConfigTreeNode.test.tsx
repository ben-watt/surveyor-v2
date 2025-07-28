import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigTreeNode } from '../components/ConfigTreeNode';
import { mockHierarchicalData } from './utils/mockData';
import { setupRouterMock, setupLocalStorageMock, cleanupMocks, mockLocalStorage } from './utils/testUtils';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../clients/Database', () => ({
  sectionStore: { delete: jest.fn() },
  elementStore: { delete: jest.fn() },
  componentStore: { delete: jest.fn() },
  phraseStore: { delete: jest.fn() },
}));

// Get references to mocked stores for test manipulation  
import * as Database from '../../clients/Database';
const mockSectionStore = Database.sectionStore as jest.Mocked<typeof Database.sectionStore>;
const mockElementStore = Database.elementStore as jest.Mocked<typeof Database.elementStore>;
const mockComponentStore = Database.componentStore as jest.Mocked<typeof Database.componentStore>;
const mockPhraseStore = Database.phraseStore as jest.Mocked<typeof Database.phraseStore>;

describe('ConfigTreeNode', () => {
  const mockNode = mockHierarchicalData.treeData[0]; // Structure section
  const mockChildNode = mockNode.children[0]; // Foundation element
  const mockComponentNode = mockChildNode.children[0]; // Concrete Footing component
  const mockConditionNode = mockComponentNode.children[0]; // Crack condition

  const defaultProps = {
    node: mockNode,
    expandedNodes: new Set(['section-1']),
    onToggleExpand: jest.fn(),
    onDeleteEntity: jest.fn(),
    onCreateChild: jest.fn(),
    searchQuery: '',
    isHighlighted: false,
  };

  beforeEach(() => {
    setupRouterMock();
    setupLocalStorageMock();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Rendering Tests', () => {
    it('should render section with correct icon and data', () => {
      render(<ConfigTreeNode {...defaultProps} />);
      
      expect(screen.getByText('Structure')).toBeInTheDocument();
      // Look for the layers icon (section icon) by class
      expect(document.querySelector('.lucide-layers')).toBeInTheDocument();
      // Check for element count badge
      expect(screen.getByText('2 elements')).toBeInTheDocument();
    });

    it('should render element with correct icon and metadata', () => {
      render(<ConfigTreeNode {...defaultProps} node={mockChildNode} />);
      
      expect(screen.getByText('Foundation')).toBeInTheDocument();
      // Look for the grid icon (element icon) by class
      expect(document.querySelector('.lucide-grid-2x2')).toBeInTheDocument();
      expect(screen.getByText('Building foundation system')).toBeInTheDocument();
    });

    it('should render component with material badge', () => {
      render(<ConfigTreeNode {...defaultProps} node={mockComponentNode} />);
      
      expect(screen.getByText('Concrete Footing')).toBeInTheDocument();
      // Look for the blocks icon (component icon) by class
      expect(document.querySelector('.lucide-blocks')).toBeInTheDocument();
      expect(screen.getByText('Concrete')).toBeInTheDocument();
    });

    it('should render condition with severity badge', () => {
      render(<ConfigTreeNode {...defaultProps} node={mockConditionNode} />);
      
      expect(screen.getByText('Crack in Foundation')).toBeInTheDocument();
      // Look for the message-square icon (condition icon) by class
      expect(document.querySelector('.lucide-message-square')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });

    it('should show/hide expand/collapse buttons based on children', () => {
      // Node with children should show expand button
      render(<ConfigTreeNode {...defaultProps} />);
      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();

      // Leaf node should not show expand button
      render(<ConfigTreeNode {...defaultProps} node={mockConditionNode} />);
      expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument();
    });

    it('should apply highlighting for recently edited entities', () => {
      render(<ConfigTreeNode {...defaultProps} isHighlighted={true} />);
      
      const nodeContainer = screen.getByRole('button', { name: /structure/i });
      expect(nodeContainer).toHaveClass('ring-2', 'ring-blue-500');
    });

    it('should render mobile-responsive layouts', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<ConfigTreeNode {...defaultProps} />);
      
      const nodeContainer = screen.getByRole('button', { name: /structure/i });
      expect(nodeContainer).toHaveClass('min-h-[44px]'); // Mobile touch target
    });
  });

  describe('Navigation Tests', () => {
    it('should navigate to edit page when clicking entity', () => {
      const mockPush = jest.fn();
      setupRouterMock({ push: mockPush });

      render(<ConfigTreeNode {...defaultProps} />);
      
      const nodeButton = screen.getByRole('button', { name: /structure/i });
      fireEvent.click(nodeButton);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/home/configuration/sections/section-1')
      );
    });

    it('should include return parameters in navigation URLs', () => {
      const mockPush = jest.fn();
      setupRouterMock({ push: mockPush });

      render(<ConfigTreeNode {...defaultProps} />);
      
      const nodeButton = screen.getByRole('button', { name: /structure/i });
      fireEvent.click(nodeButton);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('returnTo=')
      );
    });

    it('should save navigation context before navigating', () => {
      const mockPush = jest.fn();
      setupRouterMock({ push: mockPush });

      render(<ConfigTreeNode {...defaultProps} />);
      
      const nodeButton = screen.getByRole('button', { name: /structure/i });
      fireEvent.click(nodeButton);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'hierarchical-config-state',
        expect.stringContaining('"lastEditedEntity"')
      );
    });
  });

  describe('Context Menu Tests', () => {
    it('should show edit and delete options for all entities', async () => {
      render(<ConfigTreeNode {...defaultProps} />);
      
      const contextButton = screen.getByRole('button', { name: /more options/i });
      fireEvent.click(contextButton);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });

    it('should show contextual create options based on entity type', async () => {
      render(<ConfigTreeNode {...defaultProps} />);
      
      const contextButton = screen.getByRole('button', { name: /more options/i });
      fireEvent.click(contextButton);

      await waitFor(() => {
        expect(screen.getByText('Add Element')).toBeInTheDocument();
      });
    });

    it('should hide create options for leaf nodes (conditions)', async () => {
      render(<ConfigTreeNode {...defaultProps} node={mockConditionNode} />);
      
      const contextButton = screen.getByRole('button', { name: /more options/i });
      fireEvent.click(contextButton);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
        expect(screen.queryByText('Add')).not.toBeInTheDocument();
      });
    });

    it('should call correct handlers for each menu action', async () => {
      const mockOnCreateChild = jest.fn();
      
      render(<ConfigTreeNode {...defaultProps} onCreateChild={mockOnCreateChild} />);
      
      const contextButton = screen.getByRole('button', { name: /more options/i });
      fireEvent.click(contextButton);

      const addElementOption = screen.getByText('Add Element');
      fireEvent.click(addElementOption);

      expect(mockOnCreateChild).toHaveBeenCalledWith('element', 'section-1');
    });
  });

  describe('CRUD Operations Tests', () => {
    it('should call delete function with confirmation', async () => {
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      const mockOnDeleteEntity = jest.fn();
      
      render(<ConfigTreeNode {...defaultProps} onDeleteEntity={mockOnDeleteEntity} />);
      
      const contextButton = screen.getByRole('button', { name: /more options/i });
      fireEvent.click(contextButton);

      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete')
      );
      expect(mockOnDeleteEntity).toHaveBeenCalledWith('section', 'section-1');

      // Restore window.confirm
      window.confirm = originalConfirm;
    });

    it('should call create child function with correct parameters', async () => {
      const mockOnCreateChild = jest.fn();
      
      render(<ConfigTreeNode {...defaultProps} node={mockChildNode} onCreateChild={mockOnCreateChild} />);
      
      const contextButton = screen.getByRole('button', { name: /more options/i });
      fireEvent.click(contextButton);

      const addComponentOption = screen.getByText('Add Component');
      fireEvent.click(addComponentOption);

      expect(mockOnCreateChild).toHaveBeenCalledWith('component', 'element-1');
    });

    it('should handle delete errors gracefully', async () => {
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      const mockOnDeleteEntity = jest.fn().mockRejectedValue(new Error('Delete failed'));
      
      render(<ConfigTreeNode {...defaultProps} onDeleteEntity={mockOnDeleteEntity} />);
      
      const contextButton = screen.getByRole('button', { name: /more options/i });
      fireEvent.click(contextButton);

      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);

      await waitFor(() => {
        expect(mockOnDeleteEntity).toHaveBeenCalled();
      });

      window.confirm = originalConfirm;
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels', () => {
      render(<ConfigTreeNode {...defaultProps} />);
      
      const nodeButton = screen.getByRole('button', { name: /structure/i });
      expect(nodeButton).toHaveAttribute('aria-label');
      
      const expandButton = screen.getByRole('button', { name: /expand/i });
      expect(expandButton).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      render(<ConfigTreeNode {...defaultProps} />);
      
      const nodeButton = screen.getByRole('button', { name: /structure/i });
      
      // Test focus
      nodeButton.focus();
      expect(nodeButton).toHaveFocus();
      
      // Test Enter key
      fireEvent.keyDown(nodeButton, { key: 'Enter' });
      // Navigation should be triggered (tested in navigation tests)
    });

    it('should have sufficient touch targets for mobile', () => {
      render(<ConfigTreeNode {...defaultProps} />);
      
      const nodeButton = screen.getByRole('button', { name: /structure/i });
      expect(nodeButton).toHaveClass('min-h-[44px]');
      
      const contextButton = screen.getByRole('button', { name: /more options/i });
      expect(contextButton).toHaveClass('h-8', 'w-8');
    });
  });

  describe('Tree Structure Tests', () => {
    it('should render children when expanded', () => {
      render(<ConfigTreeNode {...defaultProps} expandedNodes={new Set(['section-1'])} />);
      
      expect(screen.getByText('Foundation')).toBeInTheDocument();
      expect(screen.getByText('Walls')).toBeInTheDocument();
    });

    it('should not render children when collapsed', () => {
      render(<ConfigTreeNode {...defaultProps} expandedNodes={new Set()} />);
      
      expect(screen.queryByText('Foundation')).not.toBeInTheDocument();
      expect(screen.queryByText('Walls')).not.toBeInTheDocument();
    });

    it('should handle nested expansion correctly', () => {
      const expandedNodes = new Set(['section-1', 'element-1']);
      
      render(<ConfigTreeNode {...defaultProps} expandedNodes={expandedNodes} />);
      
      expect(screen.getByText('Foundation')).toBeInTheDocument();
      expect(screen.getByText('Concrete Footing')).toBeInTheDocument();
    });
  });

  describe('Search Highlighting Tests', () => {
    it('should highlight matching text in search results', () => {
      render(<ConfigTreeNode {...defaultProps} searchQuery="Structure" />);
      
      const highlightedText = screen.getByText('Structure');
      expect(highlightedText.closest('span')).toHaveClass('bg-yellow-200');
    });

    it('should handle case-insensitive search highlighting', () => {
      render(<ConfigTreeNode {...defaultProps} searchQuery="structure" />);
      
      const highlightedText = screen.getByText('Structure');
      expect(highlightedText.closest('span')).toHaveClass('bg-yellow-200');
    });
  });
});