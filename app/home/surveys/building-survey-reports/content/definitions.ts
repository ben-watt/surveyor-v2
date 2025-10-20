/**
 * Static content definitions for Building Survey Reports
 * Contains RAG key, glossary terms, and crack definitions
 */

export interface RagKeyItem {
  color: 'green' | 'orange' | 'red';
  label: string;
  description: string;
}

export interface TimeframeDefinition {
  term: string;
  description: string;
}

export interface CrackCategory {
  category: number;
  severity: string;
  width: string;
}

/**
 * RAG (Red-Amber-Green) status key for report condition ratings
 */
export const RAG_KEY: readonly RagKeyItem[] = [
  {
    color: 'green',
    label: 'Green',
    description:
      'For information purposes, generally, no repair is required. Property to be maintained as usual.',
  },
  {
    color: 'orange',
    label: 'Amber',
    description:
      'Defects requiring repair/replacement but not considered urgent nor serious. Property to be maintained as usual.',
  },
  {
    color: 'red',
    label: 'Red',
    description:
      'Serious defects to be fully considered prior to purchase that need to be repaired, replace or investigated urgently.',
  },
] as const;

/**
 * Not Inspected indicator configuration
 */
export const NOT_INSPECTED = {
  label: 'NI',
  description: 'Not inspected',
} as const;

/**
 * Timeframe definitions for repair recommendations
 */
export const TIMEFRAME_GLOSSARY: readonly TimeframeDefinition[] = [
  { term: 'Immediate', description: 'Within 1 year' },
  { term: 'Short Term', description: 'Within the next 1 to 3 years' },
  { term: 'Medium Term', description: 'Within the next 4 to 10 years' },
  { term: 'Long Term', description: 'Within the next 10 years' },
] as const;

/**
 * Crack severity definitions based on BRE Digest 251
 */
export const CRACK_DEFINITIONS: readonly CrackCategory[] = [
  { category: 0, severity: 'Negligible', width: '< 0.1mm' },
  { category: 1, severity: 'Very slight', width: 'Up to 1mm' },
  { category: 2, severity: 'Slight', width: 'Up to 5mm' },
  { category: 3, severity: 'Moderate', width: '5 - 15mm' },
  { category: 4, severity: 'Severe', width: '15 - 25mm' },
  { category: 5, severity: 'Very severe', width: '> 25mm' },
] as const;

