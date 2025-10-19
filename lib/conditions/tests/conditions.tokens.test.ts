import { parseTemplate, serializeTemplate } from '@/lib/conditions/tokens';

describe('conditions tokens', () => {
  test('parses basic select token', () => {
    const spans = parseTemplate('A {{select+:key|opt1|opt2}} B');
    expect(spans).toHaveLength(3);
    if (spans[1].type === 'token') {
      expect(spans[1].token.key).toBe('key');
      expect(spans[1].token.options).toEqual(['opt1', 'opt2']);
      expect(spans[1].token.allowCustom).toBe(true);
    } else {
      throw new Error('expected token span');
    }
  });

  test('round-trips serialize', () => {
    const s = 'Hello {{select+:g|default=opt2|opt1|opt2}} world';
    const spans = parseTemplate(s);
    const out = serializeTemplate(spans);
    expect(out).toContain('{{select+:g|default=opt2|opt1|opt2}}');
  });
});
