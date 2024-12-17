import { ChevronRight } from "lucide-react";
import React, { PropsWithChildren } from "react";
import { motion } from "framer-motion"
import Link from "next/link";

interface FormSectionProps {
  title?: string;
  collapsable?: boolean;
  defaultCollapsed?: boolean;
}

export const FormSection = ({
  title,
  collapsable = false,
  defaultCollapsed = true,
  children,
}: PropsWithChildren<FormSectionProps>) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const variants = {
    open: { rotate: 90 },
    closed: { rotate: 0 },
  }

  if(!collapsable) {
    return (
      <div className="border border-grey-600 mt-2 mb-2 rounded p-2">
        <div className="flex justify-between items-center">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
        </div>
        <div className="space-y-2">
            {children}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-grey-600 mt-2 mb-2 rounded p-2">
      {title && (
        <div className="flex justify-between items-center" onClick={() => setCollapsed((prev) => !prev)}>
          <h2 className="text-lg font-semibold">{title}</h2>
          <motion.div className="mr-2" animate={collapsed ? "closed" : "open" } variants={variants}>
            <ChevronRight size={20} />
          </motion.div>
        </div>
      )}
        <div className="space-y-2 mt-2" hidden={collapsed}>
            {children}
        </div>
    </div>
  );
};


interface FormSectionLinkProps {
  title: string;
  href: string;
  status: "complete" | "incomplete" | "error" | "warning";
}

export const FormSectionLink = ({ title, href, status }: FormSectionLinkProps) => {
  return (
    <Link href={href}>
      <div className="border border-grey-600 mt-2 mb-2 rounded p-2">
        <div className="flex justify-between items-center">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {status === "complete" && <div className="bg-green-700 px-2 text-white rounded-sm">Complete</div>}
          {status === "incomplete" && <div className="bg-slate-500 px-2 text-white rounded-sm">Incomplete</div>}
          {status === "error" && <div className="bg-red-500 px-2 text-white rounded-sm">Error</div>}
          {status === "warning" && <div className="bg-yellow-500 px-2 text-white rounded-sm">Warning</div>}
        </div>
      </div>
    </Link>
    
  )
}