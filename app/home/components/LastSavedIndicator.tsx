import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { AutoSaveStatus } from '../hooks/useAutoSave';
import { cn } from '@/lib/utils';

interface LastSavedIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt?: Date | null;
  entityUpdatedAt?: string | null; // Entity's updatedAt field from database
  className?: string;
  showIcon?: boolean;
  showTimestamp?: boolean;
}

/**
 * Component to display last saved timestamp and current save status
 */
export function LastSavedIndicator({ 
  status, 
  lastSavedAt,
  entityUpdatedAt,
  className,
  showIcon = true,
  showTimestamp = true 
}: LastSavedIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Loader2,
          text: 'Saving...',
          className: 'text-blue-600'
        };
      case 'saved':
        return {
          icon: CheckCircle,
          text: 'All changes saved',
          className: 'text-green-600'
        };
      case 'autosaved':
        return {
          icon: CheckCircle,
          text: 'Auto-saved',
          className: 'text-green-600'
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Save failed',
          className: 'text-red-600'
        };
      default:
        return {
          icon: CheckCircle,
          text: 'Last saved',
          className: 'text-gray-500'
        };
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const config = getStatusConfig();
  
  return (
    <div className={cn(
      'flex items-center gap-2 text-sm',
      config.className,
      className
    )}>
      {showIcon && config.icon && (
        <config.icon 
          className={cn(
            'h-4 w-4',
            status === 'saving' && 'animate-spin'
          )} 
        />
      )}
      
      <div className="flex flex-col">
        <span>{config.text}</span>
        
        {showTimestamp && status !== 'saving' && status !== 'error' && (
          <span className="text-xs opacity-75">
            {(() => {
              // If we have a recent autosave timestamp, use that
              if (lastSavedAt) {
                return `Last saved ${formatTimestamp(lastSavedAt)}`;
              }
              // Otherwise, use the entity's updatedAt from the database
              if (entityUpdatedAt) {
                return `Last saved ${formatTimestamp(new Date(entityUpdatedAt))}`;
              }
              return null;
            })()}
          </span>
        )}
      </div>
    </div>
  );
} 