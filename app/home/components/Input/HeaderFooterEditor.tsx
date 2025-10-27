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

type RunningRegion = 'header' | 'footer';

interface HeaderFooterEditorProps {
  region: RunningRegion;
  value: string;
  onChange?: (html: string) => void;
  className?: string;
}

const DEFAULT_HEADER_HTML =
  '<div class="header-container"><table class="header-table" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;"><tbody><tr><td class="header-table__media"><div class="headerPrimary" data-running-role="header"><img class="headerImage" src="/cwbc_header.jpg" alt="Header image" style="max-width:100%;height:auto;display:block;" /></div></td><td class="header-table__details"><div class="headerAddress" data-running-role="address"><p class="text-xs text-gray-600">Unknown address</p><p class="text-xs text-gray-600">Reference</p><p class="text-xs text-gray-600">Date</p></div></td></tr></tbody></table></div>';

const DEFAULT_FOOTER_HTML =
  '<div class="footer-container"><div class="footerPrimary" data-running-role="footer"><img class="footerImage" src="/rics-purple-logo.jpg" alt="Footer image" style="max-width:200px;height:auto;" /></div></div>';

const canUseDOM = typeof window !== 'undefined' && typeof window.document !== 'undefined';

const sanitizeHtml = (html: string) => (typeof html === 'string' ? html.trim() : '');

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
    headerRegion.setAttribute('data-running-role', 'header');
    headerRegion.innerHTML = container.innerHTML || '<p>Header content</p>';
    container.innerHTML = '';
    container.appendChild(headerRegion);
  } else {
    if (!(headerRegion instanceof window.HTMLDivElement)) {
      const wrapper = window.document.createElement('div');
      wrapper.className = 'headerPrimary';
      wrapper.setAttribute('data-running-role', 'header');
      wrapper.innerHTML = headerRegion instanceof window.Element ? headerRegion.outerHTML : '';
      headerRegion.replaceWith(wrapper);
      headerRegion = wrapper;
    } else {
      headerRegion.classList.add('headerPrimary');
      headerRegion.setAttribute('data-running-role', 'header');
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

  // Ensure address running element
  let addressRegion =
    container.querySelector('[data-running-role="address"]') ??
    container.querySelector('.headerAddress');

  if (addressRegion) {
    addressRegion.classList.add('headerAddress');
    addressRegion.setAttribute('data-running-role', 'address');
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
    footerRegion.setAttribute('data-running-role', 'footer');
    footerRegion.innerHTML = container.innerHTML || '<p>Footer content</p>';
    container.innerHTML = '';
    container.appendChild(footerRegion);
  } else {
    footerRegion.classList.add('footerPrimary');
    footerRegion.setAttribute('data-running-role', 'footer');
  }

  const footerImg =
    footerRegion instanceof window.Element ? footerRegion.querySelector('img') : null;
  if (footerImg) {
    footerImg.classList.add('footerImage');
    if (!footerImg.getAttribute('alt')) {
      footerImg.setAttribute('alt', 'Footer image');
    }
  }

  return container.outerHTML;
};

const normaliseRunningHtml = (region: RunningRegion, raw: string) =>
  region === 'header' ? normaliseHeaderHtml(raw) : normaliseFooterHtml(raw);

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
  onInsertTemplate?: () => void;
}) => {
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
    ...(region === 'header'
      ? [
          {
            key: 'template',
            icon: <Grid2x2Plus className="h-4 w-4" />,
            title: 'Insert header grid',
            action: () => onInsertTemplate?.(),
          },
          {
            key: 'insert-table',
            icon: <Grid2x2Plus className="h-4 w-4 transform rotate-45" />,
            title: 'Insert table',
            action: () =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 1, cols: 2, withHeaderRow: false })
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
          'divider' as ToolbarEntry,
        ]
      : []),
    {
      key: 'insert-image',
      icon: <ImagePlus className="h-4 w-4" />,
      title: 'Insert image',
      action: onInsertImage,
    },
  ];

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
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastEmittedHtml = useRef<string>('');

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
        ...(region === 'header' ? [HandlebarsHighlight, HandlebarsAutocomplete] : []),
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

  const handleInsertHeaderLayout = useCallback(() => {
    if (!editor || region !== 'header') return;
    editor.chain().focus().setContent(DEFAULT_HEADER_HTML, false).run();
    const normalised = normaliseHeaderHtml(DEFAULT_HEADER_HTML);
    lastEmittedHtml.current = normalised;
    onChange?.(normalised);
  }, [editor, onChange, region]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          {region === 'header' ? 'Header content' : 'Footer content'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {region === 'header'
            ? 'Use tables or flex layouts to position logos on the left and text on the right.'
            : 'Add footer logos or text; content is rendered in the bottom margin of each page.'}
        </p>
      </div>
      {editor && (
        <HeaderFooterToolbar
          editor={editor}
          region={region}
          onInsertImage={triggerImageSelect}
          onInsertTemplate={region === 'header' ? handleInsertHeaderLayout : undefined}
        />
      )}
      <div className="rounded border border-border bg-white/80">
        <EditorContent editor={editor} className="max-h-[60vh] min-h-[180px] overflow-auto p-0" />
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

export default HeaderFooterEditor;
