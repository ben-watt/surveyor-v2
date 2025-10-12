import { ChevronRight } from 'lucide-react';
import React, { PropsWithChildren, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { DynamicDrawer, useDynamicDrawer } from './Drawer';
import { useRouter } from 'next/navigation';
import {
  FormSectionStatus,
  FormStatus,
} from '../surveys/building-survey-reports/BuildingSurveyReportSchema';

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

  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  const variants = {
    open: { rotate: 90 },
    closed: { rotate: 0 },
  };

  const contentVariants = {
    open: {
      height: 'auto',
      opacity: 1,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
    closed: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' },
    },
  };

  if (!collapsable) {
    return (
      <div className="border-grey-600 mb-2 mt-2 rounded border p-2">
        <div className="flex items-center justify-between">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
        </div>
        <div className="space-y-2">{children}</div>
      </div>
    );
  }

  return (
    <div className="border-grey-600 mb-2 mt-2 rounded border p-2">
      {title && (
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          <h2 className="text-lg font-semibold">{title}</h2>
          <motion.div className="mr-2" animate={collapsed ? 'closed' : 'open'} variants={variants}>
            <ChevronRight size={20} />
          </motion.div>
        </div>
      )}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="mt-2 space-y-2 overflow-hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={contentVariants}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FormSectionLinkProps {
  title: string;
  href?: string;
  status: FormStatus;
  drawer?: DrawerProps;
}

interface DrawerProps {
  title: string;
  description: string;
  content: React.ReactNode; //React.ComponentType<DrawerContentProps>;
}

export const MultiFormSection = ({ title, href, status, drawer }: FormSectionLinkProps) => {
  const { openDrawer } = useDynamicDrawer();
  const router = useRouter();

  const handleClick = () => {
    if (drawer) {
      openDrawer({
        id: 'form-section-drawer',
        title: drawer.title,
        description: drawer.description,
        content: drawer.content,
      });
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <div>
      <div className="border-grey-600 mb-2 mt-2 rounded border p-2 text-sm" onClick={handleClick}>
        <div className="flex items-center justify-between">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {status === 'complete' && (
            <div className="rounded-sm bg-green-700 px-2 text-white">Complete</div>
          )}
          {status === 'incomplete' && (
            <div className="rounded-sm bg-slate-500 px-2 text-white">Incomplete</div>
          )}
          {status === 'error' && <div className="rounded-sm bg-red-500 px-2 text-white">Error</div>}
          {status === 'warning' && (
            <div className="rounded-sm bg-yellow-500 px-2 text-white">Warning</div>
          )}
        </div>
      </div>
    </div>
  );
};
