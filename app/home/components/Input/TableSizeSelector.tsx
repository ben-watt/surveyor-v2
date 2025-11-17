'use client';

import React, { useState } from 'react';
import { type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface TableSizeSelectorProps {
  editor: Editor;
  onSelect: (rows: number, cols: number) => void;
}

const GRID_SIZE = 10;

export const TableSizeSelector: React.FC<TableSizeSelectorProps> = ({
  editor,
  onSelect,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const handleCellClick = (row: number, col: number) => {
    const rows = row + 1;
    const cols = col + 1;
    editor.chain().focus().insertTable({ rows, cols }).run();
    onSelect(rows, cols);
  };

  const handleCellHover = (row: number, col: number) => {
    setHoveredCell({ row, col });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const isCellSelected = (cellRow: number, cellCol: number) => {
    if (!hoveredCell) return false;
    return cellRow <= hoveredCell.row && cellCol <= hoveredCell.col;
  };

  const selectedRows = hoveredCell ? hoveredCell.row + 1 : 0;
  const selectedCols = hoveredCell ? hoveredCell.col + 1 : 0;

  return (
    <div className="space-y-3 p-2">
      <div className="text-center text-sm font-medium text-foreground">
        {hoveredCell ? (
          <span>
            {selectedRows} {selectedRows === 1 ? 'row' : 'rows'} × {selectedCols}{' '}
            {selectedCols === 1 ? 'column' : 'columns'}
          </span>
        ) : (
          <span className="text-muted-foreground">Select table size</span>
        )}
      </div>
      <div
        className="grid gap-[2px] rounded-md border border-border bg-border p-2"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const row = Math.floor(index / GRID_SIZE);
          const col = index % GRID_SIZE;
          const isSelected = isCellSelected(row, col);

          return (
            <button
              key={`${row}-${col}`}
              type="button"
              className={cn(
                'aspect-square h-5 w-5 rounded-sm border border-transparent transition-colors',
                'hover:border-primary/50',
                isSelected
                  ? 'bg-primary/20 border-primary'
                  : 'bg-background hover:bg-accent',
              )}
              onMouseEnter={() => handleCellHover(row, col)}
              onClick={() => handleCellClick(row, col)}
              aria-label={`Select ${row + 1} rows by ${col + 1} columns`}
            />
          );
        })}
      </div>
    </div>
  );
};

