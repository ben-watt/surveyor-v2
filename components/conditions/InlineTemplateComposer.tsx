'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import InlineSelect from '@/app/home/components/TipTapExtensions/InlineSelect';
import { tokensToDoc, docToTokens } from '@/lib/conditions/interop';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Code, Type } from 'lucide-react';
import TokenEditor, { type TokenEditorHandle } from './TokenEditor';

export type InlineTemplateComposerMode = 'tokens' | 'visual';

export type InlineTemplateComposerAction = {
  label: string;
  icon: React.ReactNode;
  onSelect: (api: InlineTemplateComposerHandle) => void;
};

export type InlineTemplateComposerHandle = {
  getMode: () => InlineTemplateComposerMode;
  setMode: (mode: InlineTemplateComposerMode) => void;
  insertTokenText: (text: string) => void;
  insertSampleToken: () => void;
  insertInlineSelect: (config: { key: string; options: string[]; allowCustom?: boolean }) => void;
  getEditor: () => Editor | null;
};

type InlineTemplateComposerProps = {
  value: string;
  onChange: (value: string) => void;
  defaultMode?: InlineTemplateComposerMode;
  onModeChange?: (mode: InlineTemplateComposerMode) => void;
  tokenModeActions?: InlineTemplateComposerAction[];
  visualModeActions?: InlineTemplateComposerAction[];
  className?: string;
  label?: string;
  readOnly?: boolean;
  onDocChange?: (doc: JSONContent) => void;
  onParseError?: (error: unknown) => void;
  /**
   * When true, renders only the visual view, hides the mode switch and actions,
   * and forces read-only editor behavior regardless of `readOnly`.
   */
  viewOnly?: boolean;
  /**
   * Optional: provide a starting TipTap doc to load (preserves selections).
   * If provided, it is used as the initial editor content instead of parsing tokens.
   */
  initialDoc?: JSONContent;
};

const InlineTemplateComposer = forwardRef<
  InlineTemplateComposerHandle,
  InlineTemplateComposerProps
