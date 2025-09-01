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
        !fullOverlay && (position === 'top' ? 'h-2 -mb-2' : position === 'bottom' ? 'h-2 -mt-2' : 'h-0'),
        // Only show the line when active/over; otherwise invisible and non-interactive
        isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      {children}
      {/* Line indicator only */}
      {isOver && isActive && (position === 'top' || position === 'bottom') && (
        <div className={cn('absolute left-2 right-2 h-0.5 bg-blue-500 rounded-full', position === 'top' ? '-top-0.5' : '-bottom-0.5')} />
      )}
    </div>
  );
};

export default DropZone;