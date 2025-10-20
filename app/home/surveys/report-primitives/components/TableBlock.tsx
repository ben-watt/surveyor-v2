/**
 * TableBlock Component
 * 
 * Creates a table with specified column widths.
 * Automatically chunks children into rows based on widths array.
 * 
 * @example
 * ```tsx
 * <TableBlock widths={[30, 70]}>
 *   <p>Label</p>
 *   <p>Value</p>
 *   <p>Another Label</p>
 *   <p>Another Value</p>
 * </TableBlock>
 * ```
 */

import React, { isValidElement } from 'react';

export interface TableBlockProps {
  children: React.ReactNode;
  widths: readonly number[];
  landscapeWidth?: number;
}

/**
 * Creates a table with specified column widths
 */
export const TableBlock = ({
  children,
  widths,
  landscapeWidth = 928,
}: TableBlockProps) => {
  // Validate widths sum to 100
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  if (totalWidth !== 100) {
    throw new Error(
      `[TableBlock] Width total is ${totalWidth}%, expected 100%. Widths: ${widths.join(', ')}`
    );
  }

  // Validate children exist
  if (children === null || children === undefined) {
    throw new Error('[TableBlock] Children must not be null or undefined');
  }

  /**
   * Creates table rows from elements, handling React Fragments
   */
  const createTableRows = (elements: React.ReactNode): React.JSX.Element[] => {
    const elementsArr = React.Children.toArray(elements);
    const columnsPerRow = widths.length;

    // Warn if children count doesn't match expected rows
    if (elementsArr.length % columnsPerRow !== 0) {
      console.warn(
        '[TableBlock] Number of children should be a multiple of column count',
        {
          childCount: elementsArr.length,
          columns: columnsPerRow,
          widths: Array.from(widths),
        }
      );
    }

    const tableRows: React.JSX.Element[] = [];

    for (let i = 0; i < elementsArr.length; i += columnsPerRow) {
      const firstChildInRow = elementsArr[i];

      // Handle React Fragments by recursively processing their children
      if (isValidElement(firstChildInRow) && firstChildInRow.type === React.Fragment) {
        const fragmentChildren = (
          firstChildInRow as React.ReactElement<{ children: React.ReactNode }>
        ).props.children;
        tableRows.push(...createTableRows(fragmentChildren));
        i -= columnsPerRow - 1; // Adjust index to account for fragment expansion
        continue;
      }

      // Create cells for this row
      const cells = widths.map((width, colIndex) => {
        const child = elementsArr[i + colIndex];
        const colWidth = Math.round(landscapeWidth * (width / 100));

        return (
          <td key={colIndex} colwidth={String(colWidth)}>
            {child}
          </td>
        );
      });

      tableRows.push(<tr key={i}>{cells}</tr>);
    }

    return tableRows;
  };

  return (
    <table>
      <tbody>{createTableRows(children)}</tbody>
    </table>
  );
};

