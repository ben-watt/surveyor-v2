import { type Editor } from '@tiptap/react';

import { useEffect, useState } from 'react';

import MenuItem, { MenuItemProps } from './BlockMenuItem';
import {
  Bold,
  Code,
  Code2,
  Italic,
  List,
  ListOrdered,
  SeparatorHorizontal,
  Strikethrough,
  TextQuote,
  RemoveFormatting,
  WrapText,
  Redo,
  Undo,
  Printer,
  Plus,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Grid2x2Plus,
  Grid2x2X,
  BetweenHorizontalStart,
  BetweenVerticalStart,
  TableCellsMergeIcon,
  TableCellsSplitIcon,
  ImagePlus,
  Save,
  History,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Level } from '@tiptap/extension-heading';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@uidotdev/usehooks';
import { insertImageFromFile } from '../../editor/utils/imageUpload';

interface MenuBarProps {
  editor: Editor | null;
  onPrint: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'autosaved';
  onOpenVersionHistory?: () => void;
}

const Divider = () => <span className="m-auto h-[1.5rem] bg-gray-300 pl-[1px]" />;

export default function MenuBar({
  editor,
  onPrint,
  onSave,
  isSaving,
  saveStatus,
  onOpenVersionHistory,
}: MenuBarProps) {
  if (!editor) return null;

  const setImageAlignIfImageSelected = (align: 'left' | 'center' | 'right' | 'justify') => {
    const { state } = editor;
    const { selection } = state;
    const node = state.doc.nodeAt(selection.from);
    if (node && node.type.name === 'image') {
      editor.chain().focus().updateAttributes('image', { align }).run();
      return true;
    }
    return false;
  };

  const items = [
    {
      icon: <Bold />,
      title: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      icon: <Italic />,
      title: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      icon: <Strikethrough />,
      title: 'Strike',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
    },
    {
      icon: <Code />,
      title: 'Code',
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive('code'),
    },
    {
      type: 'highlight',
      render: () => <HighlightColorPicker editor={editor} />,
    },
    {
      icon: <RemoveFormatting />,
      title: 'Clear Format',
      action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
    },
    {
      type: 'divider',
      render: () => <Divider />,
    },
    {
      icon: <AlignLeft />,
      title: 'Align Left',
      action: () => {
        if (!setImageAlignIfImageSelected('left')) {
          editor.chain().focus().setTextAlign('left').run();
        }
      },
      isActive: () =>
        editor.isActive({ textAlign: 'left' }) || editor.isActive('image', { align: 'left' }),
    },
    {
      icon: <AlignCenter />,
      title: 'Align Center',
      action: () => {
        if (!setImageAlignIfImageSelected('center')) {
          editor.chain().focus().setTextAlign('center').run();
        }
      },
      isActive: () =>
        editor.isActive({ textAlign: 'center' }) || editor.isActive('image', { align: 'center' }),
    },
    {
      icon: <AlignRight />,
      title: 'Align Right',
      action: () => {
        if (!setImageAlignIfImageSelected('right')) {
          editor.chain().focus().setTextAlign('right').run();
        }
      },
      isActive: () =>
        editor.isActive({ textAlign: 'right' }) || editor.isActive('image', { align: 'right' }),
    },
    {
      icon: <AlignJustify />,
      title: 'Align Justify',
      action: () => {
        if (!setImageAlignIfImageSelected('justify')) {
          editor.chain().focus().setTextAlign('justify').run();
        }
      },
      isActive: () =>
        editor.isActive({ textAlign: 'justify' }) || editor.isActive('image', { align: 'justify' }),
    },
    {
      type: 'divider',
      render: () => <Divider />,
    },
    {
      type: 'dropdown',
      render: () => <MenuHeadingDropdown editor={editor} />,
    },
    {
      type: 'font-size',
      render: () => <MenuFontSize editor={editor} />,
    },
    {
      type: 'divider',
      render: () => <Divider />,
    },
    {
      icon: <List />,
      title: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      icon: <ListOrdered />,
      title: 'Ordered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      icon: <Grid2x2Plus />,
      title: 'Add Table',
      action: () => editor.chain().focus().insertTable({ rows: 2, cols: 2 }).run(),
      isActive: () => false,
    },
    {
      icon: <ImagePlus />,
      title: 'Add Image',
      action: async () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && editor) {
            await insertImageFromFile(editor, file);
          }
        };
        fileInput.click();
      },
    },
    {
      type: 'divider',
      render: () => <Divider />,
    },
    {
      icon: <TextQuote />,
      title: 'Blockquote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      icon: <Code2 />,
      title: 'Code Block',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
    {
      type: 'divider',
      render: () => <Divider />,
    },
    {
      icon: <SeparatorHorizontal />,
      title: 'Page Break',
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: <WrapText />,
      title: 'Hard Break',
      action: () => editor.chain().focus().setHardBreak().run(),
    },
    {
      type: 'divider',
      render: () => <Divider />,
    },
    {
      icon: <Undo />,
      title: 'Undo',
      action: () => editor.chain().focus().undo().run(),
    },
    {
      icon: <Redo />,
      title: 'Redo',
      action: () => editor.chain().focus().redo().run(),
    },
    {
      type: 'divider',
      render: () => <Divider />,
    },
    {
      icon: <History />,
      title: 'Version History',
      action: () => onOpenVersionHistory && onOpenVersionHistory(),
    },
    {
      icon: isSaving ? (
        <span className="mr-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
      ) : (
        <Save />
      ),
      title: 'Save',
      action: () => onSave(),
      disabled: isSaving,
    },
    {
      icon: <Printer />,
      title: 'Print',
      action: async () => {
        onPrint();
      },
    },
  ];

  const tableContextMenu = {
    isActive: () => editor.isActive('table'),
    items: [
      {
        icon: <BetweenHorizontalStart />,
        title: 'Add Row After',
        action: () => editor.chain().focus().addRowAfter().run(),
      },
      {
        icon: <BetweenVerticalStart />,
        title: 'Add Column After',
        action: () => editor.chain().focus().addColumnAfter().run(),
      },
      {
        icon: <TableCellsSplitIcon />,
        title: 'Split Cell',
        action: () => editor.chain().focus().splitCell().run(),
      },
      {
        icon: <TableCellsMergeIcon />,
        title: 'Merge Cells',
        action: () => editor.chain().focus().mergeCells().run(),
      },
      {
        icon: <Grid2x2X className="text-red-700" />,
        title: 'Delete Table',
        action: () => editor.chain().focus().deleteTable().run(),
        isActive: () => false,
      },
      {
        icon: <BetweenHorizontalStart className="text-red-700" />,
        title: 'Delete Row',
        action: () => editor.chain().focus().deleteRow().run(),
      },
      {
        icon: <BetweenVerticalStart className="text-red-700" />,
        title: 'Delete Column',
        action: () => editor.chain().focus().deleteColumn().run(),
      },
    ],
  };

  return (
    <div className="editor__header sticky top-0 z-[100] border-b border-l bg-white p-2">
      <div className="flex-shrink-1 no-scrollbar flex items-center justify-between">
        <div className="flex">
          {items.map((item, index) => (
            <div key={index} className="m-[1px] flex">
              {item.render ? item.render() : <MenuItem {...(item as MenuItemProps)} />}
            </div>
          ))}
        </div>
        <div className="ml-4 flex h-6 min-w-[120px] items-center justify-end text-right text-xs text-gray-500">
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'All changes saved'}
          {saveStatus === 'autosaved' && 'Auto-saved'}
          {saveStatus === 'error' && <span className="text-red-500">Save failed</span>}
        </div>
      </div>
      {tableContextMenu.isActive() && (
        <div className="justify-left flex">
          {tableContextMenu.items.map((item, index) => (
            <div key={index} className="m-[1px] flex">
              <MenuItem {...(item as MenuItemProps)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MenuHeadingDropdownProps {
  editor: Editor;
}

const MenuHeadingDropdown = ({ editor }: MenuHeadingDropdownProps) => {
  const [stateLevel, setStateLevel] = useState<number>(0);

  const toggleHeading = (level: string) => {
    const l = parseInt(level);
    if (l === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor
        .chain()
        .focus()
        .toggleHeading({ level: l as Level })
        .run();
    }

    setStateLevel(l);
  };

  // When the user selects a heading then update the value in the dropdown
  useEffect(() => {
    editor.on('selectionUpdate', () => {
      if (editor.isActive('heading')) {
        const level = editor.getAttributes('heading').level as number;
        setStateLevel(level);
      } else {
        setStateLevel(0);
      }
    });
  }, [editor]);

  return (
    <div className="ml-2 mr-2">
      <Select value={stateLevel.toString()} onValueChange={(val) => toggleHeading(val)}>
        <SelectTrigger className="w-[8rem]">
          <SelectValue placeholder="Paragraph" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Text Style</SelectLabel>
            <SelectItem value="0">Paragraph</SelectItem>
            <SelectItem value="1">H1</SelectItem>
            <SelectItem value="2">H2</SelectItem>
            <SelectItem value="3">H3</SelectItem>
            <SelectItem value="4">H4</SelectItem>
            <SelectItem value="5">H5</SelectItem>
            <SelectItem value="6">H6</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

interface MenuFontSizeProps {
  editor: Editor;
}

const MenuFontSize = ({ editor }: MenuFontSizeProps) => {
  const DEFAULT_FONT_SIZE = 12;
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const MIN_FONT_SIZE = 6;
  const MAX_FONT_SIZE = 97;
  const fontSizeDropdown = [6, 10, 12, 14, 20, 26, 34, 97];

  useEffect(() => {
    editor.on('selectionUpdate', () => {
      const setFromNode = (nodeType: string) => {
        const fontSize = editor.getAttributes(nodeType).fontSize as string;
        const size = parseInt(fontSize.replace('pt', ''));
        if (size) {
          setFontSize(size);
        } else {
          setFontSize(DEFAULT_FONT_SIZE);
        }
      };

      if (editor.isActive('heading')) {
        setFromNode('heading');
      }

      if (editor.isActive('paragraph')) {
        setFromNode('paragraph');
      }

      if (editor.isActive('textStyle')) {
        setFromNode('textStyle');
      }
    });
  });

  const reduceFontSize = () => {
    if (fontSize > MIN_FONT_SIZE) {
      const newSize = fontSize - 1;
      editor.chain().focus().setFontSize(`${newSize}pt`).run();
      setFontSize(newSize);
    }
  };

  const increaseFontSize = () => {
    if (fontSize < MAX_FONT_SIZE) {
      const newSize = fontSize + 1;
      editor.chain().focus().setFontSize(`${newSize}pt`).run();
      setFontSize(newSize);
    }
  };

  const changeFontSize = (size: string) => {
    const newSize = parseInt(size);
    editor.chain().focus().setFontSize(`${newSize}pt`).run();
    setFontSize(newSize);
  };

  return (
    <div className="flex items-center">
      <button className="p-1">
        <Minus onClick={() => reduceFontSize()} />
      </button>
      <div className="ml-1 mr-1">
        <Select value={fontSize.toString()} onValueChange={(v) => changeFontSize(v)}>
          <SelectTrigger className="[&_svg]:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-11">
            <SelectGroup>
              {Array.from(new Set(fontSizeDropdown.concat(fontSize))).map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <button className="p-1">
        <Plus onClick={() => increaseFontSize()} />
      </button>
    </div>
  );
};

const HighlightColorPicker = ({ editor }: { editor: Editor }) => {
  const [selectedColour, setSelectedColour] = useLocalStorage<string>(
    'HighlightColourPicker_selectedColour',
    '#ff0000',
  );
  const [colourPickerOpen, setColourPickerOpen] = useState<boolean>(false);
  const colours = [
    { name: 'Red', value: '#ff0000' },
    { name: 'Yellow', value: '#ffff00' },
    { name: 'Light Green', value: '#90ee90' },
    { name: 'Dark Green', value: '#008000' },
    { name: 'Blue', value: '#0000ff' },
    { name: 'Pink', value: '#ffc0cb' },
    { name: 'Orange', value: '#ffa500' },
  ];

  const toggleHighlight = (colour: string) => {
    setSelectedColour(colour);
    editor.chain().focus().toggleHighlight({ color: colour }).run();
    setColourPickerOpen(false);
  };

  const handleIconClick = () => {
    if (!editor.state.selection.empty) {
      editor.chain().focus().toggleHighlight({ color: selectedColour }).run();
    } else {
      setColourPickerOpen(true);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleIconClick()}
        style={{ borderColor: selectedColour }}
        className={cn('h-full w-8 p-0', editor.isActive('highlight') && 'bg-muted')}
      >
        <HighlighterSvg nibColour={selectedColour} />
      </Button>
      {colourPickerOpen && (
        <div className="absolute left-0 top-0 grid grid-rows-1 gap-2 rounded-md border bg-white p-2">
          {colours.map((colour) => (
            <button
              key={colour.value}
              className={cn(
                'h-6 w-6 rounded-full border border-border',
                selectedColour === colour.value &&
                  'ring-2 ring-ring ring-offset-2 ring-offset-background',
              )}
              style={{ backgroundColor: colour.value }}
              onClick={() => toggleHighlight(colour.value)}
              title={colour.name}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HighlighterSvg = ({ nibColour }: { nibColour: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-highlighter-icon lucide-highlighter"
    >
      <path style={{ fill: nibColour }} d="m9 11-6 6v3h9l3-3" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </svg>
  );
};
