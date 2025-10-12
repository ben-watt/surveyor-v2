import { Tooltip, TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip';
import { ReactElement } from 'react';

export interface MenuItemProps {
  icon?: ReactElement<any>;
  title?: string;
  action?: () => void | boolean;
  isActive?: (() => boolean) | null;
}

export default function MenuItem({ icon, title, action, isActive = null }: MenuItemProps) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger
        className={`rounded-sm p-2 hover:bg-gray-200 ${
          isActive && isActive() ? 'bg-gray-200' : ''
        }`}
        onClick={action}
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>
        <div className="rounded bg-black p-1 text-xs text-white">{title}</div>
      </TooltipContent>
    </Tooltip>
  );
}
