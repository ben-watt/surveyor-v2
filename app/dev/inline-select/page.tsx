'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import InlineSelect from '@/app/home/components/TipTapExtensions/InlineSelect';
import { tokensToDoc, docToTokens } from '@/lib/conditions/interop';
import TokenEditor, { type TokenEditorHandle } from './TokenEditor';

const SAMPLE = `The electrical installation appears aged, with {{select+:electrical_findings|a dated consumer unit|older wiring|loose or surface-mounted cabling|dated fittings}} noted. No specialist electrical testing was undertaken as part of this inspection, so the safety and compliance of the installation cannot be confirmed. We recommend obtaining commissioning and testing certificates from the vendor to confirm that the installation was carried out by a suitably qualified electrician (NICEIC or equivalent). If documentation is unavailable, an Electrical Installation Condition Report (EICR) should be commissioned.

Based on the observed condition, significant upgrading — potentially including a full rewire — may be required to ensure safety and compliance with current standards. Advice and costings should be obtained from a suitably qualified electrician before exchange of contracts.`;

export default function InlineSelectDevPage() {
  const [template, setTemplate] = React.useState<string>(SAMPLE);
  const [mode, setMode] = React.useState<'tokens' | 'visual'>('tokens');
  const tokenEditorRef = React.useRef<TokenEditorHandle>(null);
  const pendingVisualSyncRef = React.useRef(false);

  const modeRef = React.useRef(mode);
  React.useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const editor = useEditor({
    extensions: [StarterKit, InlineSelect],
    content: tokensToDoc(SAMPLE) as any,
    onUpdate: ({ editor }) => {
      if (modeRef.current !== 'visual') return;
      const doc = editor.getJSON();
      const tokens = docToTokens(doc as any);
      setTemplate(tokens);
    },
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

  const syncFromEditor = React.useCallback(() => {
    if (!editor) return;
    const doc = editor.getJSON();
    try {
      const tokens = docToTokens(doc as any);
      setTemplate(tokens);
    } catch (e) {
      console.error(e);
      alert('Failed to export tokens from editor.');
    }
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

  const handleShowTokens = React.useCallback(() => {
    if (mode === 'tokens') return;
    if (editor) syncFromEditor();
    setMode('tokens');
  }, [editor, mode, syncFromEditor]);

  const handleShowVisual = React.useCallback(() => {
    if (mode === 'visual') return;
    if (editor) {
      setTimeout(() => {
        if (modeRef.current !== 'visual') return;
        loadIntoEditor();
      }, 0);
      pendingVisualSyncRef.current = false;
    } else {
      pendingVisualSyncRef.current = true;
    }
    setMode('visual');
  }, [editor, loadIntoEditor, mode]);

  React.useEffect(() => {
    if (!editor) return;
    if (mode !== 'visual') return;
    if (!pendingVisualSyncRef.current) return;
    pendingVisualSyncRef.current = false;
    setTimeout(() => {
      if (modeRef.current !== 'visual') return;
      loadIntoEditor();
    }, 0);
  }, [editor, mode, loadIntoEditor]);

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(mode === 'visual');
  }, [editor, mode]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">InlineSelect Dev Tester</h1>
      <div className="space-y-3">
        <label className="block text-sm font-medium">Tokenized Template</label>
        <div className="flex w-full items-center gap-2">
          <button
            className={`rounded border px-3 py-1.5 ${
              mode === 'tokens' ? 'bg-blue-600 text-white' : ''
            }`}
            onClick={handleShowTokens}
          >
            Token view
          </button>
          <button
            className={`rounded border px-3 py-1.5 ${
              mode === 'visual' ? 'bg-blue-600 text-white' : ''
            }`}
            onClick={handleShowVisual}
          >
            Visual view
          </button>
          <div className="flex-1" />
          {mode === 'tokens' ? (
            <button
              className="rounded border px-3 py-1.5"
              onClick={() => tokenEditorRef.current?.insertSampleSelect()}
            >
              Insert sample token
            </button>
          ) : (
            <button className="rounded border px-3 py-1.5" onClick={insertSampleSelect}>
              Insert inline select
            </button>
          )}
        </div>
        <div className={mode === 'tokens' ? 'block' : 'hidden'}>
          <TokenEditor ref={tokenEditorRef} value={template} onChange={setTemplate} />
        </div>
        <div className={`rounded border ${mode === 'visual' ? 'block' : 'hidden'}`}>
          <EditorContent editor={editor} className="min-h-[16rem] p-3" />
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
