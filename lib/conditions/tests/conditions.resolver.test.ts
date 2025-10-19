import { resolveDocToText } from '@/lib/conditions/resolver';

describe('conditions resolver', () => {
  test('resolves inlineSelect nodes', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'The installation appears aged, with ' },
            {
              type: 'inlineSelect',
              attrs: {
                key: 'electrical_findings',
                options: ['a dated consumer unit', 'older wiring'],
                value: 'older wiring',
              },
            },
            { type: 'text', text: ' noted.' },
          ],
        },
      ],
    } as any;
    const out = resolveDocToText(doc);
    expect(out).toBe('The installation appears aged, with older wiring noted.');
  });
});
