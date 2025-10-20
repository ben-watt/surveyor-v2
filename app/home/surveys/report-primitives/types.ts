/**
 * Common types for report primitive components
 */

import { CSSProperties } from 'react';

/**
 * Standard style configurations for report components
 */
export interface ReportStyles {
  [key: string]: CSSProperties;
}

/**
 * Table layout configuration
 */
export interface TableLayout {
  widths: readonly number[];
  description?: string;
}

/**
 * Page break behavior
 */
export type PageBreakBehavior = 'always' | 'avoid' | 'auto';

