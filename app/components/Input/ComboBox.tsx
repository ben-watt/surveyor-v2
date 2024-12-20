"use client";

import * as React from "react";
import { CheckIcon, ArrowDownNarrowWide } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FieldErrors, FieldValues, UseControllerProps, UseFormRegisterReturn, useController, useFormContext } from "react-hook-form";
import { Label } from "./Label";
import { ErrorMessage } from "@hookform/error-message";
import InputError from "../InputError";

interface ComboboxProps {
  data: { value: string; label: string }[];
  labelTitle?: string;
  onCreateNew?: () => any | void;
  errors?: FieldErrors<FieldValues>;
  controllerProps: UseControllerProps<FieldValues, string>;
}

export function Combobox(props: ComboboxProps) {
  const { field } = useController(props.controllerProps);
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <Label text={props.labelTitle} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full text-ellipsis overflow-hidden"
          >
            {field.value
              ? props.data.find((d) => d.value === field.value)?.label
              : "Select..."}
            <ArrowDownNarrowWide className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search..."
              className="h-9 border-none focus:ring-0"
            />
            <CommandList>
              <CommandEmpty>Nothing found.</CommandEmpty>
              <CommandGroup>
                {props.data.map((d) => (
                  <CommandItem
                    key={d.value}
                    value={d.label}
                    onSelect={() => {
                      field.onChange(d.value === field.value ? "" : d.value);
                      setOpen(false);
                    }}
                  >
                    {d.label}
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        field.value === d.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {props.onCreateNew && (
              <CommandGroup forceMount>
                <CommandItem className="font-semibold" value="Create new..." onSelect={ev => props.onCreateNew && props.onCreateNew()}>
                  Create new...
                </CommandItem>
              </CommandGroup>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      <ErrorMessage
        name={field.name}
        errors={props.errors}
        render={({ message }) => InputError({ message })} />
    </div>
  );
}
