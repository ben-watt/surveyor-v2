'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import FileHandler from '@tiptap-pro/extension-file-handler';
import S3ImageExtension from '../TipTapExtensions/S3ImageNodeView';
import { FontSize } from '../TipTapExtensions/FontSize';
import { LineHeight } from '../TipTapExtensions/LineHeight';
import { HandlebarsHighlight } from '../TipTapExtensions/HandlebarsHighlight';
import { HandlebarsAutocomplete } from '../TipTapExtensions/HandlebarsAutocomplete';
import { insertImageFromFile } from '@/app/home/editor/utils/imageUpload';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/core';
import MenuItem from './BlockMenuItem';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Grid2x2Plus,
  Grid2x2X,
  ImagePlus,
} from 'lucide-react';
import {
  DEFAULT_FOOTER_HTML,
  DEFAULT_HEADER_HTML,
  MARGIN_ZONE_METADATA,
  type MarginZone,
  type ZoneMetadata,
} from './marginZones';

type RunningRegion = MarginZone;

interface HeaderFooterEditorProps {
  region: RunningRegion;
  value: string;
  onChange?: (html: string) => void;
  className?: string;
  contentWidth?: number;
}

const canUseDOM = typeof window !== 'undefined' && typeof window.document !== 'undefined';

const sanitizeHtml = (html: string) => (typeof html === 'string' ? html.trim() : '');

const ensureRunningAttributes = (element: Element | null | undefined, meta: ZoneMetadata) => {
  if (!element) return;
  if (!(element instanceof Element)) return;
  const target = element as HTMLElement;
  target.setAttribute('data-running-role', meta.dataRole);
  target.setAttribute('id', meta.runningName);
  const existingStyle = target.getAttribute('style') || '';
  const styleParts = existingStyle
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^position:\s*running\(/i.test(part));
  styleParts.push(`position: running(${meta.runningName})`);
  target.setAttribute('style', styleParts.join('; '));
};

const buildZoneWrapper = (meta: ZoneMetadata, innerHtml: string) =>
  `<div id="${meta.runningName}" data-running-role="${meta.dataRole}" style="position: running(${meta.runningName});">${innerHtml}</div>`;

const normaliseHeaderHtml = (raw: string) => {
  if (!canUseDOM) {
    const content = sanitizeHtml(raw) || DEFAULT_HEADER_HTML;
    return content.startsWith('<div class="header-container">')
      ? content
      : `<div class="header-container">${content}</div>`;
  }

  const template = window.document.createElement('template');
  template.innerHTML = sanitizeHtml(raw) || DEFAULT_HEADER_HTML;

  let container = template.content.querySelector('.header-container');
  if (!container) {
    container = window.document.createElement('div');
    container.className = 'header-container';
    container.innerHTML = template.innerHTML;
  }

  // Ensure table helper class
  const table = container.querySelector('table');
  if (table) {
    table.classList.add('header-table');
    table.setAttribute('role', 'presentation');
    table.setAttribute('cellpadding', '0');
    table.setAttribute('cellspacing', '0');
    const existingStyle = table.getAttribute('style') || '';
    const styleParts = existingStyle
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean);
    if (!styleParts.some((part) => part.startsWith('border-collapse'))) {
      styleParts.push('border-collapse:collapse');
    }
    if (!styleParts.some((part) => part.startsWith('width'))) {
      styleParts.push('width:100%');
    }
    table.setAttribute('style', styleParts.join('; '));
  }

  // Ensure header running element
  let headerRegion =
    container.querySelector('[data-running-role="header"]') ??
    container.querySelector('.headerPrimary') ??
    container.querySelector('img');

  if (!headerRegion) {
    headerRegion = window.document.createElement('div');
    headerRegion.className = 'headerPrimary';
    headerRegion.innerHTML = container.innerHTML || '<p>Header content</p>';
    container.innerHTML = '';
    container.appendChild(headerRegion);
  } else {
    if (!(headerRegion instanceof window.HTMLDivElement)) {
      const wrapper = window.document.createElement('div');
      wrapper.className = 'headerPrimary';
      wrapper.innerHTML = headerRegion instanceof window.Element ? headerRegion.outerHTML : '';
      headerRegion.replaceWith(wrapper);
      headerRegion = wrapper;
    } else {
      headerRegion.classList.add('headerPrimary');
    }
  }

  const headerImg =
    headerRegion instanceof window.Element
      ? headerRegion.querySelector('img') ?? container.querySelector('img')
      : null;

  if (headerImg) {
    headerImg.classList.add('headerImage');
    if (!headerImg.getAttribute('alt')) {
      headerImg.setAttribute('alt', 'Header image');
    }
  }

  ensureRunningAttributes(headerRegion ?? undefined, MARGIN_ZONE_METADATA.topCenter);

  // Ensure address running element
  let addressRegion =
    container.querySelector('[data-running-role="address"]') ??
    container.querySelector('.headerAddress');

  if (addressRegion) {
    addressRegion.classList.add('headerAddress');
    ensureRunningAttributes(addressRegion ?? undefined, MARGIN_ZONE_METADATA.topRight);
  }

  return container.outerHTML;
};

