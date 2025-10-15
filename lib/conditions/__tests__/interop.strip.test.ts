import type { JSONContent } from '@tiptap/core';
import { stripInlineSelectChoices } from '@/lib/conditions/interop';

describe('stripInlineSelectChoices', () => {
  test('clears value but preserves defaultValue on inlineSelect', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'A ' },
            {
              type: 'inlineSelect',
              attrs: { key: 'k', options: ['a', 'b'], defaultValue: 'a', value: 'b' },
            } as any,
          ],
        },
      ],
    } as any;

    const out = stripInlineSelectChoices(doc)!;
    const node = (out.content?.[0] as any).content?.[1] as any;
    expect(node.type).toBe('inlineSelect');
    expect(node.attrs.defaultValue).toBe('a');
    expect(node.attrs.value).toBeNull();
  });

  test('no default configured: leaves defaultValue null and clears value', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'inlineSelect',
              attrs: { key: 'k', options: ['a', 'b'], defaultValue: null, value: 'a' },
            } as any,
          ],
        },
      ],
    } as any;

    const out = stripInlineSelectChoices(doc)!;
    const node = (out.content?.[0] as any).content?.[0] as any;
    expect(node.attrs.defaultValue).toBeNull();
    expect(node.attrs.value).toBeNull();
  });

  test('deeply nested content is handled', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Prefix ',
            },
            {
              type: 'inlineSelect',
              attrs: { key: 'k', options: ['x'], defaultValue: 'x', value: 'x' },
            } as any,
            {
              type: 'text',
              text: ' Suffix',
            },
          ],
        },
      ],
    } as any;

    const out = stripInlineSelectChoices(doc)!;
    const node = (out.content?.[0] as any).content?.[1] as any;
    expect(node.attrs.defaultValue).toBe('x');
    expect(node.attrs.value).toBeNull();
  });
});


