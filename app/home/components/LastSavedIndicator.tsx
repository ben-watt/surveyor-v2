import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Clock, Circle } from 'lucide-react';
import { AutoSaveStatus } from '../hooks/useAutoSave';
import { cn } from '@/lib/utils';
import TimeAgo from './TimeAgo';

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
  showTimestamp = true,
}: LastSavedIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Circle,
          text: 'Changes pending...',
          className: 'text-yellow-600',
        };
      case 'saving':
        return {
          icon: Loader2,
          text: 'Saving...',
          className: 'text-blue-600',
        };
      case 'saved':
        return {
          icon: CheckCircle,
          text: 'All changes saved',
          className: 'text-green-600',
        };
      case 'autosaved':
        return {
          icon: CheckCircle,
          text: 'Auto-saved',
          className: 'text-green-600',
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Save failed',
          className: 'text-red-600',
        };
      default:
        return {
          icon: CheckCircle,
          text: 'Last saved',
          className: 'text-gray-500',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm transition-all duration-300 ease-in-out min-h-10',
        config.className,
        className,
      )}
    >
      {showIcon && config.icon && (
        <config.icon
          className={cn(
            'h-4 w-4 transition-all duration-300',
            status === 'saving' && 'animate-spin',
            status === 'pending' && 'animate-pulse',
          )}
        />
      )}

      <div className="flex flex-col">
        <span className="transition-all duration-300">{config.text}</span>

        {showTimestamp && status !== 'saving' && status !== 'error' && status !== 'pending' && (
          <span className="text-sm font-normal opacity-90 transition-opacity duration-300">
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
