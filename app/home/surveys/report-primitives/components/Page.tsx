/**
 * Page Component
 * 
 * Represents a single page in the report.
 * Automatically adds a page break separator.
 * 
 * @example
 * ```tsx
 * <Page>
 *   <h1>Page Title</h1>
 *   <p>Page content...</p>
 * </Page>
 * ```
 */

import React from 'react';
import type { PageBreakBehavior } from '../types';

export interface PageProps {
  children: React.ReactNode;
  pageBreak?: PageBreakBehavior;
}

/**
 * Page component with automatic page break
 */
export const Page = ({ children, pageBreak = 'always' }: PageProps) => (
  <>
    {children}
    <hr />
  </>
);

