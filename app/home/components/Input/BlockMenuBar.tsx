import { type Editor } from "@tiptap/react";

import { useEffect, useState } from "react";

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
  TableOfContents,
  Image,
  ImagePlus,
  Brush,
  Highlighter,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@uidotdev/usehooks";

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
      type: "highlight",
      render: () => <HighlightColorPicker editor={editor} />,
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
      isActive: () => editor.isActive({ textAlign: "left" }),
    },
    {
      icon: <AlignCenter />,
      title: "Align Center",
      action: () => editor.chain().focus().setTextAlign("center").run(),
      isActive: () => editor.isActive({ textAlign: "center" }),
    },
    {
      icon: <AlignRight />,
      title: "Align Right",
      action: () => editor.chain().focus().setTextAlign("right").run(),
      isActive: () => editor.isActive({ textAlign: "right" }),
    },
    {
      icon: <AlignJustify />,
      title: "Align Justify",
      action: () => editor.chain().focus().setTextAlign("justify").run(),
      isActive: () => editor.isActive({ textAlign: "justify" }),
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
      render: () => <MenuFontSize editor={editor} />,
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
      action: () =>
        editor.chain().focus().insertTable({ rows: 2, cols: 2 }).run(),
      isActive: () => false,
    },
    {
      icon: <ImagePlus />,
      title: "Add Image",
      action: () => {
        // open file browser to upload image
        const file = document.createElement("input");
        file.type = "file";
        file.accept = "image/*";
        file.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            editor
              .chain()
              .focus()
              .setImage({
                src: URL.createObjectURL(file),
                alt: "Image",
              })
              .run();
          }
        };
        file.click();
      },
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
    // {
    //   icon: <TableOfContents />,
    //   title: "Table of Contents",
    //   action: () => editor.chain().focus(),
    // },
    {
      icon: <Printer />,
      title: "Print",
      action: onPrint || window.print(),
    },
  ];

  const tableContextMenu = {
    isActive: () => editor.isActive("table"),
    items: [
      {
        icon: <BetweenHorizontalStart />,
        title: "Add Row After",
        action: () => editor.chain().focus().addRowAfter().run(),
      },
      {
        icon: <BetweenVerticalStart />,
        title: "Add Column After",
        action: () => editor.chain().focus().addColumnAfter().run(),
      },
      {
        icon: <TableCellsSplitIcon />,
        title: "Split Cell",
        action: () => editor.chain().focus().splitCell().run(),
      },
      {
        icon: <TableCellsMergeIcon />,
        title: "Merge Cells",
        action: () => editor.chain().focus().mergeCells().run(),
      },
      {
        icon: <Grid2x2X className="text-red-700" />,
        title: "Delete Table",
        action: () => editor.chain().focus().deleteTable().run(),
        isActive: () => false,
      },
      {
        icon: <BetweenHorizontalStart className="text-red-700" />,
        title: "Delete Row",
        action: () => editor.chain().focus().deleteRow().run(),
      },
      {
        icon: <BetweenVerticalStart className="text-red-700" />,
        title: "Delete Column",
        action: () => editor.chain().focus().deleteColumn().run(),
      },
    ],
  };

  return (
    <div className="editor__header sticky top-0 bg-white z-10 p-2 border-b border-l">
      <div className="flex justify-between flex-shrink-1">
        {items.map((item, index) => (
          <div key={index} className="flex m-[1px]">
            {item.render ? (
              item.render()
            ) : (
              <MenuItem {...(item as MenuItemProps)} />
            )}
          </div>
        ))}
      </div>
      {tableContextMenu.isActive() && (
        <div className="flex justify-left">
          {tableContextMenu.items.map((item, index) => (
            <div key={index} className="flex m-[1px]">
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
    editor.on("selectionUpdate", () => {
      const setFromNode = (nodeType: string) => {
        const fontSize = editor.getAttributes(nodeType).fontSize as string;
        const size = parseInt(fontSize.replace("pt", ""));
        if (size) {
          setFontSize(size);
        } else {
          setFontSize(DEFAULT_FONT_SIZE);
        }
      };

      if (editor.isActive("heading")) {
        setFromNode("heading");
      }

      if (editor.isActive("paragraph")) {
        setFromNode("paragraph");
      }

      if (editor.isActive("textStyle")) {
        setFromNode("textStyle");
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
        <Select
          value={fontSize.toString()}
          onValueChange={(v) => changeFontSize(v)}
        >
          <SelectTrigger className="[&_svg]:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-11">
            <SelectGroup>
              {Array.from(new Set(fontSizeDropdown.concat(fontSize))).map(
                (size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                )
              )}
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
    "HighlightColourPicker_selectedColour",
    "#ff0000"
  );
  const [colourPickerOpen, setColourPickerOpen] = useState<boolean>(false);
  const colours = [
    { name: "Red", value: "#ff0000" },
    { name: "Yellow", value: "#ffff00" },
    { name: "Green", value: "#00ff00" },
    { name: "Blue", value: "#0000ff" },
    { name: "Pink", value: "#ffc0cb" },
    { name: "Orange", value: "#ffa500" },
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
        className={cn(
          "w-8 p-0 h-full",
          editor.isActive("highlight") && "bg-muted"
        )}
      >
        <HighlighterSvg nibColour={selectedColour} />
      </Button>
      {colourPickerOpen && (
        <div className="grid grid-rows-1 gap-2 absolute top-0 left-0 bg-white border p-2 rounded-md">
          {colours.map((colour) => (
            <button
              key={colour.value}
              className={cn(
                "h-6 w-6 rounded-full border border-border",
                selectedColour === colour.value &&
                  "ring-2 ring-offset-2 ring-offset-background ring-ring"
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
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="lucide lucide-highlighter-icon lucide-highlighter"
    >
      <path style={{ fill: nibColour }} d="m9 11-6 6v3h9l3-3" />
      <path  d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </svg>
  );
};
