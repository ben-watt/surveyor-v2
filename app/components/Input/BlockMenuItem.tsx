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
    <button
      className={`p-2 rounded-sm hover:bg-gray-200 ${isActive && isActive() ? "bg-gray-200" : ""}`}
      onClick={action}
      title={title}
    >
      {icon}
    </button>
  );
}
