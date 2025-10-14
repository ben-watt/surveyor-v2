'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import InlineSelect from '@/app/home/components/TipTapExtensions/InlineSelect';
import { tokensToDoc, docToTokens } from '@/lib/conditions/interop';
import { resolveDocToText } from '@/lib/conditions/resolver';
import { parseTemplate } from '@/lib/conditions/tokens';
import TokenEditor, { type TokenEditorHandle } from './TokenEditor';

const SAMPLE = `The electrical installation appears aged, with {{select+:electrical_findings|a dated consumer unit|older wiring|loose or surface-mounted cabling|dated fittings}} noted. No specialist electrical testing was undertaken as part of this inspection, so the safety and compliance of the installation cannot be confirmed. We recommend obtaining commissioning and testing certificates from the vendor to confirm that the installation was carried out by a suitably qualified electrician (NICEIC or equivalent). If documentation is unavailable, an Electrical Installation Condition Report (EICR) should be commissioned.

Based on the observed condition, significant upgrading — potentially including a full rewire — may be required to ensure safety and compliance with current standards. Advice and costings should be obtained from a suitably qualified electrician before exchange of contracts.`;

export default function InlineSelectDevPage() {
  const [template, setTemplate] = React.useState<string>(SAMPLE);
  const [resolved, setResolved] = React.useState<string>('');
  const [exported, setExported] = React.useState<string>('');
  const tokenEditorRef = React.useRef<TokenEditorHandle>(null);
  const highlighted = React.useMemo(() => {
    const spans = parseTemplate(template);
    return (
      <div className="whitespace-pre-wrap break-words rounded border p-2 font-mono text-sm">
        {spans.map((s, i) =>
          s.type === 'text' ? (
            <span key={i}>{s.value}</span>
          ) : (
            <span
              key={i}
              title={s.token.key}
              className="mx-0.5 rounded border border-purple-200 bg-purple-50 px-1 py-0.5 text-purple-700"
            >
              {`{{select:${s.token.key}|${s.token.options.join('|')}}}`}
            </span>
          ),
        )}
      </div>
    );
  }, [template]);

  const editor = useEditor({
    extensions: [StarterKit, InlineSelect],
    content: tokensToDoc(SAMPLE) as any,
  });

  const loadIntoEditor = React.useCallback(() => {
    if (!editor) return;
    try {
      const doc = tokensToDoc(template);
      editor
        .chain()
        .setContent(doc as any, false)
        .focus()
        .run();
    } catch (e) {
      console.error(e);
      alert('Failed to parse template – please check syntax.');
    }
  }, [editor, template]);

  const exportFromEditor = React.useCallback(() => {
    if (!editor) return;
    const doc = editor.getJSON();
    const tokens = docToTokens(doc as any);
    setExported(tokens);
  }, [editor]);

  const resolveFromEditor = React.useCallback(() => {
    if (!editor) return;
    const doc = editor.getJSON();
    const text = resolveDocToText(doc as any);
    setResolved(text);
  }, [editor]);

  const insertSampleSelect = React.useCallback(() => {
    if (!editor) return;
    editor.commands.insertInlineSelect({
      key: `electrical_findings_${Math.random().toString(36).slice(2, 6)}`,
      options: [
        'a dated consumer unit',
        'older wiring',
        'loose or surface-mounted cabling',
        'dated fittings',
      ],
      allowCustom: true,
    });
  }, [editor]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">InlineSelect Dev Tester</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm font-medium">
            Tokenized Template (with inline highlights)
          </label>
          <TokenEditor ref={tokenEditorRef} value={template} onChange={setTemplate} />
          <div className="flex gap-2">
            <button
              className="rounded border bg-blue-600 px-3 py-1.5 text-white"
              onClick={loadIntoEditor}
            >
              Load into editor
            </button>
            <button
              className="rounded border px-3 py-1.5"
              onClick={() => tokenEditorRef.current?.insertSampleSelect()}
            >
              Insert sample token
            </button>
          </div>
          {/* Preview removed since the editor now highlights inline */}
        </div>
        <div>
          <label className="block text-sm font-medium">Editor</label>
          <div className="rounded border">
            <EditorContent editor={editor} />
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded border px-3 py-1.5" onClick={exportFromEditor}>
              Export tokens
            </button>
            <button className="rounded border px-3 py-1.5" onClick={resolveFromEditor}>
              Resolve text
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Exported Tokens</label>
          <pre className="min-h-24 w-full whitespace-pre-wrap break-words rounded border p-2">
            {exported}
          </pre>
        </div>
        <div>
          <label className="block text-sm font-medium">Resolved Text</label>
          <pre className="min-h-24 w-full whitespace-pre-wrap break-words rounded border p-2">
            {resolved}
          </pre>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Tips:
        <ul className="ml-6 list-disc">
          <li>Type or paste tokens like {`{{select+:key|opt1|opt2}}`} to auto-convert.</li>
          <li>Legacy bracket blocks like [a / b] also auto-convert.</li>
          <li>Use the dropdown or “Add custom…” to set a value inline.</li>
        </ul>
      </div>
    </div>
  );
}
