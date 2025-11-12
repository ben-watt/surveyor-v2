/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VariableAutocomplete } from '../VariableAutocomplete';
import type { AutocompleteSuggestion } from '@/app/home/components/TipTapExtensions/HandlebarsAutocomplete';

const mockCommand = jest.fn();

const mockSuggestions: AutocompleteSuggestion[] = [
  {
    label: 'Current Page Number',
    content: 'pageNumber',
    type: 'page-counter',
    description: 'Displays the current page number',
  },
  {
    label: 'Client Name',
    path: 'reportDetails.clientName',
    content: 'reportDetails.clientName',
    type: 'variable',
  },
];

describe('VariableAutocomplete', () => {
  beforeEach(() => {
    mockCommand.mockClear();
  });

  describe('Empty State', () => {
    it('should show "No variables found" when items array is empty', () => {
      render(<VariableAutocomplete items={[]} command={mockCommand} />);

      expect(screen.getByText('No variables found')).toBeInTheDocument();
    });
  });

  describe('Suggestions Display', () => {
    it('should render all suggestions', () => {
      render(<VariableAutocomplete items={mockSuggestions} command={mockCommand} />);

      expect(screen.getByText('Current Page Number')).toBeInTheDocument();
      expect(screen.getByText('Client Name')).toBeInTheDocument();
    });

    it('should display suggestion type badges', () => {
      render(<VariableAutocomplete items={mockSuggestions} command={mockCommand} />);

      const badges = screen.getAllByText(/page-counter|variable/);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Search Hint', () => {
    it('should show "Type to search more variables..." hint when query is empty and suggestions exist', () => {
      render(
        <VariableAutocomplete items={mockSuggestions} command={mockCommand} query="" />,
      );

      expect(screen.getByText('Type to search more variables...')).toBeInTheDocument();
    });

    it('should show hint when query is whitespace only', () => {
      render(
        <VariableAutocomplete items={mockSuggestions} command={mockCommand} query="   " />,
      );

      expect(screen.getByText('Type to search more variables...')).toBeInTheDocument();
    });

    it('should not show hint when query has content', () => {
      render(
        <VariableAutocomplete items={mockSuggestions} command={mockCommand} query="client" />,
      );

      expect(screen.queryByText('Type to search more variables...')).not.toBeInTheDocument();
    });

    it('should not show hint when items array is empty', () => {
      render(<VariableAutocomplete items={[]} command={mockCommand} query="" />);

      expect(screen.queryByText('Type to search more variables...')).not.toBeInTheDocument();
    });

    it('should not show hint when query is undefined', () => {
      render(<VariableAutocomplete items={mockSuggestions} command={mockCommand} />);

      // When query is undefined, it should be treated as empty
      expect(screen.getByText('Type to search more variables...')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle keyboard events through ref', () => {
      const ref = React.createRef<{ onKeyDown: (event: KeyboardEvent) => boolean }>();
      render(
        <VariableAutocomplete
          ref={ref}
          items={mockSuggestions}
          command={mockCommand}
          query=""
        />,
      );

      expect(ref.current).toBeDefined();
      expect(ref.current?.onKeyDown).toBeDefined();

      const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const handled = ref.current?.onKeyDown(arrowDownEvent);
      expect(handled).toBe(true);
    });

    it('should handle Enter key to select item', () => {
      const ref = React.createRef<{ onKeyDown: (event: KeyboardEvent) => boolean }>();
      render(
        <VariableAutocomplete
          ref={ref}
          items={mockSuggestions}
          command={mockCommand}
          query=""
        />,
      );

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      ref.current?.onKeyDown(enterEvent);

      expect(mockCommand).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('should handle Escape key', () => {
      const ref = React.createRef<{ onKeyDown: (event: KeyboardEvent) => boolean }>();
      render(
        <VariableAutocomplete
          ref={ref}
          items={mockSuggestions}
          command={mockCommand}
          query=""
        />,
      );

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      const handled = ref.current?.onKeyDown(escapeEvent);
      expect(handled).toBe(false); // Escape is handled by parent
    });
  });

  describe('Item Selection', () => {
    it('should call command when item is clicked', () => {
      render(<VariableAutocomplete items={mockSuggestions} command={mockCommand} />);

      const firstItem = screen.getByText('Current Page Number').closest('button');
      firstItem?.click();

      expect(mockCommand).toHaveBeenCalledWith(mockSuggestions[0]);
      expect(mockCommand).toHaveBeenCalledTimes(1);
    });

    it('should reset selected index when items change', () => {
      const { rerender } = render(
        <VariableAutocomplete items={mockSuggestions} command={mockCommand} />,
      );

      const newSuggestions: AutocompleteSuggestion[] = [
        {
          label: 'New Suggestion',
          content: 'new',
          type: 'variable',
        },
      ];

      rerender(<VariableAutocomplete items={newSuggestions} command={mockCommand} />);

      // Selected index should reset to 0 when items change
      const newItem = screen.getByText('New Suggestion').closest('button');
      expect(newItem).toHaveClass('is-selected');
    });
  });
});

