import { ChevronRight } from "lucide-react";
import React, { PropsWithChildren } from "react";
import { motion } from "framer-motion"

interface FormSectionProps {
  title?: string;
  defaultCollapsed?: boolean;
}

export const FormSection = ({
  title,
  defaultCollapsed = true,
  children,
}: PropsWithChildren<FormSectionProps>) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const variants = {
    open: { rotate: 90 },
    closed: { rotate: 0 },
  }

  return (
    <div className="border border-grey-600 mt-2 mb-2 rounded p-2">
      {title && (
        <div className="flex items-center" onClick={() => setCollapsed((prev) => !prev)}>
          <motion.div className="mr-2" animate={collapsed ? "closed" : "open" } variants={variants}>
            <ChevronRight size={20} />
          </motion.div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      )}
        <div className="space-y-4" hidden={collapsed}>
            {children}
        </div>
    </div>
  );
};
