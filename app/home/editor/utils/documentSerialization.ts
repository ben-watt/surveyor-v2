import type { PageLayoutSnapshot } from '@/app/home/components/Input/PageLayoutContext';
import type { MarginZone } from '@/app/home/components/Input/PageLayoutContext';
import { DEFAULT_RUNNING_PAGE_HTML } from '@/app/home/components/Input/PageLayoutContext';

/**
 * Structured document format for persisting editor content
 */
export type DocumentContent = {
  body: string; // Body HTML content
  runningHtml: Record<MarginZone, string>; // All 16 margin zone contents
  titlePage?: string; // Cover page HTML
  layout?: PageLayoutSnapshot; // Optional: page layout settings
};

/**
 * Serializes DocumentContent to JSON string
 */
export function serializeDocument(content: DocumentContent): string {
  return JSON.stringify(content);
}

/**
 * Deserializes JSON string to DocumentContent
 * Throws if content is not valid JSON
 */
export function deserializeDocument(content: string): DocumentContent {
  try {
    const parsed = JSON.parse(content) as DocumentContent;
    // Ensure runningHtml has all required zones with defaults
    return {
      body: parsed.body ?? '',
      runningHtml: {
        ...DEFAULT_RUNNING_PAGE_HTML,
        ...(parsed.runningHtml ?? {}),
      },
      titlePage: parsed.titlePage,
      layout: parsed.layout,
    };
  } catch (error) {
    throw new Error(
      `Failed to deserialize document content: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
    );
  }
}

