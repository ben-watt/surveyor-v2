'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import InlineSelect from '@/app/home/components/TipTapExtensions/InlineSelect';
import { tokensToDoc, docToTokens } from '@/lib/conditions/interop';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Code, Type } from 'lucide-react';
import TokenEditor, { type TokenEditorHandle } from './TokenEditor';

const SAMPLE = `The electrical installation appears aged, with {{select+:electrical_findings|a dated consumer unit|older wiring|loose or surface-mounted cabling|dated fittings}} noted. No specialist electrical testing was undertaken as part of this inspection, so the safety and compliance of the installation cannot be confirmed. We recommend obtaining commissioning and testing certificates from the vendor to confirm that the installation was carried out by a suitably qualified electrician (NICEIC or equivalent). If documentation is unavailable, an Electrical Installation Condition Report (EICR) should be commissioned.

Based on the observed condition, significant upgrading — potentially including a full rewire — may be required to ensure safety and compliance with current standards. Advice and costings should be obtained from a suitably qualified electrician before exchange of contracts.`;

export default function InlineSelectDevPage() {
  const [template, setTemplate] = React.useState<string>(SAMPLE);
  const [mode, setMode] = React.useState<'tokens' | 'visual'>('tokens');
  const tokenEditorRef = React.useRef<TokenEditorHandle>(null);
  const pendingVisualSyncRef = React.useRef(false);
  const visualSyncRafRef = React.useRef<number | null>(null);

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

  const cancelScheduledVisualSync = React.useCallback(() => {
    if (visualSyncRafRef.current !== null) {
      cancelAnimationFrame(visualSyncRafRef.current);
      visualSyncRafRef.current = null;
    }
  }, []);

  const scheduleVisualSync = React.useCallback(() => {
    if (modeRef.current !== 'visual') return;
    if (!editor) {
      pendingVisualSyncRef.current = true;
      return;
    }
    pendingVisualSyncRef.current = false;
    cancelScheduledVisualSync();
    visualSyncRafRef.current = requestAnimationFrame(() => {
      if (modeRef.current !== 'visual') return;
      loadIntoEditor();
      visualSyncRafRef.current = null;
    });
  }, [cancelScheduledVisualSync, editor, loadIntoEditor]);

  const handleShowTokens = React.useCallback(() => {
    if (mode === 'tokens') return;
    cancelScheduledVisualSync();
    pendingVisualSyncRef.current = false;
    if (editor) syncFromEditor();
    setMode('tokens');
  }, [cancelScheduledVisualSync, editor, mode, syncFromEditor]);

  const handleShowVisual = React.useCallback(() => {
    if (mode === 'visual') return;
    pendingVisualSyncRef.current = true;
    setMode('visual');
  }, [mode]);

  React.useEffect(() => {
    if (mode !== 'visual') {
      cancelScheduledVisualSync();
      return;
    }
    if (!pendingVisualSyncRef.current) return;
    scheduleVisualSync();
  }, [cancelScheduledVisualSync, editor, mode, scheduleVisualSync]);

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(mode === 'visual');
  }, [editor, mode]);

  React.useEffect(() => {
    return () => {
      cancelScheduledVisualSync();
    };
  }, [cancelScheduledVisualSync]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">InlineSelect Dev Tester</h1>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">Template editor</label>
          <span className="text-xs uppercase tracking-wide text-gray-500">
            {mode === 'tokens' ? 'Token view' : 'Visual view'}
          </span>
        </div>
        <div className="flex justify-end">
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
        <div className="relative">
          <div className={mode === 'tokens' ? 'block' : 'hidden'}>
            <TokenEditor ref={tokenEditorRef} value={template} onChange={setTemplate} />
          </div>
          <div className={`rounded border ${mode === 'visual' ? 'block' : 'hidden'}`}>
            <EditorContent editor={editor} className="min-h-[16rem] p-3" />
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 z-10">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={mode === 'tokens' ? handleShowVisual : handleShowTokens}
                    className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-gray-700 shadow transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={
                      mode === 'tokens' ? 'Switch to visual view' : 'Switch to token view'
                    }
                  >
                    {mode === 'tokens' ? <Type className="h-5 w-5" /> : <Code className="h-5 w-5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="end">
                  {mode === 'tokens' ? 'Switch to visual view' : 'Switch to token view'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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
