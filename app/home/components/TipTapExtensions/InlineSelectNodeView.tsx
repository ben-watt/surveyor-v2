import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

/**
 * Minimal React NodeView for InlineSelect.
 * Renders an inline <select> and supports adding a custom value.
 * Attributes:
 *  - key: string (identifier)
 *  - options: string[]
 *  - allowCustom?: boolean (default true)
 *  - defaultValue?: string
 *  - value?: string (current selection, may be a custom entry)
 */
export function InlineSelectNodeViewComponent(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor } = props;
  const attrs = node.attrs as {
    key: string;
    options: string[];
    allowCustom?: boolean;
    defaultValue?: string;
    value?: string;
  };

  const { options, defaultValue } = attrs;

  const resolvedValue = attrs.value ?? defaultValue ?? '';
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (open && !customInputOpen) {
      // Focus and attempt to open the native select immediately
      const el = selectRef.current;
      if (el) {
        el.focus();
        try {
          // Attempt to trigger the picker; fallback to click
          if (typeof el.showPicker === 'function') el.showPicker();
          else el.click();
        } catch {
          // ignore
        }
      }
    }
  }, [open, customInputOpen]);

  const optionList = useMemo(() => {
    const base = Array.isArray(options) ? options : [];
    // Ensure default exists in list for easy selection (visual only)
    if (defaultValue && !base.includes(defaultValue)) {
      return [...base, defaultValue];
    }
    return base;
  }, [options, defaultValue]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === '__add_custom__') {
        setCustomInputOpen(true);
        // focus handled by input render
        return;
      }
      updateAttributes({ value: val });
      // Keep focus in editor
      editor?.commands.focus();
      setOpen(false);
    },
    [editor, updateAttributes],
  );

  const handleCustomConfirm = useCallback(() => {
    if (!customText.trim()) return setCustomInputOpen(false);
    updateAttributes({ value: customText.trim() });
    setCustomInputOpen(false);
    setCustomText('');
    editor?.commands.focus();
    setOpen(false);
  }, [customText, editor, updateAttributes]);

  const display = resolvedValue || '—';

  return (
    <NodeViewWrapper
      as="span"
      className={`inline-flex items-center gap-1 align-baseline ${selected ? 'rounded-sm ring-2 ring-blue-400' : ''}`}
      data-type="inline-select"
    >
      {!open ? (
        <button
          type="button"
          className={`rounded-sm border px-1 py-0.5 text-blue-700 ${resolvedValue ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen(true);
            }
          }}
          aria-expanded={open}
        >
          {display}
        </button>
      ) : (
        <>
          <select
            className="rounded-sm border border-gray-300 bg-white text-xs"
            value={optionList.includes(resolvedValue) ? resolvedValue : ''}
            onChange={handleChange}
            onBlur={() => setOpen(false)}
            autoFocus
            ref={selectRef}
          >
            <option value="" disabled>
              {resolvedValue ? 'Change…' : 'Select…'}
            </option>
            {optionList.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            {/* custom removed */}
          </select>
          {false && customInputOpen && (
            <span className="inline-flex items-center gap-1">
              <input
                autoFocus
                className="rounded-sm border border-gray-300 px-1 py-0.5 text-xs"
                placeholder="Enter custom"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomConfirm();
                  if (e.key === 'Escape') setCustomInputOpen(false);
                }}
              />
              <button
                type="button"
                className="rounded-sm border border-gray-300 px-1.5 py-0.5 text-xs"
                onClick={handleCustomConfirm}
              >
                OK
              </button>
            </span>
          )}
        </>
      )}
    </NodeViewWrapper>
  );
}

export const InlineSelectNodeView = ReactNodeViewRenderer(InlineSelectNodeViewComponent);
