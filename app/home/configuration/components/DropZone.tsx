'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  id: string;
  position: 'top' | 'bottom';
  parentType: 'root' | 'section' | 'element' | 'component';
  parentId?: string;
  isActive?: boolean;
  children?: React.ReactNode;
}

const DropZone: React.FC<DropZoneProps> = ({
  id,
  position,
  parentType,
  parentId,
  isActive = false,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'dropzone',
      position,
      parentType,
      parentId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-all duration-200',
        position === 'top' ? 'h-2 -mb-2' : 'h-2 -mt-2',
        isOver && isActive && 'bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-500 border-dashed rounded',
        !isActive && 'opacity-0 hover:opacity-100'
      )}
    >
      {children}
      {isOver && isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-white dark:bg-gray-800 px-2 py-1 rounded shadow">
            Drop here
          </div>
        </div>
      )}
    </div>
  );
};

export default DropZone;