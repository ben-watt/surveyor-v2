import { isDocUnresolved, isPhraseLikelyUnresolved, isConditionUnresolved } from '@/lib/conditions/validator';

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

  test('phrase-only unresolved when select token without default', () => {
    const phrase = 'The roof is {{select:state|Good|Poor}} overall.';
    expect(isPhraseLikelyUnresolved(phrase)).toBe(true);
  });

  test('phrase-only not unresolved when select* with default', () => {
    const phrase = 'The roof is {{select*:state|default=Good|Good|Poor}} overall.';
    expect(isPhraseLikelyUnresolved(phrase)).toBe(false);
  });

  test('isConditionUnresolved prefers doc over phrase', () => {
    const condition: any = {
      phrase: 'The roof is {{select:state|Good|Poor}} overall.',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'The roof is ' },
              {
                type: 'inlineSelect',
                attrs: { key: 'state', options: ['Good', 'Poor'], value: 'Good' },
              },
            ],
          },
        ],
      },
    };
    expect(isConditionUnresolved(condition)).toBe(false);
  });
});
