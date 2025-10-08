// Note: Relative time moved to TimeAgo component

function getDaySuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Formats a date as a short UK format: DD/MM/YYYY
 * Example: "06/08/2025"
 */
export function formatShortDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB');
}

/**
 * Formats a date with time in UK format: DD/MM/YYYY, HH:MM
 * Example: "06/08/2025, 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formats a date with day suffix in UK format: 6th August 2025
 * Example: "6th August 2025"
 */
export function formatDateWithSuffix(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).replace(/(\d+)/, '$1' + getDaySuffix(dateObj.getDate()));
}

/**
 * Formats a date as relative time (e.g., "Just now", "2 minutes ago", "3 hours ago", "in 2 hours")
 * For dates more than 24 hours away, returns the formatted date and time
 */
// formatRelativeTime was previously exported; use <TimeAgo /> instead.