const normaliseFooterHtml = (raw: string) => {
  if (!canUseDOM) {
    const content = sanitizeHtml(raw) || DEFAULT_FOOTER_HTML;
    return content.startsWith('<div class="footer-container">')
      ? content
      : `<div class="footer-container">${content}</div>`;
  }

  const template = window.document.createElement('template');
  template.innerHTML = sanitizeHtml(raw) || DEFAULT_FOOTER_HTML;

  let container = template.content.querySelector('.footer-container');
  if (!container) {
    container = window.document.createElement('div');
    container.className = 'footer-container';
    container.innerHTML = template.innerHTML;
  }

  let footerRegion =
    container.querySelector('[data-running-role="footer"]') ??
    container.querySelector('.footerPrimary');

  if (!footerRegion) {
    footerRegion = window.document.createElement('div');
    footerRegion.className = 'footerPrimary';
    footerRegion.innerHTML = container.innerHTML || '<p>Footer content</p>';
    container.innerHTML = '';
    container.appendChild(footerRegion);
  } else {
    footerRegion.classList.add('footerPrimary');
  }

  const footerImg =
    footerRegion instanceof window.Element ? footerRegion.querySelector('img') : null;
  if (footerImg) {
    footerImg.classList.add('footerImage');
    if (!footerImg.getAttribute('alt')) {
      footerImg.setAttribute('alt', 'Footer image');
    }
  }

  ensureRunningAttributes(footerRegion ?? undefined, MARGIN_ZONE_METADATA.bottomCenter);

  return container.outerHTML;
};

const ensureWrappedWithRunningElement = (zone: MarginZone, raw: string) => {
  const meta = MARGIN_ZONE_METADATA[zone];
  const fallback = sanitizeHtml(meta.defaultHtml) ?? '';

  if (!canUseDOM) {
    const content = sanitizeHtml(raw) || fallback || '';
    if (
      content.includes(`id="${meta.runningName}"`) &&
      content.includes('position: running')
    ) {
      return content;
    }
    return buildZoneWrapper(meta, content);
  }

  const template = window.document.createElement('template');
  const sanitized = sanitizeHtml(raw);
  template.innerHTML = sanitized || fallback || '';

  const candidate =
    (template.content.querySelector(`#${meta.runningName}`) ??
      template.content.querySelector(`[data-running-role="${meta.dataRole}"]`)) as
      | HTMLElement
      | null;

  if (candidate) {
    ensureRunningAttributes(candidate, meta);
    return candidate.outerHTML;
  }

  const wrapper = window.document.createElement('div');
  wrapper.innerHTML = sanitized || fallback || '';
  ensureRunningAttributes(wrapper, meta);
  return wrapper.outerHTML;
};

const normaliseRunningHtml = (region: RunningRegion, raw: string) => {
  if (region === 'topCenter') return normaliseHeaderHtml(raw);
  if (region === 'bottomCenter') return normaliseFooterHtml(raw);
  return ensureWrappedWithRunningElement(region, raw);
};

const Divider = () => <span className="mx-1 h-5 w-px bg-border" />;

type ToolbarItem = {
  key: string;
  icon: React.ReactElement;
  title: string;
  action: () => void | boolean;
  isActive?: () => boolean;
};

type ToolbarEntry = ToolbarItem | 'divider';

const HeaderFooterToolbar = ({
  editor,
  region,
  onInsertImage,
  onInsertTemplate,
}: {
  editor: Editor;
  region: RunningRegion;
  onInsertImage: () => void;
  onInsertTemplate: () => void;
}) => {
  const meta = MARGIN_ZONE_METADATA[region];
  const items: ToolbarEntry[] = [
    {
      key: 'bold',
      icon: <Bold className="h-4 w-4" />,
      title: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      key: 'italic',
      icon: <Italic className="h-4 w-4" />,
      title: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    'divider',
    {
      key: 'bullet',
      icon: <List className="h-4 w-4" />,
      title: 'Bullet list',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      key: 'ordered',
      icon: <ListOrdered className="h-4 w-4" />,
      title: 'Numbered list',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    'divider',
    {
      key: 'align-left',
      icon: <AlignLeft className="h-4 w-4" />,
      title: 'Align left',
      action: () => editor.chain().focus().setTextAlign('left').run(),
      isActive: () => editor.isActive({ textAlign: 'left' }),
    },
    {
      key: 'align-center',
      icon: <AlignCenter className="h-4 w-4" />,
      title: 'Align center',
      action: () => editor.chain().focus().setTextAlign('center').run(),
      isActive: () => editor.isActive({ textAlign: 'center' }),
    },
    {
      key: 'align-right',
      icon: <AlignRight className="h-4 w-4" />,
      title: 'Align right',
      action: () => editor.chain().focus().setTextAlign('right').run(),
      isActive: () => editor.isActive({ textAlign: 'right' }),
    },
    'divider',
  ];

  if (meta.showTemplateButton) {
    items.push({
      key: 'template',
      icon: <Grid2x2Plus className="h-4 w-4" />,
      title: 'Insert layout',
      action: onInsertTemplate,
    });
  }

  items.push(
    {
      key: 'insert-table',
      icon: <Grid2x2Plus className="h-4 w-4 transform rotate-45" />,
      title: 'Insert table',
      action: () =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 1, cols: region === 'topCenter' ? 2 : 1, withHeaderRow: false })
          .run(),
      isActive: () => editor.isActive('table'),
    },
    {
      key: 'remove-table',
      icon: <Grid2x2X className="h-4 w-4" />,
      title: 'Remove table',
      action: () => {
        if (editor.can().deleteTable()) {
          editor.chain().focus().deleteTable().run();
        }
        return false;
      },
    },
    'divider',
    {
      key: 'insert-image',
      icon: <ImagePlus className="h-4 w-4" />,
      title: 'Insert image',
      action: onInsertImage,
    },
  );

  return (
    <div className="flex flex-wrap items-center gap-1 rounded border border-border bg-white/95 px-2 py-1 shadow-sm">
      {items.map((item, index) =>
        item === 'divider' ? (
          <Divider key={`divider-${index}`} />
        ) : (
          <MenuItem
            key={item.key}
            icon={item.icon}
            title={item.title}
            action={item.action}
            isActive={item.isActive}
          />
        ),
      )}
    </div>
  );
};

