'use client';

import React from 'react';

export interface PageHeaderProps {
  /** Main page title displayed prominently */
  title: string;
  /** Optional subtitle for additional context */
  subtitle?: string;
  /** Optional right-aligned action elements (e.g., buttons) */
  actions?: React.ReactNode;
  /** Content rendered beneath the header within the same container */
  children?: React.ReactNode;
  /** Optional override for the heading element id used by aria-labelledby */
  titleId?: string;
}

/**
 * PageHeader renders a consistent page heading with gradient title, subtitle, and optional actions.
 * It also wraps children in the same responsive container and provides accessible landmarks.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  children,
  titleId = 'page-title',
}) => {
  return (
    <div className="relative z-10 py-8" role="main" aria-labelledby={titleId}>
      <div className="container mx-auto px-3 sm:px-5">
        <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1
              id={titleId}
              className="mb-2 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl"
            >
              {title}
            </h1>
            {subtitle ? <p className="text-lg text-gray-600">{subtitle}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
};
