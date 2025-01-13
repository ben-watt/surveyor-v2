"use client";

import * as React from "react";
import { CheckIcon, ArrowDownNarrowWide, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Control, FieldErrors, useController } from "react-hook-form";
import { Label } from "./Label";
import { ErrorMessage } from "@hookform/error-message";
import InputError from "../InputError";

interface ComboboxDataItem {
  value: string;
  label: string;
  children?: ComboboxDataItem[];
}

interface ComboboxProps {
  data: ComboboxDataItem[];
  labelTitle?: string;
  onCreateNew?: () => void;
  errors?: FieldErrors;
  name: string;
  control: Control<any>;
  onChange?: (value: string) => void;
  showParentLabels?: boolean;
}

export function Combobox({
  data,
  labelTitle,
  onCreateNew,
  errors,
  name,
  control,
  onChange,
  showParentLabels = false,
}: ComboboxProps) {
  const { field } = useController({
    name,
    control,
  });
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [navigationStack, setNavigationStack] = React.useState<ComboboxDataItem[][]>([data]);
  const [breadcrumbs, setBreadcrumbs] = React.useState<string[]>([]);

  // Reset navigation when data changes
  React.useEffect(() => {
    setNavigationStack([data]);
    setBreadcrumbs([]);
  }, [data]);

  // Flatten the nested data structure for searching
  const flattenData = React.useCallback((items: ComboboxDataItem[], parentLabel = ""): { value: string; label: string; fullLabel: string }[] => {
    return items.reduce((acc, item) => {
      const fullLabel = showParentLabels && parentLabel ? `${parentLabel} > ${item.label}` : item.label;
      const result = [{ value: item.value, label: item.label, fullLabel }];
      
      if (item.children) {
        result.push(...flattenData(item.children, fullLabel));
      }
      
      return [...acc, ...result];
    }, [] as { value: string; label: string; fullLabel: string }[]);
  }, [showParentLabels]);

  const flatData = React.useMemo(() => flattenData(data), [data, flattenData]);

  const filteredData = React.useMemo(() => {
    if (!search) return flatData;
    return flatData.filter(
      item => 
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.fullLabel.toLowerCase().includes(search.toLowerCase())
    );
  }, [flatData, search]);

  const handleSelect = React.useCallback((value: string, item?: ComboboxDataItem) => {
    if (item?.children) {
      setNavigationStack(prev => [...prev, item.children!]);
      setBreadcrumbs(prev => [...prev, item.label]);
      return;
    }

    const newValue = value === field.value ? "" : value;
    field.onChange(newValue);
    onChange?.(newValue);
    setOpen(false);
    setNavigationStack([data]);
    setBreadcrumbs([]);
  }, [data, field, onChange]);

  const handleBack = React.useCallback(() => {
    if (navigationStack.length > 1) {
      setNavigationStack(prev => prev.slice(0, -1));
      setBreadcrumbs(prev => prev.slice(0, -1));
    }
  }, [navigationStack.length]);

  const currentLevel = navigationStack[navigationStack.length - 1];
  const selectedItem = flatData.find(item => item.value === field.value);

  return (
    <div>
      <Label text={labelTitle} />
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setNavigationStack([data]);
          setBreadcrumbs([]);
          setSearch("");
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full text-ellipsis overflow-hidden"
          >
            {selectedItem
              ? selectedItem.fullLabel
              : "Select..."}
            <ArrowDownNarrowWide className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
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
                  filteredData.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.label}
                      onSelect={() => handleSelect(item.value)}
                      className="flex items-center"
                    >
                      {item.fullLabel}
                      <CheckIcon
                        className={cn(
                          "ml-auto h-4 w-4",
                          field.value === item.value ? "opacity-100" : "opacity-0"
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
                          Back to {breadcrumbs[breadcrumbs.length - 2] || "Start"}
                        </CommandItem>
                        <CommandSeparator />
                      </>
                    )}
                    {currentLevel.map((item) => (
                      <CommandItem
                        key={item.value}
                        value={item.label}
                        onSelect={() => handleSelect(item.value, item)}
                        className="flex items-center"
                      >
                        {item.label}
                        {item.children ? (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        ) : (
                          <CheckIcon
                            className={cn(
                              "ml-auto h-4 w-4",
                              field.value === item.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        )}
                      </CommandItem>
                    ))}
                  </>
                )}
              </CommandGroup>
            </CommandList>
            {onCreateNew && !search && navigationStack.length === 1 && (
              <CommandGroup forceMount>
                <CommandItem className="font-semibold" value="Create new..." onSelect={onCreateNew}>
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
        render={({ message }) => InputError({ message })} />
    </div>
  );
}
