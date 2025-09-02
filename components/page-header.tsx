"use client";

import React from "react";

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
  titleId = "page-title",
}) => {
  return (
    <div className="relative z-10 py-8" role="main" aria-labelledby={titleId}>
      <div className="container mx-auto px-3 sm:px-5">
        <div className="flex flex-col sm:flex-row sm:justify-between mb-6 sm:mb-8 gap-2 sm:items-baseline">
          <div>
            <h1
              id={titleId}
              className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2"
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="text-lg text-gray-600">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
};


