'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  id: string;
  position: 'top' | 'bottom' | 'inside';
  parentType: 'root' | 'section' | 'element' | 'component';
  parentId?: string;
  isActive?: boolean;
  children?: React.ReactNode;
  fullOverlay?: boolean; // when true, covers parent bounds (for header inside drops)
}

const DropZone: React.FC<DropZoneProps> = ({
  id,
  position,
  parentType,
  parentId,
  isActive = false,
  children,
  fullOverlay = false,
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
        'transition-all duration-200',
        fullOverlay ? 'absolute inset-0 rounded-md' : 'relative',
        // Edge zones are thin to present a simple line
        !fullOverlay &&
          (position === 'top' ? '-mb-2 h-2' : position === 'bottom' ? '-mt-2 h-2' : 'h-0'),
        // Only show the line when active/over; otherwise invisible and non-interactive
        isActive ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      {children}
      {/* Line indicator only */}
      {isOver && isActive && (position === 'top' || position === 'bottom') && (
        <div
          className={cn(
            'absolute left-2 right-2 h-0.5 rounded-full bg-blue-500',
            position === 'top' ? '-top-0.5' : '-bottom-0.5',
          )}
        />
      )}
    </div>
  );
};

export default DropZone;
