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

interface InputDateProps {
  labelTitle: string;
  ref: React.Ref<HTMLInputElement>;
  controllerProps: UseControllerProps<FieldValues>;
}

const InputDate = ({ labelTitle, controllerProps }: InputDateProps, ref : React.LegacyRef<HTMLDivElement>) => {
  const { field, formState } = useController(controllerProps);
  const date = field?.value?.toString();

  const handleSelect = (d: Date | undefined) => {
    field.onChange(d);
  };

  return (
    <>
      <div>
        <div>
          <label>
            <span className="text-sm">{labelTitle}</span>
          </label>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" ref={ref}>
            <Calendar
              mode="single"
              selected={field.value}
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

export default React.forwardRef(InputDate);
