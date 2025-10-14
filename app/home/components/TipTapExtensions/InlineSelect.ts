import { Node, mergeAttributes, InputRule, PasteRule } from '@tiptap/core';
import { InlineSelectNodeView } from './InlineSelectNodeView';

export type InlineSelectAttrs = {
  key: string;
  options: string[];
  allowCustom?: boolean; // default true
  defaultValue?: string;
  value?: string; // current selection (may be custom)
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineSelect: {
      insertInlineSelect: (attrs: InlineSelectAttrs) => ReturnType;
      setInlineSelectValue: (key: string, value: string) => ReturnType;
    };
  }
}

const NAME = 'inlineSelect';

export const InlineSelect = Node.create({
  name: NAME,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      key: { default: '' },
      options: { default: [] },
      allowCustom: { default: true },
      defaultValue: { default: null },
      value: { default: null },
    } satisfies Record<keyof InlineSelectAttrs, any>;
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${NAME}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': NAME }), 0];
  },

  addNodeView() {
    return InlineSelectNodeView;
  },

  addCommands() {
    return {
      insertInlineSelect:
        (attrs: InlineSelectAttrs) =>
        ({ chain }) => {
          const a = { allowCustom: true, ...attrs } as InlineSelectAttrs;
          if (!a.key) a.key = `select_${Math.random().toString(36).slice(2, 8)}`;
          return chain().insertContent({ type: NAME, attrs: a }).run();
        },
      setInlineSelectValue:
        (key: string, value: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let modified = false;
          doc.descendants((node, pos) => {
            if (node.type.name === NAME && node.attrs.key === key) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, value });
              modified = true;
            }
            return true;
          });
          if (modified && dispatch) dispatch(tr);
          return modified;
        },
    };
  },

  addInputRules() {
    const tokenRegex = /\{\{(?<flags>[a-z+*]*):(?<key>[a-zA-Z0-9_\-]+)\|(?<body>.*?)\}\}/;
    const bracketRegex = /\[(?<opts>[^\]]+)]/;

    const parseToken = (m: RegExpMatchArray | null) => {
      if (!m || !m.groups) return null;
      const { flags, key } = m.groups as any;
      const body = (m.groups as any).body as string;
      const parts = body
        .split(/(?<!\\)\|/)
        .map((p) => p.replace(/\\\|/g, '|').trim())
        .filter(Boolean);
      const defaultParam = parts.find((p) => p.startsWith('default='));
      const options = parts.filter((p) => !p.startsWith('default='));
      const allowCustom = flags?.includes('+') ?? true;
      const defaultValue = defaultParam ? defaultParam.slice('default='.length) : null;
      return { key, options, allowCustom, defaultValue } as InlineSelectAttrs;
    };

    const parseBracket = (m: RegExpMatchArray | null) => {
      if (!m || !m.groups) return null;
      const opts = (m.groups as any).opts as string;
      const options = opts
        .split('/')
        .map((p) => p.trim())
        .filter(Boolean);
      return {
        key: `select_${Math.random().toString(36).slice(2, 8)}`,
        options,
        allowCustom: true,
      } as InlineSelectAttrs;
    };

    const tokenRule = new InputRule({
      find: tokenRegex,
      handler: ({ state, range, match, chain }) => {
        const attrs = parseToken(match);
        if (!attrs || !attrs.key || !attrs.options.length) return;
        chain().insertContentAt(range, { type: NAME, attrs }).run();
      },
    });

    const bracketRule = new InputRule({
      find: bracketRegex,
      handler: ({ state, range, match, chain }) => {
        const attrs = parseBracket(match);
        if (!attrs || !attrs.options.length) return;
        chain().insertContentAt(range, { type: NAME, attrs }).run();
      },
    });

    return [tokenRule, bracketRule];
  },

  addPasteRules() {
    // Reuse the same regexes as input rules for simplicity
    const tokenRegex = /\{\{(?<flags>[a-z+*]*):(?<key>[a-zA-Z0-9_\-]+)\|(?<body>.*?)\}\}/g;
    const bracketRegex = /\[(?<opts>[^\]]+)]/g;

    const replace = (text: string): any[] => {
      const nodes: any[] = [];
      let idx = 0;
      const pushText = (end: number) => {
        const slice = text.slice(idx, end);
        if (slice) nodes.push({ type: 'text', text: slice });
        idx = end;
      };

      const matches: { start: number; end: number; attrs: InlineSelectAttrs }[] = [];
      for (const m of text.matchAll(tokenRegex)) {
        const attrs = (() => {
          const groups = m.groups as any;
          if (!groups) return null;
          const { flags, key } = groups;
          const body = groups.body as string;
          const parts = body
            .split(/(?<!\\)\|/)
            .map((p) => p.replace(/\\\|/g, '|').trim())
            .filter(Boolean);
          const defaultParam = parts.find((p) => p.startsWith('default='));
          const options = parts.filter((p) => !p.startsWith('default='));
          const allowCustom = flags?.includes('+') ?? true;
          const defaultValue = defaultParam ? defaultParam.slice('default='.length) : null;
          return { key, options, allowCustom, defaultValue } as InlineSelectAttrs;
        })();
        if (attrs) matches.push({ start: m.index!, end: m.index! + m[0].length, attrs });
      }
      for (const m of text.matchAll(bracketRegex)) {
        const opts = (m.groups as any)?.opts as string | undefined;
        if (!opts) continue;
        const options = opts
          .split('/')
          .map((p) => p.trim())
          .filter(Boolean);
        if (options.length) {
          matches.push({
            start: m.index!,
            end: m.index! + m[0].length,
            attrs: {
              key: `select_${Math.random().toString(36).slice(2, 8)}`,
              options,
              allowCustom: true,
            },
          });
        }
      }

      matches.sort((a, b) => a.start - b.start);
      for (const m of matches) {
        if (m.start > idx) pushText(m.start);
        nodes.push({ type: NAME, attrs: m.attrs });
        idx = m.end;
      }
      if (idx < text.length) pushText(text.length);
      return nodes;
    };

    return [
      new PasteRule({
        find: tokenRegex,
        handler: ({ slice, chain }: any) => {
          const text = slice.content.textBetween(0, slice.content.size, '\n');
          const nodes = replace(text);
          chain().insertContent(nodes).run();
        },
      }),
      new PasteRule({
        find: bracketRegex,
        handler: ({ slice, chain }: any) => {
          const text = slice.content.textBetween(0, slice.content.size, '\n');
          const nodes = replace(text);
          chain().insertContent(nodes).run();
        },
      }),
    ];
  },
});

export default InlineSelect;
