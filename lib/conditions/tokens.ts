export type SelectToken = {
  kind: 'select';
  key: string;
  options: string[];
  allowCustom: boolean;
  defaultValue?: string | null;
};

export type Span = { type: 'text'; value: string } | { type: 'token'; token: SelectToken };

const TOKEN_RE = /\{\{(?<flags>[a-z+*]*):(?<key>[a-zA-Z0-9_\-]+)\|(?<body>.*?)\}\}/gs;

export function parseTemplate(template: string): Span[] {
  const spans: Span[] = [];
  let idx = 0;
  for (const m of template.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (start > idx) spans.push({ type: 'text', value: template.slice(idx, start) });
    const groups = m.groups as any;
    const flags = groups?.flags as string | undefined;
    const key = groups?.key as string | undefined;
    const body = groups?.body as string | undefined;
    if (!key || body == null) {
      spans.push({ type: 'text', value: m[0] });
      idx = end;
      continue;
    }
    const parts = body
      .split(/(?<!\\)\|/)
      .map((p: string) => p.replace(/\\\|/g, '|').trim())
      .filter(Boolean);
    const defaultParam = parts.find((p: string) => p.startsWith('default='));
    const options = parts.filter((p: string) => !p.startsWith('default='));
    const allowCustom = flags?.includes('+') ?? true;
    const defaultValue = defaultParam ? defaultParam.slice('default='.length) : null;
    spans.push({
      type: 'token',
      token: { kind: 'select', key, options, allowCustom, defaultValue },
    });
    idx = end;
  }
  if (idx < template.length) spans.push({ type: 'text', value: template.slice(idx) });
  return spans;
}

export function serializeToken(t: SelectToken): string {
  const opts = t.options.map((o) => o.replace(/\|/g, '\\|'));
  const parts = [t.defaultValue ? `default=${t.defaultValue}` : null, ...opts].filter(Boolean);
  const flag = t.allowCustom ? '+' : '';
  return `{{select${flag}:${t.key}|${parts.join('|')}}}`;
}

export function serializeTemplate(spans: Span[]): string {
  return spans.map((s) => (s.type === 'text' ? s.value : serializeToken(s.token))).join('');
}
