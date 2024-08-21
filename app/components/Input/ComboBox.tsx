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
import { UseFormRegisterReturn, useFormContext } from "react-hook-form";
import { Label } from "./Label";

interface ComboboxProps {
  data: { value: string; label: string }[];
  labelTitle?: string;
  register: () => UseFormRegisterReturn<string>;
}

export function Combobox(props: ComboboxProps) {
  const { setValue, getValues } = useFormContext();
  const reg = props.register();
  const value = getValues(reg.name);

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
            {value
              ? props.data.find((d) => d.value === value)?.label
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
                    value={d.value}
                    onSelect={(sv) => {
                      console.log(sv, d.label, value, d.value)
                      console.log(reg.name)
                      setValue(
                        reg.name,
                        sv === value ? "" : sv
                      );
                      setOpen(false);
                    }}
                    {...reg}
                  >
                    {d.label}
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === d.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
