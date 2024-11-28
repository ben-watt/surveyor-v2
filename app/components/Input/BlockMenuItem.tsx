import { Tooltip, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { ReactElement } from "react";

export interface MenuItemProps {
  icon?: ReactElement;
  title?: string;
  action?: () => void | boolean;
  isActive?: (() => boolean) | null;
}

export default function MenuItem({
  icon,
  title,
  action,
  isActive = null,
}: MenuItemProps) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger>
        <button
          className={`p-2 rounded-sm hover:bg-gray-200 ${
            isActive && isActive() ? "bg-gray-200" : ""
          }`}
          onClick={action}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="bg-black text-white rounded text-xs p-1">{title}</div>
      </TooltipContent>
    </Tooltip>
  );
}
