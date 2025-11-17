'use client';

import { BubbleMenu } from '@tiptap/react';
import { type Editor } from '@tiptap/react';
import {
  BetweenHorizontalStart,
  BetweenVerticalStart,
  TableCellsSplitIcon,
  TableCellsMergeIcon,
  Grid2x2X,
} from 'lucide-react';
import MenuItem, { MenuItemProps } from './BlockMenuItem';
import { cn } from '@/lib/utils';

interface TableBubbleMenuProps {
  editor: Editor;
}

type MenuItemWithDisabled = MenuItemProps & {
  disabled?: () => boolean;
  type?: 'divider';
};

const Divider = () => (
  <span className="mx-1 h-6 w-[1px] bg-gray-300" aria-hidden="true" />
);

export const TableBubbleMenu = ({ editor }: TableBubbleMenuProps) => {
  const menuItems: MenuItemWithDisabled[] = [
    // Add operations
    {
      icon: <BetweenHorizontalStart />,
      title: 'Add Row',
      action: () => editor.chain().focus().addRowAfter().run(),
      disabled: () => !editor.can().addRowAfter(),
    },
    {
      icon: <BetweenVerticalStart />,
      title: 'Add Column',
      action: () => editor.chain().focus().addColumnAfter().run(),
      disabled: () => !editor.can().addColumnAfter(),
    },
    { type: 'divider' },
    // Cell operations
    {
      icon: <TableCellsMergeIcon />,
      title: 'Merge Cells',
      action: () => editor.chain().focus().mergeCells().run(),
      disabled: () => !editor.can().mergeCells(),
    },
    {
      icon: <TableCellsSplitIcon />,
      title: 'Split Cell',
      action: () => editor.chain().focus().splitCell().run(),
      disabled: () => !editor.can().splitCell(),
    },
    { type: 'divider' },
    // Delete operations
    {
      icon: <BetweenHorizontalStart className="text-red-700" />,
      title: 'Delete Row',
      action: () => editor.chain().focus().deleteRow().run(),
      disabled: () => !editor.can().deleteRow(),
    },
    {
      icon: <BetweenVerticalStart className="text-red-700" />,
      title: 'Delete Column',
      action: () => editor.chain().focus().deleteColumn().run(),
      disabled: () => !editor.can().deleteColumn(),
    },
    {
      icon: <Grid2x2X className="text-red-700" />,
      title: 'Delete Table',
      action: () => editor.chain().focus().deleteTable().run(),
      disabled: () => !editor.can().deleteTable(),
    },
  ];

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) => editor.isActive('table')}
      tippyOptions={{ duration: 100 }}
    >
      <div className="flex items-center gap-0.5 rounded-md border bg-white p-0.5 shadow-md">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return <Divider key={`divider-${index}`} />;
          }

          const isDisabled = item.disabled?.() ?? false;
          const menuItemProps: MenuItemProps = {
            icon: item.icon,
            title: isDisabled ? `${item.title} (unavailable)` : item.title,
            action: isDisabled
              ? () => {
                  // No-op for disabled items
                }
              : item.action,
            isActive: item.isActive,
          };

          return (
            <div
              key={index}
              className={cn(
                'm-[1px] flex',
                isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
              )}
            >
              <MenuItem {...menuItemProps} />
            </div>
          );
        })}
      </div>
    </BubbleMenu>
  );
};

