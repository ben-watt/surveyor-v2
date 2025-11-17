/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TableSizeSelector } from '../TableSizeSelector';

describe('TableSizeSelector', () => {
  let editor: Editor;
  let onSelectMock: jest.Mock;

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, Table, TableRow, TableCell, TableHeader],
      content: '<p>Test content</p>',
    });
    onSelectMock = jest.fn();
  });

  afterEach(() => {
    editor.destroy();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the grid with 100 cells (10x10)', () => {
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const buttons = screen.getAllByRole('button');
      // 100 grid cells + any other buttons
      expect(buttons.length).toBeGreaterThanOrEqual(100);
    });

    it('should display default placeholder text when no cell is hovered', () => {
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      expect(screen.getByText('Select table size')).toBeInTheDocument();
    });

    it('should render all grid cells with proper aria labels', () => {
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      // Check first cell
      expect(screen.getByLabelText('Select 1 rows by 1 columns')).toBeInTheDocument();
      // Check a middle cell
      expect(screen.getByLabelText('Select 5 rows by 5 columns')).toBeInTheDocument();
      // Check last cell
      expect(screen.getByLabelText('Select 10 rows by 10 columns')).toBeInTheDocument();
    });
  });

  describe('Hover Interactions', () => {
    it('should display dimension text when hovering over a cell', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const firstCell = screen.getByLabelText('Select 1 rows by 1 columns');
      await user.hover(firstCell);

      await waitFor(() => {
        expect(screen.getByText('1 row × 1 column')).toBeInTheDocument();
      });
    });

    it('should update dimension text when hovering over different cells', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell3x4 = screen.getByLabelText('Select 3 rows by 4 columns');
      await user.hover(cell3x4);

      await waitFor(() => {
        expect(screen.getByText('3 rows × 4 columns')).toBeInTheDocument();
      });

      const cell5x2 = screen.getByLabelText('Select 5 rows by 2 columns');
      await user.hover(cell5x2);

      await waitFor(() => {
        expect(screen.getByText('5 rows × 2 columns')).toBeInTheDocument();
      });
    });

    it('should use plural form for multiple rows/columns', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell2x3 = screen.getByLabelText('Select 2 rows by 3 columns');
      await user.hover(cell2x3);

      await waitFor(() => {
        expect(screen.getByText('2 rows × 3 columns')).toBeInTheDocument();
      });
    });

    it('should use singular form for single row/column', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell1x1 = screen.getByLabelText('Select 1 rows by 1 columns');
      await user.hover(cell1x1);

      await waitFor(() => {
        expect(screen.getByText('1 row × 1 column')).toBeInTheDocument();
      });
    });

    it('should highlight selected area when hovering', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <TableSizeSelector editor={editor} onSelect={onSelectMock} />,
      );

      const cell3x4 = screen.getByLabelText('Select 3 rows by 4 columns');
      await user.hover(cell3x4);

      // Check that cells in the selected area have the selected class
      await waitFor(() => {
        const selectedCells = container.querySelectorAll('.bg-primary\\/20');
        expect(selectedCells.length).toBeGreaterThan(0);
      });
    });

    it('should clear selection when mouse leaves the grid', async () => {
      const user = userEvent.setup();
      const { container } = render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell3x4 = screen.getByLabelText('Select 3 rows by 4 columns');
      await user.hover(cell3x4);

      await waitFor(() => {
        expect(screen.getByText('3 rows × 4 columns')).toBeInTheDocument();
      });

      // Find the grid container and trigger mouseLeave
      const gridContainer = container.querySelector('[style*="grid-template-columns"]');
      if (gridContainer) {
        fireEvent.mouseLeave(gridContainer);

        await waitFor(() => {
          expect(screen.getByText('Select table size')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Click Interactions', () => {
    it('should insert table with correct dimensions when clicking a cell', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell3x4 = screen.getByLabelText('Select 3 rows by 4 columns');
      await user.click(cell3x4);

      await waitFor(() => {
        expect(onSelectMock).toHaveBeenCalledWith(3, 4);
      });

      // Verify table was inserted in editor
      await waitFor(() => {
        const html = editor.getHTML();
        expect(html).toContain('<table');
      });
    });

    it('should insert 1x1 table when clicking first cell', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell1x1 = screen.getByLabelText('Select 1 rows by 1 columns');
      await user.click(cell1x1);

      await waitFor(() => {
        expect(onSelectMock).toHaveBeenCalledWith(1, 1);
      });
    });

    it('should insert 10x10 table when clicking last cell', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell10x10 = screen.getByLabelText('Select 10 rows by 10 columns');
      await user.click(cell10x10);

      await waitFor(() => {
        expect(onSelectMock).toHaveBeenCalledWith(10, 10);
      });
    });

    it('should call onSelect callback with correct dimensions', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell5x7 = screen.getByLabelText('Select 5 rows by 7 columns');
      await user.click(cell5x7);

      await waitFor(() => {
        expect(onSelectMock).toHaveBeenCalledTimes(1);
        expect(onSelectMock).toHaveBeenCalledWith(5, 7);
      });
    });
  });

  describe('Editor Integration', () => {
    it('should insert table into editor with correct structure', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell2x3 = screen.getByLabelText('Select 2 rows by 3 columns');
      await user.click(cell2x3);

      await waitFor(() => {
        const html = editor.getHTML();
        expect(html).toContain('<table');
        expect(html).toContain('<tr>');
        expect(html).toContain('<td');
      });
    });

    it('should insert table with correct number of rows and columns', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell3x4 = screen.getByLabelText('Select 3 rows by 4 columns');
      await user.click(cell3x4);

      await waitFor(() => {
        const html = editor.getHTML();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const table = doc.querySelector('table');
        const rows = table?.querySelectorAll('tr');
        const firstRowCells = rows?.[0]?.querySelectorAll('td, th');

        expect(rows?.length).toBe(3);
        expect(firstRowCells?.length).toBe(4);
      });
    });

    it('should insert table and call onSelect when clicking a cell', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell2x2 = screen.getByLabelText('Select 2 rows by 2 columns');
      await user.click(cell2x2);

      await waitFor(() => {
        // Verify table was inserted
        const html = editor.getHTML();
        expect(html).toContain('<table');
        // Verify callback was called
        expect(onSelectMock).toHaveBeenCalledWith(2, 2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid hover changes', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell1x1 = screen.getByLabelText('Select 1 rows by 1 columns');
      const cell5x5 = screen.getByLabelText('Select 5 rows by 5 columns');
      const cell10x10 = screen.getByLabelText('Select 10 rows by 10 columns');

      await user.hover(cell1x1);
      await user.hover(cell5x5);
      await user.hover(cell10x10);

      await waitFor(() => {
        expect(screen.getByText('10 rows × 10 columns')).toBeInTheDocument();
      });
    });

    it('should handle clicking after hovering', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell4x6 = screen.getByLabelText('Select 4 rows by 6 columns');
      await user.hover(cell4x6);
      await user.click(cell4x6);

      await waitFor(() => {
        expect(onSelectMock).toHaveBeenCalledWith(4, 6);
      });
    });

    it('should handle maximum grid size (10x10)', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell10x10 = screen.getByLabelText('Select 10 rows by 10 columns');
      await user.click(cell10x10);

      await waitFor(() => {
        expect(onSelectMock).toHaveBeenCalledWith(10, 10);
      });
    });

    it('should handle minimum grid size (1x1)', async () => {
      const user = userEvent.setup();
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const cell1x1 = screen.getByLabelText('Select 1 rows by 1 columns');
      await user.click(cell1x1);

      await waitFor(() => {
        expect(onSelectMock).toHaveBeenCalledWith(1, 1);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for all cells', () => {
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      // Check a sample of cells across the grid
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          const expectedLabel = `Select ${row + 1} rows by ${col + 1} columns`;
          expect(screen.getByLabelText(expectedLabel)).toBeInTheDocument();
        }
      }
    });

    it('should have button role for all grid cells', () => {
      render(<TableSizeSelector editor={editor} onSelect={onSelectMock} />);

      const buttons = screen.getAllByRole('button');
      // All grid cells should be buttons
      expect(buttons.length).toBeGreaterThanOrEqual(100);
    });
  });
});

