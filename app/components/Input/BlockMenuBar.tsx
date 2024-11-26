import { type Editor } from "@tiptap/react";

import { Fragment, useEffect, useState } from "react";

import MenuItem, { MenuItemProps } from "./BlockMenuItem";
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
  Text,
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
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Level } from "@tiptap/extension-heading";
import { Input } from "@/components/ui/input";

interface MenuBarProps {
  editor: Editor | null;
  onPrint: () => void;
}

const Divider = () => (
  <span className="m-auto h-[1.5rem] bg-gray-300 pl-[1px]" />
);

export default function MenuBar({ editor, onPrint }: MenuBarProps) {
  if (!editor) return null;

  const items = [
    {
      icon: <Bold />,
      title: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive("bold"),
    },
    {
      icon: <Italic />,
      title: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive("italic"),
    },
    {
      icon: <Strikethrough />,
      title: "Strike",
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive("strike"),
    },
    {
      icon: <Code />,
      title: "Code",
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive("code"),
    },
    {
      icon: <RemoveFormatting />,
      title: "Clear Format",
      action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
    },
    {
      type: "divider",
      render: () => <Divider />,
    },
    {
      icon: <AlignLeft />,
      title: "Align Left",
      action: () => editor.chain().focus().setTextAlign("left").run(),
      isActive: () => editor.isActive({ textAlign: 'left' }),
    },
    {
      icon: <AlignCenter />,
      title: "Align Center",
      action: () => editor.chain().focus().setTextAlign("center").run(),
      isActive: () => editor.isActive({ textAlign: 'center' }),
    },
    {
      icon: <AlignRight />,
      title: "Align Right",
      action: () => editor.chain().focus().setTextAlign("right").run(),
      isActive: () => editor.isActive({ textAlign: 'right' }),
    },
    {
      icon: <AlignJustify />,
      title: "Align Justify",
      action: () => editor.chain().focus().setTextAlign("justify").run(),
      isActive: () => editor.isActive({ textAlign: 'justify' }),
    },
    {
      type: "divider",
      render: () => <Divider />,
    },
    {
      type: "dropdown",
      render: () => <MenuHeadingDropdown editor={editor} />,
    },
    {
      type: "font-size",
      render: () => <></>,
    },
    {
      type: "divider",
      render: () => <Divider />,
    },
    {
      icon: <List />,
      title: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive("bulletList"),
    },
    {
      icon: <ListOrdered />,
      title: "Ordered List",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive("orderedList"),
    },
    {
      icon: <Grid2x2Plus />,
      title: "Add Table",
      action: () => editor.chain().focus().insertTable({ rows: 2, cols: 2 }).run(),
      isActive: () => false,
    },
    {
      icon: <Grid2x2X />,
      title: "Delete Table",
      action: () => editor.chain().focus().deleteTable().run(),
      isActive: () => false,
    },
    {
      type: "divider",
      render: () => <Divider />,
    },
    {
      icon: <TextQuote />,
      title: "Blockquote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive("blockquote"),
    },
    {
      icon: <Code2 />,
      title: "Code Block",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive("codeBlock"),
    },
    {
      type: "divider",
      render: () => <Divider />,
    },
    {
      icon: <SeparatorHorizontal />,
      title: "Page Break",
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: <WrapText />,
      title: "Hard Break",
      action: () => editor.chain().focus().setHardBreak().run(),
    },
    {
      type: "divider",
      render: () => <Divider />,
    },
    {
      icon: <Undo />,
      title: "Undo",
      action: () => editor.chain().focus().undo().run(),
    },
    {
      icon: <Redo />,
      title: "Redo",
      action: () => editor.chain().focus().redo().run(),
    },
    {
      type: "divider",
      render: () => <Divider />,
    },
    {
      icon: <Printer />,
      title: "Print",
      action: onPrint || window.print(),
    },
  ];

  return (
    <div className="editor__header flex justify-around sticky top-0 bg-white z-10 p-2 border-b">
      {items.map((item, index) => (
        <Fragment key={index}>
          {item.render ? item.render() : <MenuItem {...item as MenuItemProps} />}
        </Fragment>
      ))}
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
    editor.on("selectionUpdate", () => {
      if (editor.isActive("heading")) {
        const level = editor.getAttributes("heading").level as number;
        setStateLevel(level);
      } else {
        setStateLevel(0);
      }
    });
  }, [editor]);

  return (
    <div className="ml-2 mr-2">
      <Select
        value={stateLevel.toString()}
        onValueChange={(val) => toggleHeading(val)}
      >
        <SelectTrigger className="w-[180px]">
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

// Not currently implemented as no existing extension exists
const MenuFontSize = ({ editor }: MenuFontSizeProps) => {
  const [fontSize, setFontSize] = useState<string>("12pt");

  useEffect(() => {
    editor.on("selectionUpdate", () => {
      if (editor.isActive("textStyle")) {
        const fontSize = editor.getAttributes("textStyle").fontSize as string;
        setFontSize(fontSize);
      }
    });
  });

  return (
    <div className="flex items-center">
      <Minus />
      <div className="ml-1 mr-1">
        <Input
          className="p-0 w-12 text-center ring-0"
          onClick={() => editor.chain().setFontSize("12pt").run()}
          value={fontSize}
        />
      </div>
      <Plus />
    </div>
  );
};
