/**
 * Transforms handlebar-style page counter syntax into CSS counter elements
 * that paged.js can render at pagination time.
 *
 * Supported counters:
 * - {{pageNumber}} → current page number (e.g., 3)
 * - {{totalPages}} → total number of pages (e.g., 15)
 *
 * Example:
 * Input:  "Page {{pageNumber}} of {{totalPages}}"
 * Output: "Page <span class="paged-counter" data-counter-type="page"></span> of <span class="paged-counter" data-counter-type="pages"></span>"
 */

export function transformPageCounters(html: string): string {
  if (!html) {
    return html;
  }

  return html
    .replace(
      /\{\{pageNumber\}\}/g,
      '<span class="paged-counter" data-counter-type="page"></span>'
    )
    .replace(
      /\{\{totalPages\}\}/g,
      '<span class="paged-counter" data-counter-type="pages"></span>'
    );
}

/**
 * Checks if HTML contains any page counter handlebars
 */
export function hasPageCounters(html: string): boolean {
  if (!html) {
    return false;
  }
  return /\{\{(?:pageNumber|totalPages)\}\}/.test(html);
}
