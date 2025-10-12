import { PERFORMANCE_MARKS } from '@/app/home/config/formConstants';

/**
 * Performance monitoring utility for tracking form operations
 */
export class PerformanceMonitor {
  private static isEnabled = typeof window !== 'undefined' && 'performance' in window;

  /**
   * Start a performance measurement
   */
  static startMeasure(category: string, label: string): string {
    if (!this.isEnabled) return '';

    const markName = `${category}-${label}-start`;
    try {
      performance.mark(markName);
    } catch (error) {
      console.debug('[PerformanceMonitor] Failed to create mark:', error);
    }
    return markName;
  }

  /**
   * End a performance measurement and log the duration
   */
  static endMeasure(category: string, label: string): number {
    if (!this.isEnabled) return 0;

    const startMark = `${category}-${label}-start`;
    const endMark = `${category}-${label}-end`;
    const measureName = `${category}-${label}`;

    try {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);

      const measures = performance.getEntriesByName(measureName);
      const duration = measures[measures.length - 1]?.duration || 0;

      // Log significant durations in development
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log(`[Performance] ${category} ${label}: ${duration.toFixed(2)}ms`);
      }

      // Clean up marks to avoid memory leaks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);

      return duration;
    } catch (error) {
      console.debug('[PerformanceMonitor] Failed to measure:', error);
      return 0;
    }
  }

  /**
   * Mark a single point in time
   */
  static mark(category: string, label: string): void {
    if (!this.isEnabled) return;

    const markName = `${category}-${label}`;
    try {
      performance.mark(markName);
    } catch (error) {
      console.debug('[PerformanceMonitor] Failed to create mark:', error);
    }
  }

  /**
   * Get all performance entries for a category
   */
  static getEntries(category: string): PerformanceEntry[] {
    if (!this.isEnabled) return [];

    try {
      return performance
        .getEntriesByType('measure')
        .filter((entry) => entry.name.startsWith(category));
    } catch (error) {
      console.debug('[PerformanceMonitor] Failed to get entries:', error);
      return [];
    }
  }

  /**
   * Clear all performance marks and measures for a category
   */
  static clear(category?: string): void {
    if (!this.isEnabled) return;

    try {
      if (category) {
        const marks = performance
          .getEntriesByType('mark')
          .filter((entry) => entry.name.startsWith(category));
        marks.forEach((mark) => performance.clearMarks(mark.name));

        const measures = performance
          .getEntriesByType('measure')
          .filter((entry) => entry.name.startsWith(category));
        measures.forEach((measure) => performance.clearMeasures(measure.name));
      } else {
        performance.clearMarks();
        performance.clearMeasures();
      }
    } catch (error) {
      console.debug('[PerformanceMonitor] Failed to clear:', error);
    }
  }

  /**
   * Get a summary of all measurements for a category
   */
  static getSummary(category: string): {
    count: number;
    totalDuration: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
  } {
    const entries = this.getEntries(category);

    if (entries.length === 0) {
      return {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      };
    }

    const durations = entries.map((entry) => entry.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: entries.length,
      totalDuration,
      averageDuration: totalDuration / entries.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
    };
  }
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor(category: string) {
  return {
    startMeasure: (label: string) => PerformanceMonitor.startMeasure(category, label),
    endMeasure: (label: string) => PerformanceMonitor.endMeasure(category, label),
    mark: (label: string) => PerformanceMonitor.mark(category, label),
    clear: () => PerformanceMonitor.clear(category),
    getSummary: () => PerformanceMonitor.getSummary(category),
  };
}