>(function InlineTemplateComposer(
  {
    value,
    onChange,
    defaultMode = 'tokens',
    onModeChange,
    tokenModeActions,
    visualModeActions,
    className,
    label,
    readOnly = false,
    onDocChange,
    onParseError,
    viewOnly = false,
    initialDoc,
  },
  ref,
) {
  const labelText = label ?? 'Condition text';
  const labelId = useId();
  const [mode, setMode] = useState<InlineTemplateComposerMode>(viewOnly ? 'visual' : defaultMode);
  const tokenEditorRef = useRef<TokenEditorHandle>(null);
  const pendingVisualSyncRef = useRef(false);
  const visualSyncRafRef = useRef<number | null>(null);
  const modeRef = useRef(mode);
  const onChangeRef = useRef(onChange);
  const onDocChangeRef = useRef(onDocChange);
  const editorInstanceRef = useRef<Editor | null>(null);

  useEffect(() => {
    modeRef.current = mode;
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onDocChangeRef.current = onDocChange;
  }, [onDocChange]);

  const handleParseError = useCallback(
    (error: unknown) => {
      if (onParseError) {
        onParseError(error);
      } else {
        console.error(error);
      }
    },
    [onParseError],
  );

  const editor = useEditor({
    extensions: [StarterKit, InlineSelect],
    content: (initialDoc ?? (tokensToDoc(value) as any)) as any,
    onUpdate: ({ editor }) => {
      if (modeRef.current !== 'visual') return;
      const doc = editor.getJSON();
      onDocChangeRef.current?.(doc as JSONContent);
      const tokens = docToTokens(doc as any);
      onChangeRef.current(tokens);
    },
  });

  useEffect(() => {
    editorInstanceRef.current = editor ?? null;
  }, [editor]);

  const cancelScheduledVisualSync = useCallback(() => {
    if (visualSyncRafRef.current !== null) {
      cancelAnimationFrame(visualSyncRafRef.current);
      visualSyncRafRef.current = null;
    }
  }, []);

  const loadIntoEditor = useCallback(() => {
    if (!editorInstanceRef.current) return;
    try {
      const doc = tokensToDoc(value);
      editorInstanceRef.current
        .chain()
        .setContent(doc as any, false)
        .focus()
        .run();
    } catch (e) {
      handleParseError(e);
    }
  }, [handleParseError, value]);

  const syncFromEditor = useCallback(() => {
    if (!editorInstanceRef.current) return;
    const doc = editorInstanceRef.current.getJSON();
    onDocChangeRef.current?.(doc as JSONContent);
    try {
      const tokens = docToTokens(doc as any);
      onChangeRef.current(tokens);
    } catch (e) {
      handleParseError(e);
    }
  }, [handleParseError]);

  const scheduleVisualSync = useCallback(() => {
    if (modeRef.current !== 'visual') return;
    if (!editorInstanceRef.current) {
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
  }, [cancelScheduledVisualSync, loadIntoEditor]);

  const handleShowTokens = useCallback(() => {
    if (viewOnly) return; // disallow switching in view-only
    if (modeRef.current === 'tokens') return;
    cancelScheduledVisualSync();
    pendingVisualSyncRef.current = false;
    syncFromEditor();
    setMode('tokens');
  }, [cancelScheduledVisualSync, syncFromEditor, viewOnly]);

  const handleShowVisual = useCallback(() => {
    if (modeRef.current === 'visual') return;
    pendingVisualSyncRef.current = true;
    setMode('visual');
  }, []);

  const handleApi = useMemo<InlineTemplateComposerHandle>(
    () => ({
      getMode: () => modeRef.current,
      setMode: (nextMode) => {
        if (viewOnly) return;
        if (nextMode === 'visual') {
          handleShowVisual();
        } else {
          handleShowTokens();
        }
      },
      insertTokenText: (text: string) => {
        tokenEditorRef.current?.insertText(text);
      },
      insertSampleToken: () => {
        tokenEditorRef.current?.insertSampleSelect();
      },
      insertInlineSelect: ({ key, options, allowCustom = true }) => {
        if (readOnly) return;
        const tiptap = editorInstanceRef.current;
        if (!tiptap) return;
        tiptap.commands.insertInlineSelect({ key, options, allowCustom });
        tiptap.commands.focus?.();
      },
      getEditor: () => editorInstanceRef.current,
    }),
    [handleShowTokens, handleShowVisual, readOnly, viewOnly],
  );

  useEffect(() => {
    if (mode !== 'visual') {
      cancelScheduledVisualSync();
      return;
    }
    if (!pendingVisualSyncRef.current) return;
    scheduleVisualSync();
  }, [cancelScheduledVisualSync, mode, scheduleVisualSync]);

  useEffect(() => {
    if (!editorInstanceRef.current) return;
    editorInstanceRef.current.setEditable(mode === 'visual' && !readOnly);
  }, [mode, readOnly]);

  useEffect(() => {
    return () => {
      cancelScheduledVisualSync();
    };
  }, [cancelScheduledVisualSync]);

  useImperativeHandle(ref, () => handleApi, [handleApi]);

  const activeActions = useMemo(() => {
    if (viewOnly) return [];
    if (mode === 'tokens') return tokenModeActions ?? [];
    if (mode === 'visual') return visualModeActions ?? [];
    return [];
  }, [mode, tokenModeActions, visualModeActions, viewOnly]);

  return (
    <div className={className}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span id={labelId} className="block text-sm font-medium">
            {labelText}
          </span>
          {!viewOnly && (
            <span className="text-xs uppercase tracking-wide text-gray-500">
              {mode === 'tokens' ? 'Token view' : 'Visual view'}
            </span>
          )}
        </div>
        <div className="relative">
          <div className={mode === 'tokens' && !viewOnly ? 'block' : 'hidden'}>
            <TokenEditor
              ref={tokenEditorRef}
              value={value}
              onChange={onChange}
              ariaLabel={labelText}
              ariaLabelledBy={labelId}
              readOnly={readOnly}
            />
          </div>
          <div className={`rounded border ${mode === 'visual' ? 'block' : 'hidden'}`}>
            <EditorContent
              editor={editor}
              className="min-h-[10rem]"
              aria-label={labelText}
              aria-labelledby={labelId}
              aria-readonly={readOnly || viewOnly}
            />
          </div>
          {!viewOnly && (
            <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2">
              {!readOnly && activeActions.length
                ? activeActions.map((action, index) => (
                    <TooltipProvider delayDuration={100} key={`${mode}-action-${index}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => action.onSelect(handleApi)}
                            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-gray-700 shadow transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label={action.label}
                          >
                            {action.icon}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="end">
                          {action.label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))
                : null}
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
                      {mode === 'tokens' ? (
                        <Type className="h-5 w-5" />
                      ) : (
                        <Code className="h-5 w-5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="end">
                    {mode === 'tokens' ? 'Switch to visual view' : 'Switch to token view'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default InlineTemplateComposer;
