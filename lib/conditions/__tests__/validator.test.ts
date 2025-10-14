import '@testing-library/jest-dom';
import type { JSONContent } from '@tiptap/core';
import { validateDoc, validateInlineSelectAttrs, validateTemplate } from '@/lib/conditions/validator';

describe('conditions validator', () => {
  test('validateInlineSelectAttrs flags missing key, empty options, dup, invalid default', () => {
    const issues = validateInlineSelectAttrs({ key: '', options: ['a', 'a', ''], defaultValue: 'z' }, ['doc']);
    const codes = issues.map((i) => i.code).sort();
    expect(codes).toEqual(['DUP_OPTION', 'EMPTY_OPTIONS', 'INVALID_DEFAULT', 'MISSING_KEY'].sort());
    // messages present and path preserved
    expect(issues[0].message.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.path.join('.').startsWith('doc'))).toBe(true);
  });

  test('validateDoc returns ok=true for valid inlineSelect', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'inlineSelect',
              attrs: { key: 'k', options: ['a', 'b'], defaultValue: 'a', allowCustom: true },
            },
            { type: 'text', text: ' world.' },
          ],
        },
      ],
    } as any;
    const res = validateDoc(doc);
    expect(res.ok).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  test('validateDoc collects issues from nested content', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'inlineSelect',
              attrs: { key: '', options: [], defaultValue: 'x' },
            },
          ],
        },
      ],
    } as any;
    const res = validateDoc(doc);
    expect(res.ok).toBe(false);
    const codes = res.issues.map((i) => i.code).sort();
    expect(codes).toEqual(['EMPTY_OPTIONS', 'INVALID_DEFAULT', 'MISSING_KEY'].sort());
  });

  test('validateTemplate parses tokens and validates', () => {
    const valid = validateTemplate('Start {{select+:key|default=a|a|b}} end');
    expect(valid.ok).toBe(true);
    const invalid = validateTemplate('Start {{select:key|default=z|a|b}} end');
    expect(invalid.ok).toBe(false);
    expect(invalid.issues.some((i) => i.code === 'INVALID_DEFAULT')).toBe(true);
  });
});


