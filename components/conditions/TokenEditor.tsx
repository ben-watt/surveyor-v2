'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { Extension, RangeSetBuilder } from '@codemirror/state';

type Props = { value: string; onChange: (v: string) => void };

export type TokenEditorHandle = {
  insertText: (text: string) => void;
  insertSampleSelect: () => void;
};

// Simple highlighter for {{select:...}} and [a / b] patterns.
function tokenHighlightExtension(): Extension {
  const clsValid = EditorView.baseTheme({
    '.cm-token-valid': {
      backgroundColor: '#F3E8FF',
      color: '#6B21A8',
      border: '1px solid #E9D5FF',
      borderRadius: '4px',
    },
    '.cm-token-legacy': {
      backgroundColor: '#EFF6FF',
      color: '#1D4ED8',
      border: '1px solid #DBEAFE',
      borderRadius: '4px',
    },
    '.cm-token-invalid': {
      backgroundColor: '#FEF2F2',
      color: '#991B1B',
      border: '1px solid #FECACA',
      borderRadius: '4px',
    },
  });

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.buildDeco(view);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged) this.decorations = this.buildDeco(u.view);
      }
      buildDeco(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const text = view.state.doc.toString();

        const tokenRe = /\{\{(?<flags>[a-z+*]*):(?<key>[a-zA-Z0-9_\-]+)\|(?<body>.*?)\}\}/gs;
        const bracketRe = /\[(?<opts>[^\]]+)]/g;

        for (const m of text.matchAll(tokenRe)) {
          const start = m.index ?? 0;
          const end = start + m[0].length;
          const groups = m.groups as any;
          const key = groups?.key as string | undefined;
          const body = groups?.body as string | undefined;
          let decoClass = 'cm-token-valid';
          if (!key || !body || !body.includes('|')) decoClass = 'cm-token-invalid';
          const deco = Decoration.mark({ class: decoClass });
          builder.add(start, end, deco);
        }

        for (const m of text.matchAll(bracketRe)) {
          const start = m.index ?? 0;
          const end = start + m[0].length;
          const deco = Decoration.mark({ class: 'cm-token-legacy' });
          builder.add(start, end, deco);
        }

        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );

  return [clsValid, plugin];
}

const TokenEditor = forwardRef<TokenEditorHandle, Props>(function TokenEditor(
  { value, onChange }: Props,
  ref,
) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      const view = cmRef.current?.view;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({ changes: { from, to, insert: text } });
      // Trigger onChange via view update
      onChange(view.state.doc.toString());
      view.focus();
    },
    insertSampleSelect: () => {
      const key = `electrical_findings_${Math.random().toString(36).slice(2, 6)}`;
      const token = `{{select+:${key}|a dated consumer unit|older wiring|loose or surface-mounted cabling|dated fittings}}`;
      const view = cmRef.current?.view;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const needsSpace =
        from > 0 && /\S$/.test(view.state.doc.sliceString(Math.max(0, from - 1), from));
      const insertStr = (needsSpace ? ' ' : '') + token + ' ';
      view.dispatch({ changes: { from, to, insert: insertStr } });
      onChange(view.state.doc.toString());
      view.focus();
    },
  }));

  return (
    <div className="rounded border">
      <CodeMirror
        ref={cmRef}
        value={value}
        height="16rem"
        basicSetup={{ lineNumbers: false }}
        onChange={(v) => onChange(v)}
        extensions={[tokenHighlightExtension(), EditorView.lineWrapping]}
      />
    </div>
  );
});

export default TokenEditor;
