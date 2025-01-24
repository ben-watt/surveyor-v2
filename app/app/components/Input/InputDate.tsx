"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FieldValues, useController, UseControllerProps } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import InputError from "../InputError";
import { useEffect } from "react";

interface InputDateProps {
  labelTitle: string;
  controllerProps: UseControllerProps<FieldValues>;
}

const InputDate = ({ labelTitle, controllerProps }: InputDateProps) => {
  const { field, formState } = useController({ ...controllerProps, defaultValue: new Date() });
  const [open, setOpen] = React.useState(false);
  const handleSelect = (d: Date | undefined) => {
    field.onChange(d);
    setOpen(false);
  };

  // Initialize date from field value if it exists
  useEffect(() => {
    if (field.value) {
      field.onChange(new Date(field.value));
    }
  }, [field, field.value]);

  return (
    <>
      <div>
        <div>
          <label>
            <span className="text-sm">{labelTitle}</span>
          </label>
        </div>

        <Popover open={open}>
          <PopoverTrigger asChild onClick={(ev) => setOpen(!open)}>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !field.value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={new Date(field.value)}
              onSelect={handleSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <ErrorMessage
        errors={formState.errors}
        name={field.name}
        render={(data) => InputError({ message: data.message })}
      />
    </>
  );
};

InputDate.displayName = "InputDate";

export default InputDate;
