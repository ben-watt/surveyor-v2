'use client';

import * as React from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { Combobox, type ComboboxProps, type ComboboxDataItem } from './ComboBox';
import { useController } from 'react-hook-form';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ArrowDownNarrowWide } from 'lucide-react';
import { Label } from './Label';
import { ErrorMessage } from '@hookform/error-message';
import InputError from '../InputError';

type DynamicComboBoxProps = Omit<ComboboxProps, 'inDrawer' | 'onClose'>;

export function DynamicComboBox(props: DynamicComboBoxProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  // Always call useController to avoid conditional hook usage
  const { field } = useController({
    name: props.name,
    control: props.control,
    rules: props.rules,
    defaultValue: props.isMulti ? [] : '',
  });

  const stripTenantSuffix = React.useCallback((val: any) => {
    if (typeof val !== 'string') return val;
    const idx = val.indexOf('#');
    return idx >= 0 ? val.substring(0, idx) : val;
  }, []);

  const valuesEqual = React.useCallback(
    (a: any, b: any) => {
      if ((typeof a !== 'object' || a === null) && (typeof b !== 'object' || b === null)) {
        if (a === b) return true;
        if (typeof a === 'string' && typeof b === 'string') {
          return stripTenantSuffix(a) === stripTenantSuffix(b);
        }
        return false;
      }
      const aId = a && typeof a === 'object' ? (a.id ?? JSON.stringify(a)) : a;
      const bId = b && typeof b === 'object' ? (b.id ?? JSON.stringify(b)) : b;
      if (aId === bId) return true;
      if (typeof aId === 'string' && typeof bId === 'string') {
        return stripTenantSuffix(aId) === stripTenantSuffix(bId);
      }
      return false;
    },
    [stripTenantSuffix],
  );

  // Use the standard ComboBox on desktop
  if (isDesktop) {
    return <Combobox {...props} />;
  }

  const getDisplayValue = () => {
    const value = field.value;
    if (!value) return 'Select...';

    if (props.isMulti && Array.isArray(value)) {
      if (value.length === 0) return 'Select...';
      return `${value.length} selected`;
    }

    // Find the label for the current value
    const flattenData = (items: ComboboxDataItem[]): { value: any; label: string }[] => {
      return items.reduce(
        (acc, item) => {
          const result = [{ value: item.value, label: item.label }];
          if (item.children) {
            result.push(...flattenData(item.children));
          }
          return [...acc, ...result];
        },
        [] as { value: any; label: string }[],
      );
    };

    const flatData = flattenData(props.data);
    const item = flatData.find((item) => valuesEqual(value, item.value));

    return item?.label || 'Select...';
  };

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2">
        <Label text={props.labelTitle} />
      </div>

      {/* Mobile trigger button */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between overflow-hidden text-ellipsis whitespace-nowrap"
        onClick={() => setMobileDrawerOpen(true)}
      >
        <span className="min-w-0 flex-1 truncate text-start">{getDisplayValue()}</span>
        <ArrowDownNarrowWide className="ml-2 h-4 w-4 flex-none shrink-0 opacity-50" />
      </Button>

      <ErrorMessage
        name={props.name}
        errors={props.errors}
        render={({ message }) => InputError({ message })}
      />

      {/* Mobile drawer with ComboBox inside */}
      <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{props.labelTitle || 'Select an option'}</DrawerTitle>
            <DrawerDescription>
              {props.isMulti ? 'Select multiple options' : 'Select an option'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-4">
            <Combobox {...props} inDrawer onClose={() => setMobileDrawerOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
