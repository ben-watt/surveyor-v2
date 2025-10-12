'use client';

import * as React from 'react';
import { CheckIcon, ArrowDownNarrowWide, ChevronRight, ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Control, FieldErrors, RegisterOptions, useController } from 'react-hook-form';
import { Label } from './Label';
import { ErrorMessage } from '@hookform/error-message';
import InputError from '../InputError';

export interface ComboboxDataItem {
  value: any;
  label: string;
  children?: ComboboxDataItem[];
}

export interface ComboboxProps {
  data: ComboboxDataItem[];
  labelTitle?: string;
  onCreateNew?: () => void;
  errors?: FieldErrors;
  name: string;
  control: Control<any>;
  rules?: RegisterOptions;
  showParentLabels?: boolean;
  isMulti?: boolean;
  inDrawer?: boolean;
  onClose?: () => void;
}

export function Combobox({
  data,
  labelTitle,
  onCreateNew,
  errors,
  name,
  control,
  rules,
  showParentLabels = false,
  isMulti = false,
  inDrawer = false,
  onClose,
}: ComboboxProps) {
  const { field } = useController({
    name,
    control,
    rules,
    defaultValue: isMulti ? [] : '',
  });
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [navigationStack, setNavigationStack] = React.useState<ComboboxDataItem[][]>([data]);
  const [breadcrumbs, setBreadcrumbs] = React.useState<string[]>([]);

  // Reset navigation when data changes
  React.useEffect(() => {
    setNavigationStack([data]);
    setBreadcrumbs([]);
  }, [data]);

  // Flatten the nested data structure for searching
  const flattenData = React.useCallback(
    (
      items: ComboboxDataItem[],
      parentLabel = '',
    ): { value: any; label: string; fullLabel: string }[] => {
      return items.reduce(
        (acc, item) => {
          const fullLabel =
            showParentLabels && parentLabel ? `${parentLabel} > ${item.label}` : item.label;
          const result = [{ value: item.value, label: item.label, fullLabel }];

          if (item.children) {
            result.push(...flattenData(item.children, fullLabel));
          }

          return [...acc, ...result];
        },
        [] as { value: any; label: string; fullLabel: string }[],
      );
    },
    [showParentLabels],
  );

  const flatData = React.useMemo(() => flattenData(data), [data, flattenData]);

  const filteredData = React.useMemo(() => {
    if (!search) return flatData;
    return flatData.filter(
      (item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.fullLabel.toLowerCase().includes(search.toLowerCase()),
    );
  }, [flatData, search]);

  const stripTenantSuffix = React.useCallback((val: any) => {
    if (typeof val !== 'string') return val;
    const idx = val.indexOf('#');
    return idx >= 0 ? val.substring(0, idx) : val;
  }, []);

  const valuesEqual = React.useCallback(
    (a: any, b: any) => {
      // Direct equality for primitives
      if ((typeof a !== 'object' || a === null) && (typeof b !== 'object' || b === null)) {
        if (a === b) return true;
        if (typeof a === 'string' && typeof b === 'string') {
          return stripTenantSuffix(a) === stripTenantSuffix(b);
        }
        return false;
      }

      // Object comparison by id when available
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

  const handleSelect = React.useCallback(
    (label: string, item?: ComboboxDataItem) => {
      if (item?.children && item.children.length > 0) {
        setNavigationStack((prev) => [...prev, item.children!]);
        setBreadcrumbs((prev) => [...prev, item.label]);
        return;
      }

      const selectedItem = flatData.find((i) => i.label === label);
      if (!selectedItem) return;

      if (isMulti) {
        const currentValues = Array.isArray(field.value) ? field.value : [];
        const valueExists = currentValues.some((v) => valuesEqual(v, selectedItem.value));

        field.onChange(
          valueExists
            ? currentValues.filter((v) => !valuesEqual(v, selectedItem.value))
            : [...currentValues, selectedItem.value],
        );
      } else {
        const valueMatches = valuesEqual(field.value, selectedItem.value);

        field.onChange(valueMatches ? '' : selectedItem.value);
        setOpen(false);
        if (inDrawer && onClose) {
          onClose();
        }
      }

      if (!isMulti) {
        setNavigationStack([data]);
        setBreadcrumbs([]);
      }
    },
    [data, field, isMulti, flatData, inDrawer, onClose, valuesEqual],
  );

  const handleBack = React.useCallback(() => {
    if (navigationStack.length > 1) {
      setNavigationStack((prev) => prev.slice(0, -1));
      setBreadcrumbs((prev) => prev.slice(0, -1));
    }
  }, [navigationStack.length]);

  const currentLevel = navigationStack[navigationStack.length - 1];
  const selectedItems = React.useMemo(() => {
    if (!field.value) return [];

    if (isMulti && Array.isArray(field.value)) {
      return field.value.map((value) => flatData.find((item) => valuesEqual(value, item.value)));
    }

    const item = flatData.find((item) => valuesEqual(field.value, item.value));

    return item ? [item] : [];
  }, [field.value, flatData, isMulti, valuesEqual]);

  const selectedLabels = React.useMemo(
    () =>
      selectedItems
        .filter(Boolean)
        .map((item) => item?.fullLabel)
        .join(', '),
    [selectedItems],
  );

  const isItemSelected = React.useCallback(
    (itemValue: any) => {
      if (isMulti && Array.isArray(field.value)) {
        return field.value.some((v) => valuesEqual(v, itemValue));
      }
      return valuesEqual(field.value, itemValue);
    },
    [field.value, isMulti, valuesEqual],
  );

  // When in drawer mode, we don't need the trigger button and popover wrapper
  if (inDrawer) {
    return (
      <Command className="w-full">
        {isMulti && selectedItems.length > 0 && (
          <div className="border-b px-2 py-2">
            <div className="flex flex-wrap gap-1">
              {selectedItems.filter(Boolean).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm text-secondary-foreground"
                >
                  <span>{item?.label}</span>
                  <button
                    type="button"
                    className="h-4 w-4 rounded-sm hover:bg-secondary-foreground/20"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelect(item?.label || '');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <CommandInput
          placeholder="Search..."
          value={search}
          onValueChange={setSearch}
          className="h-9 border-none focus:ring-0"
        />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup>
            {search ? (
              filteredData.map((item, index) => (
                <CommandItem
                  key={`filtered-${index}-${typeof item.value === 'object' ? item.value?.id || JSON.stringify(item.value) : item.value}`}
                  value={item.label}
                  onSelect={() => handleSelect(item.label)}
                  className="flex items-center py-3"
                >
                  {item.fullLabel}
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      isItemSelected(item.value) ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))
            ) : (
              <>
                {navigationStack.length > 1 && (
                  <>
                    <CommandItem
                      value="back"
                      onSelect={handleBack}
                      className="py-3 font-medium text-muted-foreground"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to {breadcrumbs[breadcrumbs.length - 2] || 'Start'}
                    </CommandItem>
                    <CommandSeparator />
                  </>
                )}
                {currentLevel.map((item, index) => (
                  <CommandItem
                    key={`nav-${index}-${typeof item.value === 'object' ? item.value?.id || JSON.stringify(item.value) : item.value}`}
                    value={item.label}
                    onSelect={() => handleSelect(item.label, item)}
                    className="flex items-center py-3"
                  >
                    {item.label}
                    {item.children && item.children.length > 0 ? (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    ) : (
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4',
                          isItemSelected(item.value) ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    )}
                  </CommandItem>
                ))}
              </>
            )}
          </CommandGroup>
        </CommandList>
        {onCreateNew && navigationStack.length === 1 && (
          <>
            <hr />
            <CommandGroup forceMount>
              <CommandItem value="create" onSelect={onCreateNew} className="py-3">
                Create new...
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </Command>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2">
        <Label text={labelTitle} />
      </div>
      <Popover
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen && !isMulti) {
            setNavigationStack([data]);
            setBreadcrumbs([]);
            setSearch('');
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between overflow-hidden text-ellipsis whitespace-nowrap"
          >
            <div className="flex w-full min-w-0 items-center justify-between">
              <span className="min-w-0 max-w-72 flex-1 truncate text-start">
                {selectedLabels || 'Select...'}
              </span>
              <div className="flex items-center">
                {isMulti && selectedItems.length > 0 && (
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
                    {selectedItems.length}
                  </span>
                )}
                <ArrowDownNarrowWide className="ml-2 h-4 w-4 flex-none shrink-0 opacity-50" />
              </div>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            {isMulti && selectedItems.length > 0 && (
              <div className="border-b px-2 py-2">
                <div className="flex flex-wrap gap-1">
                  {selectedItems.filter(Boolean).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm text-secondary-foreground"
                    >
                      <span>{item?.label}</span>
                      <button
                        type="button"
                        className="h-4 w-4 rounded-sm hover:bg-secondary-foreground/20"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelect(item?.label || '');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <CommandInput
              placeholder="Search..."
              value={search}
              onValueChange={setSearch}
              className="h-9 border-none focus:ring-0"
            />
            <CommandList>
              <CommandEmpty>Nothing found.</CommandEmpty>
              <CommandGroup>
                {search ? (
                  filteredData.map((item, index) => (
                    <CommandItem
                      key={`filtered-${index}-${typeof item.value === 'object' ? item.value?.id || JSON.stringify(item.value) : item.value}`}
                      value={item.label}
                      onSelect={() => handleSelect(item.label)}
                      className="flex items-center"
                    >
                      {item.fullLabel}
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4',
                          isItemSelected(item.value) ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))
                ) : (
                  <>
                    {navigationStack.length > 1 && (
                      <>
                        <CommandItem
                          value="back"
                          onSelect={handleBack}
                          className="font-medium text-muted-foreground"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back to {breadcrumbs[breadcrumbs.length - 2] || 'Start'}
                        </CommandItem>
                        <CommandSeparator />
                      </>
                    )}
                    {currentLevel.map((item, index) => (
                      <CommandItem
                        key={`nav-${index}-${typeof item.value === 'object' ? item.value?.id || JSON.stringify(item.value) : item.value}`}
                        value={item.label}
                        onSelect={() => handleSelect(item.label, item)}
                        className="flex items-center"
                      >
                        {item.label}
                        {item.children && item.children.length > 0 ? (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        ) : (
                          <CheckIcon
                            className={cn(
                              'ml-auto h-4 w-4',
                              isItemSelected(item.value) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        )}
                      </CommandItem>
                    ))}
                  </>
                )}
              </CommandGroup>
            </CommandList>
            <hr />
            {onCreateNew && navigationStack.length === 1 && (
              <CommandGroup forceMount>
                <CommandItem value="create" onSelect={onCreateNew}>
                  Create new...
                </CommandItem>
              </CommandGroup>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      <ErrorMessage
        name={field.name}
        errors={errors}
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
}
