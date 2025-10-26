import Handlebars from 'handlebars';
import { BuildingSurveyFormData } from '../building-survey-reports/BuildingSurveyReportSchema';

/**
 * Template renderer utility for survey report templates
 * Handles Handlebars template compilation and rendering with custom helpers
 */

// Initialize Handlebars helpers
function registerHelpers() {
  // ==========================================
  // DATE & TIME HELPERS
  // ==========================================

  /**
   * Format a date with a specific format string
   * Usage: {{formatDate reportDetails.reportDate "DD/MM/YYYY"}}
   */
  Handlebars.registerHelper('formatDate', function (date: any, format: string) {
    if (!date) return '';
    
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return '';

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const monthName = monthNames[d.getMonth()];

      return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', String(year))
        .replace('YY', String(year).slice(-2))
        .replace('MMMM', monthName)
        .replace('MMM', monthName.slice(0, 3));
    } catch (e) {
      return '';
    }
  });

  // ==========================================
  // STRING HELPERS
  // ==========================================

  /**
   * Convert string to uppercase
   * Usage: {{uppercase city}}
   */
  Handlebars.registerHelper('uppercase', function (str: string) {
    return str ? String(str).toUpperCase() : '';
  });

  /**
   * Convert string to lowercase
   * Usage: {{lowercase status}}
   */
  Handlebars.registerHelper('lowercase', function (str: string) {
    return str ? String(str).toLowerCase() : '';
  });

  /**
   * Capitalize first letter of each word
   * Usage: {{capitalize clientName}}
   */
  Handlebars.registerHelper('capitalize', function (str: string) {
    if (!str) return '';
    return String(str)
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  });

  /**
   * Truncate string to specified length
   * Usage: {{truncate description 100}}
   */
  Handlebars.registerHelper('truncate', function (str: string, length: number) {
    if (!str) return '';
    const s = String(str);
    return s.length > length ? s.substring(0, length) + '...' : s;
  });

  // ==========================================
  // NUMBER & CURRENCY HELPERS
  // ==========================================

  /**
   * Format number as currency (GBP)
   * Usage: {{formatCurrency 1500}}
   */
  Handlebars.registerHelper('formatCurrency', function (value: any) {
    const num = Number(value);
    if (isNaN(num)) return '£0.00';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(num);
  });

  /**
   * Format number with thousands separator
   * Usage: {{formatNumber 1234567}}
   */
  Handlebars.registerHelper('formatNumber', function (value: any) {
    const num = Number(value);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-GB').format(num);
  });

  // ==========================================
  // ARRAY HELPERS
  // ==========================================

  /**
   * Get array length
   * Usage: {{length sections}}
   */
  Handlebars.registerHelper('length', function (array: any[]) {
    return Array.isArray(array) ? array.length : 0;
  });

  /**
   * Check if array has items
   * Usage: {{#if (hasItems sections)}}...{{/if}}
   */
  Handlebars.registerHelper('hasItems', function (array: any) {
    return Array.isArray(array) && array.length > 0;
  });

  // ==========================================
  // COMPARISON HELPERS
  // ==========================================

  /**
   * Equality comparison
   * Usage: {{#if (eq level "3")}}...{{/if}}
   */
  Handlebars.registerHelper('eq', function (a: any, b: any) {
    return a === b;
  });

  /**
   * Not equal comparison
   * Usage: {{#if (ne status "draft")}}...{{/if}}
   */
  Handlebars.registerHelper('ne', function (a: any, b: any) {
    return a !== b;
  });

  /**
   * Greater than comparison
   * Usage: {{#if (gt numberOfBedrooms 3)}}...{{/if}}
   */
  Handlebars.registerHelper('gt', function (a: any, b: any) {
    return Number(a) > Number(b);
  });

  /**
   * Less than comparison
   * Usage: {{#if (lt numberOfBedrooms 2)}}...{{/if}}
   */
  Handlebars.registerHelper('lt', function (a: any, b: any) {
    return Number(a) < Number(b);
  });

  /**
   * Logical AND
   * Usage: {{#if (and condition1 condition2)}}...{{/if}}
   */
  Handlebars.registerHelper('and', function (a: any, b: any) {
    return a && b;
  });

  /**
   * Logical OR
   * Usage: {{#if (or condition1 condition2)}}...{{/if}}
   */
  Handlebars.registerHelper('or', function (a: any, b: any) {
    return a || b;
  });

  // ==========================================
  // SURVEY-SPECIFIC HELPERS
  // ==========================================

  /**
   * Format address as multi-line string
   * Usage: {{formatAddress reportDetails.address}}
   */
  Handlebars.registerHelper('formatAddress', function (address: any) {
    if (!address) return '';
    
    const parts = [
      address.line1,
      address.line2,
      address.line3,
      address.city,
      address.county,
      address.postcode,
    ].filter(Boolean);
    
    return parts.join(', ');
  });

  /**
   * Get CSS class for RAG status
   * Usage: <div class="{{ragColor ragStatus}}">
   */
  Handlebars.registerHelper('ragColor', function (status: string) {
    const statusLower = String(status).toLowerCase();
    if (statusLower === 'red') return 'text-red-600 font-bold';
    if (statusLower === 'amber') return 'text-amber-600 font-semibold';
    if (statusLower === 'green') return 'text-green-600';
    return '';
  });

  /**
   * Calculate total costings from all sections
   * Usage: {{totalCostings sections}}
   */
  Handlebars.registerHelper('totalCostings', function (sections: any[]) {
    if (!Array.isArray(sections)) return 0;
    
    let total = 0;
    sections.forEach((section) => {
      if (Array.isArray(section.elementSections)) {
        section.elementSections.forEach((elem: any) => {
          if (Array.isArray(elem.components)) {
            elem.components.forEach((comp: any) => {
              if (Array.isArray(comp.costings)) {
                comp.costings.forEach((costing: any) => {
                  total += Number(costing.cost) || 0;
                });
              }
            });
          }
        });
      }
    });
    
    return total;
  });

  /**
   * Count components by RAG status
   * Usage: {{countByStatus sections "Red"}}
   */
  Handlebars.registerHelper('countByStatus', function (sections: any[], status: string) {
    if (!Array.isArray(sections)) return 0;
    
    let count = 0;
    sections.forEach((section) => {
      if (Array.isArray(section.elementSections)) {
        section.elementSections.forEach((elem: any) => {
          if (Array.isArray(elem.components)) {
            elem.components.forEach((comp: any) => {
              if (comp.ragStatus === status) {
                count++;
              }
            });
          }
        });
      }
    });
    
    return count;
  });

  /**
   * Get level label
   * Usage: {{levelLabel reportDetails.level}}
   */
  Handlebars.registerHelper('levelLabel', function (level: string) {
    if (level === '2') return 'RICS HomeBuyer Report';
    if (level === '3') return 'RICS Building Survey';
    return 'Survey Report';
  });
}

