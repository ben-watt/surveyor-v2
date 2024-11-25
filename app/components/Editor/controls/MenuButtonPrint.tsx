/// <reference types="@tiptap/extension-history" />
import PrintIcon from "@mui/icons-material/Print";
import { useRichTextEditorContext } from "../context";
import MenuButton, { type MenuButtonProps } from "./MenuButton";

export type MenuButtonPrintProps = Partial<MenuButtonProps>;

export default function MenuButtonPrint(props: MenuButtonPrintProps) {
  const editor = useRichTextEditorContext();
  return (
    <MenuButton
      tooltipLabel="Print"
      tooltipShortcutKeys={["mod", "P"]}
      IconComponent={PrintIcon}
      disabled={!editor?.isEditable || !editor.can().undo()}
      onClick={() => editor?.chain().focus().undo().run()}
      {...props}
    />
  );
}
