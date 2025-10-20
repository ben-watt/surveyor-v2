/**
 * Tests for TableBlock component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TableBlock } from '../components/TableBlock';

describe('TableBlock', () => {
  it('should render a table with correct number of rows', () => {
    const { container } = render(
      <TableBlock widths={[50, 50]}>
        <p>Cell 1</p>
        <p>Cell 2</p>
        <p>Cell 3</p>
        <p>Cell 4</p>
      </TableBlock>
    );

    const rows = container.querySelectorAll('tr');
    expect(rows).toHaveLength(2);
  });

  it('should render correct number of cells per row', () => {
    const { container } = render(
      <TableBlock widths={[33, 33, 34]}>
        <p>Cell 1</p>
        <p>Cell 2</p>
        <p>Cell 3</p>
      </TableBlock>
    );

    const firstRow = container.querySelector('tr');
    const cells = firstRow?.querySelectorAll('td');
    expect(cells).toHaveLength(3);
  });

  it('should throw error if widths do not sum to 100', () => {
    expect(() => {
      render(
        <TableBlock widths={[40, 40]}>
          <p>Cell 1</p>
          <p>Cell 2</p>
        </TableBlock>
      );
    }).toThrow('Width total is 80%, expected 100%');
  });

  it('should throw error if children are null', () => {
    expect(() => {
      render(<TableBlock widths={[50, 50]}>{null}</TableBlock>);
    }).toThrow('Children must not be null or undefined');
  });

  it('should throw error if children are undefined', () => {
    expect(() => {
      render(<TableBlock widths={[50, 50]}>{undefined}</TableBlock>);
    }).toThrow('Children must not be null or undefined');
  });

  it('should warn if children count is not a multiple of column count', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(
      <TableBlock widths={[50, 50]}>
        <p>Cell 1</p>
        <p>Cell 2</p>
        <p>Cell 3</p>
      </TableBlock>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      '[TableBlock] Number of children should be a multiple of column count',
      expect.objectContaining({
        childCount: 3,
        columns: 2,
      })
    );

    consoleSpy.mockRestore();
  });

  it('should handle React Fragments', () => {
    const { container } = render(
      <TableBlock widths={[50, 50]}>
        <>
          <p>Cell 1</p>
          <p>Cell 2</p>
        </>
        <p>Cell 3</p>
        <p>Cell 4</p>
      </TableBlock>
    );

    const rows = container.querySelectorAll('tr');
    expect(rows).toHaveLength(2);
  });

  it('should set correct colwidth attributes', () => {
    const { container } = render(
      <TableBlock widths={[30, 70]} landscapeWidth={1000}>
        <p>Cell 1</p>
        <p>Cell 2</p>
      </TableBlock>
    );

    const cells = container.querySelectorAll('td');
    expect(cells[0].getAttribute('colwidth')).toBe('300');
    expect(cells[1].getAttribute('colwidth')).toBe('700');
  });

  it('should use default landscape width of 928', () => {
    const { container } = render(
      <TableBlock widths={[50, 50]}>
        <p>Cell 1</p>
        <p>Cell 2</p>
      </TableBlock>
    );

    const cells = container.querySelectorAll('td');
    expect(cells[0].getAttribute('colwidth')).toBe('464');
    expect(cells[1].getAttribute('colwidth')).toBe('464');
  });

  it('should render children content correctly', () => {
    const { getByText } = render(
      <TableBlock widths={[50, 50]}>
        <p>First Cell</p>
        <p>Second Cell</p>
      </TableBlock>
    );

    expect(getByText('First Cell')).toBeInTheDocument();
    expect(getByText('Second Cell')).toBeInTheDocument();
  });
});

