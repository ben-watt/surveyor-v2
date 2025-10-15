import type { JSONContent } from '@tiptap/core';
import { parseTemplate, serializeToken, type Span } from './tokens';

export function tokensToDoc(template: string): JSONContent {
  const spans = parseTemplate(template);
  const paragraphContent: JSONContent[] = [];
  for (const s of spans) {
    if (s.type === 'text') {
      if (s.value) paragraphContent.push({ type: 'text', text: s.value });
    } else {
      const t = s.token;
      paragraphContent.push({
        type: 'inlineSelect',
        attrs: {
          key: t.key,
          options: t.options,
          allowCustom: t.allowCustom,
          defaultValue: t.defaultValue ?? null,
          value: null,
        },
      });
    }
  }
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: paragraphContent }],
  } as JSONContent;
}

export function docToTokens(doc: JSONContent): string {
  const parts: string[] = [];
  const walk = (node?: JSONContent) => {
    if (!node) return;
    if (node.type === 'text') {
      parts.push(node.text ?? '');
      return;
    }
    if (node.type === 'inlineSelect') {
      const attrs = (node.attrs || {}) as any;
      const token = {
        kind: 'select' as const,
        key: String(attrs.key || ''),
        options: Array.isArray(attrs.options) ? attrs.options : [],
        allowCustom: attrs.allowCustom !== false,
        defaultValue: attrs.defaultValue ?? null,
      };
      parts.push(serializeToken(token));
      return;
    }
    if (node.content && Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(doc);
  return parts.join('');
}

/**
 * Returns a deep-cloned doc with any InlineSelect `value` cleared but preserves `defaultValue`.
 * Use when instantiating a condition for an inspection so user selections are not pre-filled,
 * while allowing configured defaults (from templates) to still appear.
 */
export function stripInlineSelectChoices(doc: JSONContent | undefined | null): JSONContent | undefined {
  if (!doc) return undefined;
  const clone = (node: any): any => {
    if (!node) return node;
    if (Array.isArray(node)) return node.map(clone);
    if (typeof node !== 'object') return node;
    const next: any = { ...node };
    if (node.type === 'inlineSelect') {
      next.attrs = { ...(node.attrs || {}), value: null };
    } else if (node.attrs) {
      next.attrs = { ...node.attrs };
    }
    if (Array.isArray(node.content)) {
      next.content = node.content.map(clone);
    }
    return next;
  };
  return clone(doc);
}
