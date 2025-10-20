/**
 * Utility functions for building survey reports
 * 
 * Provides common helpers for data formatting, fallbacks, and transformations
 * used throughout report generation.
 */

import type { RagStatus } from './BuildingSurveyReportSchema';
import { RAG_COLORS } from './constants';

/**
 * Maps RAG status to background color for report rendering
 * 
 * @param ragStatus - The RAG status ('Red', 'Amber', 'Green', 'N/I')
 * @returns CSS color name for the background
 * 
 * @example
 * const color = mapRagToColor('Red'); // 'red'
 * <mark style={{ backgroundColor: color }}>...</mark>
 */
export const mapRagToColor = (ragStatus: RagStatus): string => {
  return RAG_COLORS[ragStatus] ?? RAG_COLORS['N/I'];
};

/**
 * Safe fallback helper with type safety
 * Returns the fallback value if the input is null, undefined, or empty string
 * 
 * @param value - Value to check
 * @param fallbackValue - Value to return if primary value is invalid
 * @returns The value or fallback
 * 
 * @example
 * fallback(undefined, 'N/A') // 'N/A'
 * fallback('', 'N/A') // 'N/A'
 * fallback('Valid', 'N/A') // 'Valid'
 * fallback(0, 999) // 0 (zero is valid for numbers)
 */
export const fallback = <T>(value: T | undefined | null, fallbackValue: T): T => {
  if (value === undefined || value === null) return fallbackValue;

  switch (typeof value) {
    case 'string':
      return value.length > 0 ? value : fallbackValue;
    case 'number':
      // 0 is a valid number, don't fallback
      return value;
    case 'boolean':
      return value;
    case 'object':
      // Arrays and objects are valid, return them as-is
      return value;
    default:
      return fallbackValue;
  }
};

/**
 * Formats an array for display with proper separators
 * 
 * @param items - Array of items to format
 * @param separator - Separator for last item (default: ' & ')
 * @param commaSeparator - Separator for middle items (default: ', ')
 * @returns Formatted string
 * 
 * @example
 * formatList(['A', 'B', 'C']) // 'A, B & C'
 * formatList(['A', 'B']) // 'A & B'
 * formatList(['A']) // 'A'
 * formatList(['A', 'B', 'C'], ' or ') // 'A, B or C'
 */
export const formatList = (
  items: any[],
  separator: string = ' & ',
  commaSeparator: string = ', '
): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return String(items[0]);
  if (items.length === 2) return items.join(separator);

  const allButLast = items.slice(0, -1);
  const last = items[items.length - 1];
  return allButLast.join(commaSeparator) + separator + last;
};

/**
 * Safely accesses nested object properties with optional chaining
 * and provides a fallback value
 * 
 * @param obj - Object to access
 * @param path - Dot-notation path string (e.g., 'user.address.city')
 * @param fallbackValue - Value to return if path is not found
 * @returns The value at the path or fallback
 * 
 * @example
 * const user = { address: { city: 'London' } };
 * getNestedValue(user, 'address.city') // 'London'
 * getNestedValue(user, 'address.country', 'UK') // 'UK'
 */
export const getNestedValue = <T = any>(
  obj: any,
  path: string,
  fallbackValue?: T
): T | undefined => {
  try {
    // Handle empty path - return the object itself
    if (!path || path.trim() === '') {
      return obj;
    }

    const value = path.split('.').reduce((current, key) => current?.[key], obj);
    return value !== undefined ? value : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
};

/**
 * Formats a number as currency (GBP)
 * 
 * @param amount - Amount to format
 * @param includePence - Whether to include pence (default: false)
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1500) // '£1,500'
 * formatCurrency(1500.50, true) // '£1,500.50'
 */
export const formatCurrency = (amount: number, includePence: boolean = false): string => {
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: includePence ? 2 : 0,
    maximumFractionDigits: includePence ? 2 : 0,
  });
  return formatter.format(amount);
};

/**
 * Truncates text to a maximum length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text
 * 
 * @example
 * truncateText('This is a long text', 10) // 'This is a...'
 */
export const truncateText = (
  text: string,
  maxLength: number,
  suffix: string = '...'
): string => {
  if (text.length <= maxLength) return text;
  // Ensure we don't exceed maxLength
  const truncateAt = Math.max(0, maxLength - suffix.length);
  return text.slice(0, truncateAt) + suffix;
};

/**
 * Checks if a value is empty (null, undefined, empty string, empty array)
 * 
 * @param value - Value to check
 * @returns True if empty
 * 
 * @example
 * isEmpty(null) // true
 * isEmpty('') // true
 * isEmpty([]) // true
 * isEmpty('text') // false
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Pluralizes a word based on count
 * 
 * @param count - Number to base pluralization on
 * @param singular - Singular form of the word
 * @param plural - Plural form (optional, defaults to singular + 's')
 * @returns Pluralized string with count
 * 
 * @example
 * pluralize(1, 'item') // '1 item'
 * pluralize(2, 'item') // '2 items'
 * pluralize(2, 'property', 'properties') // '2 properties'
 */
export const pluralize = (
  count: number,
  singular: string,
  plural?: string
): string => {
  const word = count === 1 ? singular : plural || `${singular}s`;
  return `${count} ${word}`;
};

/**
 * Converts a string to title case
 * 
 * @param str - String to convert
 * @returns Title cased string
 * 
 * @example
 * toTitleCase('hello world') // 'Hello World'
 * toTitleCase('the quick brown fox') // 'The Quick Brown Fox'
 */
export const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Clamps a number between min and max values
 * 
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 * 
 * @example
 * clamp(5, 0, 10) // 5
 * clamp(-5, 0, 10) // 0
 * clamp(15, 0, 10) // 10
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Removes duplicate values from an array
 * 
 * @param array - Array with potential duplicates
 * @returns Array with unique values
 * 
 * @example
 * unique([1, 2, 2, 3, 3, 3]) // [1, 2, 3]
 * unique(['a', 'b', 'a']) // ['a', 'b']
 */
export const unique = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

/**
 * Groups an array of objects by a key
 * 
 * @param array - Array to group
 * @param key - Key to group by
 * @returns Object with grouped arrays
 * 
 * @example
 * const items = [{ type: 'A', val: 1 }, { type: 'B', val: 2 }, { type: 'A', val: 3 }];
 * groupBy(items, 'type')
 * // { A: [{ type: 'A', val: 1 }, { type: 'A', val: 3 }], B: [{ type: 'B', val: 2 }] }
 */
export const groupBy = <T extends Record<string, any>>(
  array: T[],
  key: keyof T
): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

