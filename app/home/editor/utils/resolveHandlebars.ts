import { renderTemplate } from '@/app/home/surveys/templates/renderer';
import type { BuildingSurveyFormData } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { transformPageCounters } from './pageCounterTransform';

/**
 * Escapes special regex characters in a string for use in RegExp constructor
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if we can use DOM APIs (browser environment)
 */
function canUseDOM(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Resolves handlebars in text content only, preserving HTML structure.
 * This approach avoids parse errors when handlebars appear in HTML attributes or malformed positions.
 *
 * @param html - HTML string that may contain handlebar variables
 * @param editorData - Form data to use for resolving handlebars
 * @returns HTML with handlebars resolved (except page counters which are transformed to CSS counters)
 */
function resolveHandlebarsInTextNodes(
  html: string,
  editorData: BuildingSurveyFormData,
): string {
  if (!canUseDOM()) {
    // Fallback to simple string replacement in SSR
    return html;
  }

  const template = window.document.createElement('template');
  template.innerHTML = html;

  // Walk the DOM tree and resolve handlebars in text nodes only
  const walker = window.document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_TEXT,
    null,
  );

  const textNodes: { node: Text; originalText: string }[] = [];
  let node: Text | null;

  // Collect all text nodes that contain handlebars
  while ((node = walker.nextNode() as Text | null)) {
    if (node && node.textContent && /\{\{/.test(node.textContent)) {
      textNodes.push({ node, originalText: node.textContent });
    }
  }

  // Resolve handlebars in each text node
  for (const { node: textNode, originalText } of textNodes) {
    // Check for incomplete handlebar syntax (e.g., {{ without }})
    // This can happen when user is typing. Skip resolution to avoid parse errors.
    const openBraces = (originalText.match(/\{\{/g) || []).length;
    const closeBraces = (originalText.match(/\}\}/g) || []).length;
    
    // If there's an imbalance, there's incomplete syntax - skip resolution
    if (openBraces !== closeBraces) {
      // Keep original text when handlebar syntax is incomplete
      continue;
    }

    // Additional check: verify all {{ have matching }}
    // This handles edge cases like {{var{{other}} where nesting might confuse the count
    let braceDepth = 0;
    let hasIncomplete = false;
    for (let i = 0; i < originalText.length - 1; i++) {
      if (originalText.substring(i, i + 2) === '{{') {
        braceDepth++;
        i++; // Skip next character since we matched 2
      } else if (originalText.substring(i, i + 2) === '}}') {
        braceDepth--;
        if (braceDepth < 0) {
          // More closing than opening - malformed, skip
          hasIncomplete = true;
          break;
        }
        i++; // Skip next character since we matched 2
      }
    }
    
    // If brace depth is not zero or we detected malformed syntax, skip resolution
    if (hasIncomplete || braceDepth !== 0) {
      continue;
    }

    // Protect page counters first
    const pageCounterPlaceholders = {
      pageNumber: '<!-- PAGE_COUNTER_PAGE -->',
      totalPages: '<!-- PAGE_COUNTER_PAGES -->',
    };

    let protectedText = originalText
      .replace(/\{\{pageNumber\}\}/g, pageCounterPlaceholders.pageNumber)
      .replace(/\{\{totalPages\}\}/g, pageCounterPlaceholders.totalPages);

    // Resolve other handlebars
    try {
      const resolvedText = renderTemplate(protectedText, editorData);

      // Restore page counter placeholders
      const finalText = resolvedText
        .replace(
          new RegExp(escapeRegex(pageCounterPlaceholders.pageNumber), 'g'),
          '{{pageNumber}}',
        )
        .replace(
          new RegExp(escapeRegex(pageCounterPlaceholders.totalPages), 'g'),
          '{{totalPages}}',
        );

      textNode.textContent = finalText;
    } catch (error) {
      // If resolution fails for this text node, keep original
      // This handles cases where handlebar syntax is malformed
      console.warn(
        '[resolveHandlebars] Failed to resolve handlebars in text node:',
        error,
      );
    }
  }

  return template.innerHTML;
}

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
    // Use DOM-based approach to resolve handlebars only in text nodes
    // This avoids parse errors when handlebars appear near HTML attributes or in malformed positions
    const resolvedHtml = resolveHandlebarsInTextNodes(html, editorData);

    // Transform page counters to CSS counter elements
    return transformPageCounters(resolvedHtml);
  } catch (error) {
    // If handlebar resolution fails, log error and return original HTML
    console.warn(
      '[resolveHandlebars] Failed to resolve handlebars, returning original HTML:',
      error,
    );
    return html;
  }
}

