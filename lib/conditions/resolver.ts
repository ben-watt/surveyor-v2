import type { JSONContent } from '@tiptap/core';

/**
 * Resolve a TipTap JSON document to plain text by replacing inlineSelect nodes
 * with their selected value, or defaultValue, or an empty string.
 * Also normalizes spaces around punctuation.
 */
export function resolveDocToText(doc: JSONContent): string {
  const parts: string[] = [];

  const walk = (node?: JSONContent) => {
    if (!node) return;
    if (node.type === 'text') {
      parts.push(node.text ?? '');
      return;
    }
    if (node.type === 'inlineSelect') {
      const value = (node.attrs as any)?.value ?? (node.attrs as any)?.defaultValue ?? '';
      if (value) parts.push(String(value));
      return;
    }
    if (node.content && Array.isArray(node.content)) node.content.forEach(walk);
  };

  walk(doc);

  let out = parts.join('');
  // Normalize spaces: remove space before punctuation, collapse doubles
  out = out.replace(/\s+([,.;:!?])/g, '$1');
  out = out.replace(/\s{2,}/g, ' ');
  return out.trim();
}