const HeaderFooterEditor: React.FC<HeaderFooterEditorProps> = ({
  region,
  value,
  onChange,
  className,
  contentWidth,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastEmittedHtml = useRef<string>('');
  const zoneMeta = MARGIN_ZONE_METADATA[region];

  const initialContent = useMemo(() => normaliseRunningHtml(region, value), [region, value]);

  const editor = useEditor(
    {
      extensions: [
        FileHandler.configure({
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
          onDrop: async (currentEditor, files, pos) => {
            for (const file of files) {
              if (!file.type.startsWith('image/')) continue;
              await insertImageFromFile(currentEditor, file, pos);
            }
          },
          onPaste: async (currentEditor, files) => {
            for (const file of files) {
              if (!file.type.startsWith('image/')) continue;
              await insertImageFromFile(
                currentEditor,
                file,
                currentEditor.state.selection.anchor,
              );
            }
          },
        }),
        Color.configure({ types: [TextStyle.name] }),
        TextAlign.configure({
          types: ['paragraph', 'heading'],
        }),
        TextStyle,
        FontSize,
        LineHeight,
        Highlight.configure({
          multicolor: true,
        }),
        S3ImageExtension,
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        StarterKit.configure({
          heading: {
            levels: [2, 3, 4],
          },
        }),
        ...(zoneMeta.allowHandlebars ? [HandlebarsHighlight, HandlebarsAutocomplete] : []),
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class:
            'tiptap running-region-editor prose prose-sm max-w-none focus:outline-none focus-visible:ring-0',
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        const html = currentEditor.getHTML();
        const normalised = normaliseRunningHtml(region, html);
        if (normalised !== lastEmittedHtml.current) {
          lastEmittedHtml.current = normalised;
          onChange?.(normalised);
        }
      },
    },
    [region],
  );

  useEffect(() => {
    if (!editor) return;
    const next = normaliseRunningHtml(region, value);
    if (next !== lastEmittedHtml.current) {
      lastEmittedHtml.current = next;
      const currentHtml = editor.getHTML();
      if (currentHtml !== next) {
        editor.commands.setContent(next, false);
      }
    }
    if (!sanitizeHtml(value) && next !== value) {
      onChange?.(next);
    }
  }, [editor, region, value, onChange]);

  const triggerImageSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!editor) return;
      const files = event.target.files;
      if (!files || files.length === 0) return;
      for (const file of files) {
        await insertImageFromFile(editor, file);
      }
      event.target.value = '';
    },
    [editor],
  );

  const handleInsertTemplate = useCallback(() => {
    if (!editor) return;
    if (!zoneMeta.showTemplateButton) return;
    const templateHtml = zoneMeta.defaultHtml || '';
    const normalised = normaliseRunningHtml(region, templateHtml);
    editor.chain().focus().setContent(normalised, false).run();
    lastEmittedHtml.current = normalised;
    onChange?.(normalised);
  }, [editor, onChange, region, zoneMeta]);

  const widthStyle = contentWidth ? { width: `${contentWidth}px` } : undefined;

  return (
    <div className={cn('space-y-3', className)} style={widthStyle}>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          {zoneMeta.label}
        </h3>
        <p className="text-xs text-muted-foreground">{zoneMeta.description}</p>
      </div>
      {editor && (
        <HeaderFooterToolbar
          editor={editor}
          region={region}
          onInsertImage={triggerImageSelect}
          onInsertTemplate={handleInsertTemplate}
        />
      )}
      <div className="box-border rounded border border-border bg-white/80" style={widthStyle}>
        <EditorContent
          editor={editor}
          className="max-h-[60vh] min-h-[180px] w-full overflow-auto p-0"
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFiles}
      />
    </div>
  );
};

export { normaliseRunningHtml as normalizeRunningHtmlForZone };
export { MARGIN_ZONE_METADATA, type ZoneMetadata } from './marginZones';
export default HeaderFooterEditor;
