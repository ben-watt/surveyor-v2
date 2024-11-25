import { ReactElement } from "react";

export default function MenuItem({
  icon,
  title,
  action,
  isActive = null,
}: {
  icon?: ReactElement;
  title?: string;
  action?: () => void;
  isActive?: (() => boolean) | null;
}) {  
  return (
    <button
      className={`hover:bg-gray-200 p-2 rounded menu-item${isActive && isActive() ? "active:bg-grey-200" : ""}`}
      onClick={action}
      title={title}>
        {icon}
    </button>
  );
}
