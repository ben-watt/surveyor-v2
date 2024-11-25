import { useCurrentEditor, type Editor } from "@tiptap/react";

import { Fragment, useEffect, useState } from "react";

import MenuItem from "./BlockMenuItem";
import {
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  SeparatorHorizontal,
  Strikethrough,
  TextQuote,
  Text,
  RemoveFormatting,
  WrapText,
  Forward,
  Redo,
  Undo,
  Printer,
} from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
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

interface MenuBarProps {
  editor: Editor | null;
  onPrint: () => void;
}

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
    },
    {
      type: "dropdown",
    },
    {
      type: "divider",
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
      type: "divider",
    },
    {
      icon: <Text />,
      title: "Paragraph",
      action: () => editor.chain().focus().setParagraph().run(),
      isActive: () => editor.isActive("paragraph"),
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
          {item.type === "divider" ? (
            <span className="m-auto h-[1.5rem] bg-gray-300 pl-[1px]" />
          ) : item.type === "dropdown" ? (
            <MenuHeadingDropdown editor={editor} />
          ) : (
            <MenuItem {...item} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

/*
  action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  isActive: () => editor.isActive("heading", { level: 1 }),
*/

interface MenuHeadingDropdownProps {
  editor: Editor;
}

const MenuHeadingDropdown = ({ editor }: MenuHeadingDropdownProps) => {
  const [stateLevel, setStateLevel] = useState<number>(0);

  const toggleHeading = (level: string) => {
    const l = parseInt(level);
    if(l === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: l as Level }).run();
    }

    setStateLevel(l);
  };

  // When the user selects a heading then update the value in the dropdown
  useEffect(() => {
    editor.on("selectionUpdate", () => {
      if(editor.isActive("heading")) {
        const level = editor.getAttributes("heading").level as number;
        setStateLevel(level);
      } else {
        setStateLevel(0);
      }
    });
  }, [editor]);

  return (
    <Select value={stateLevel.toString()} onValueChange={val => toggleHeading(val)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Normal Text" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Text Style</SelectLabel>
          <SelectItem value="0">Normal Text</SelectItem>
          <SelectItem value="1">H1</SelectItem>
          <SelectItem value="2">H2</SelectItem>
          <SelectItem value="3">H3</SelectItem>
          <SelectItem value="4">H4</SelectItem>
          <SelectItem value="5">H5</SelectItem>
          <SelectItem value="6">H6</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
