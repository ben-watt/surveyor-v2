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
