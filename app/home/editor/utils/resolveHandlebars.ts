import { renderTemplate } from '@/app/home/surveys/templates/renderer';
import type { BuildingSurveyFormData } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { transformPageCounters } from './pageCounterTransform';

/**
 * Resolves handlebar variables in HTML content using form data.
 * Page counters ({{pageNumber}}, {{totalPages}}) are preserved and transformed separately.
 *
 * @param html - HTML string that may contain handlebar variables
 * @param editorData - Form data to use for resolving handlebars
 * @returns HTML with handlebars resolved (except page counters which are transformed to CSS counters)
 */
export function resolveHandlebars(
  html: string,
  editorData: BuildingSurveyFormData | undefined,
): string {
  if (!html) {
    return html;
  }

  // If no editorData, return HTML as-is (can't resolve handlebars without data)
  if (!editorData) {
    return html;
  }

  try {
    // First, temporarily replace page counters with placeholders to protect them
    // Page counters need special CSS counter transformation, not handlebar resolution
    const pageCounterPlaceholders = {
      pageNumber: '__PAGE_COUNTER_PAGE__',
      totalPages: '__PAGE_COUNTER_PAGES__',
    };

    let protectedHtml = html
      .replace(/\{\{pageNumber\}\}/g, pageCounterPlaceholders.pageNumber)
      .replace(/\{\{totalPages\}\}/g, pageCounterPlaceholders.totalPages);

    // Resolve all other handlebars using renderTemplate
    const resolvedHtml = renderTemplate(protectedHtml, editorData);

    // Restore page counter placeholders and transform them to CSS counters
    const finalHtml = resolvedHtml
      .replace(new RegExp(pageCounterPlaceholders.pageNumber, 'g'), '{{pageNumber}}')
      .replace(new RegExp(pageCounterPlaceholders.totalPages, 'g'), '{{totalPages}}');

    // Transform page counters to CSS counter elements
    return transformPageCounters(finalHtml);
  } catch (error) {
    // If handlebar resolution fails, log error and return original HTML
    console.warn('[resolveHandlebars] Failed to resolve handlebars, returning original HTML:', error);
    return html;
  }
}

