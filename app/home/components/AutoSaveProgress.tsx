import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Save, Circle } from 'lucide-react';
import { AutoSaveStatus } from '../hooks/useAutoSave';

interface AutoSaveProgressProps {
  status: AutoSaveStatus;
  hasPendingChanges: boolean;
  delay?: number;
  onSaveNow?: () => void;
  className?: string;
  showCountdown?: boolean;
}

/**
 * Component to display autosave progress with optional countdown and save now button
 */
export function AutoSaveProgress({
  status,
  hasPendingChanges,
  delay = 1000,
  onSaveNow,
  className,
  showCountdown = false,
}: AutoSaveProgressProps) {
  const [countdown, setCountdown] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'pending' && showCountdown) {
      setCountdown(delay);
      setProgress(0);

      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, delay - elapsed);
        const progressPercent = (elapsed / delay) * 100;

        setCountdown(remaining);
        setProgress(Math.min(100, progressPercent));

        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 50);
    } else {
      setCountdown(0);
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, delay, showCountdown]);

  if (!hasPendingChanges || status === 'saving' || status === 'idle') {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {status === 'pending' && (
        <>
          <div className="relative">
            <Circle className="h-4 w-4 animate-pulse text-yellow-600" />
            {showCountdown && (
              <div
                className="absolute inset-0 rounded-full border-2 border-yellow-600 opacity-30"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((progress / 100) * 2 * Math.PI)}% ${50 - 50 * Math.cos((progress / 100) * 2 * Math.PI)}%)`,
                }}
              />
            )}
          </div>

          {showCountdown && (
            <span className="min-w-[3ch] text-yellow-600">{Math.ceil(countdown / 1000)}s</span>
          )}

          {onSaveNow && (
            <button
              onClick={onSaveNow}
              className="inline-flex items-center gap-1 rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-200"
              type="button"
            >
              <Save className="h-3 w-3" />
              Save now
            </button>
          )}
        </>
      )}
    </div>
  );
}
