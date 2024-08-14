import { ChevronDown, ChevronRight } from "lucide-react";
import React, { PropsWithChildren } from "react";

interface FormSectionProps {
  title?: string;
  collapsible?: boolean;
}

export const FormSection = ({
  title,
  children,
}: PropsWithChildren<FormSectionProps>) => {
  const [collapsed, setCollapsed] = React.useState(true);

  const handleChildClick = (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
  };

  return (
    <div
      className="border border-grey-600 mt-2 mb-2 rounded p-2"
      onClick={() => setCollapsed((prev) => !prev)}
    >
      {title && (
        <div className="flex items-center">
          {collapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      )}
      <div className="space-y-4" onClick={handleChildClick} hidden={collapsed}>
        {children}
      </div>
    </div>
  );
};
