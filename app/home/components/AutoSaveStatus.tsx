import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react';
import { AutoSaveStatus } from '../hooks/useAutoSave';
import { cn } from '@/lib/utils';

interface AutoSaveStatusProps {
  status: AutoSaveStatus;
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

/**
 * Component to display autosave status with appropriate styling and icons
 */
export function AutoSaveStatusIndicator({ 
  status, 
  className,
  showIcon = true,
  showText = true 
}: AutoSaveStatusProps) {
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
          icon: Save,
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
          icon: null,
          text: '',
          className: 'text-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  
  if (status === 'idle') return null;

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
      {showText && config.text && (
        <span>{config.text}</span>
      )}
    </div>
  );
} 