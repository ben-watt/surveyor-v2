import React from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, Clock, Circle } from 'lucide-react';
import { AutoSaveStatus } from '../hooks/useAutoSave';
import { cn } from '@/lib/utils';
import TimeAgo from './TimeAgo';

interface LastSavedIndicatorWithUploadsProps {
  status: AutoSaveStatus;
  isUploading: boolean;
  lastSavedAt?: Date | null;
  entityUpdatedAt?: string | null;
  uploadProgress?: Record<string, boolean>;
  className?: string;
  showIcon?: boolean;
  showTimestamp?: boolean;
}

/**
 * Enhanced status indicator that shows both autosave status and image upload progress
 * Prioritizes upload status when images are uploading, otherwise shows save status
 */
export function LastSavedIndicatorWithUploads({
  status,
  isUploading,
  lastSavedAt,
  entityUpdatedAt,
  uploadProgress,
  className,
  showIcon = true,
  showTimestamp = true
}: LastSavedIndicatorWithUploadsProps) {
  const getStatusConfig = () => {
    // Prioritize upload status when images are uploading
    if (isUploading) {
      return {
        icon: Upload,
        text: 'Uploading images...',
        className: 'text-blue-600'
      };
    }

    // Otherwise show save status
    switch (status) {
      case 'pending':
        return {
          icon: Circle,
          text: 'Changes pending...',
          className: 'text-yellow-600'
        };
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

  const config = getStatusConfig();
  
  return (
    <div className={cn(
      'flex items-center gap-2 text-sm transition-all duration-300 ease-in-out',
      'h-6 min-w-[160px] whitespace-nowrap',
      config.className,
      className
    )}>
      {showIcon && config.icon && (
        <config.icon
          className={cn(
            'h-4 w-4',
            (status === 'saving' || isUploading) && 'animate-spin',
            status === 'pending' && 'animate-pulse'
          )}
        />
      )}
      
      <div className="flex flex-col">
        <span className="transition-colors duration-200 leading-5">{config.text}</span>
        
        {showTimestamp && !isUploading && status !== 'saving' && status !== 'error' && status !== 'pending' && (
          <span className="text-xs opacity-75 transition-opacity duration-300">
            {(() => {
              // If we have a recent autosave timestamp, use that
              if (lastSavedAt) {
                return (
                  <>
                    Last saved <TimeAgo date={lastSavedAt} />
                  </>
                );
              }
              // Otherwise, use the entity's updatedAt from the database
              if (entityUpdatedAt) {
                return (
                  <>
                    Last saved <TimeAgo date={new Date(entityUpdatedAt)} />
                  </>
                );
              }
              return null;
            })()}
          </span>
        )}
      </div>
    </div>
  );
} 
