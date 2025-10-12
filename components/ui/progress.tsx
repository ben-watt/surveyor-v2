import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-gray-200', className)}
      {...props}
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ease-out"
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  ),
);
Progress.displayName = 'Progress';

export { Progress };
