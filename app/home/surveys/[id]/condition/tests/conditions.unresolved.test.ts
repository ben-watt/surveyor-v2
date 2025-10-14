import { isDocUnresolved } from '@/lib/conditions/validator';

describe('Inspection conditions - unresolved logic', () => {
  test('flags unresolved when inlineSelect has no value or default', () => {
    const doc: any = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'A ' },
            { type: 'inlineSelect', attrs: { key: 'k', options: ['a', 'b'] } },
          ],
        },
      ],
    };
    expect(isDocUnresolved(doc)).toBe(true);
  });

  test('does not flag when value is present', () => {
    const doc: any = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'inlineSelect', attrs: { key: 'k', options: ['a', 'b'], value: 'a' } }],
        },
      ],
    };
    expect(isDocUnresolved(doc)).toBe(false);
  });
});