// Register helpers on module load
registerHelpers();

/**
 * Render a Handlebars template with survey data
 * @param template The Handlebars template string
 * @param data The survey data to render with
 * @returns Rendered HTML string
 */
export function renderTemplate(
  template: string,
  data: BuildingSurveyFormData | Partial<BuildingSurveyFormData>,
): string {
  try {
    const compiled = Handlebars.compile(template);
    return compiled(data);
  } catch (error) {
    console.error('[renderTemplate] Error rendering template:', error);
    throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate template syntax without rendering
 * @param template The template string to validate
 * @returns Object with validation result and any error message
 */
export function validateTemplate(template: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    Handlebars.compile(template);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown syntax error',
    };
  }
}

/**
 * Extract variable paths from a template
 * Useful for showing which fields the template uses
 * @param template The template string
 * @returns Array of variable paths (e.g., ['reportDetails.clientName', 'sections'])
 */
export function extractVariables(template: string): string[] {
  const variables: string[] = [];
  const regex = /\{\{(?:#if|#each|#unless)?\s*([a-zA-Z0-9._]+)(?:\s|}})/g;
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const variable = match[1];
    if (variable && !variables.includes(variable)) {
      variables.push(variable);
    }
  }
  
  return variables.sort();
}

// Export for testing
export { registerHelpers };

