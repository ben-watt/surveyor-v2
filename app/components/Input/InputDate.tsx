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

interface InputDateProps {
  labelTitle: string;
  onChange: (d: Date | undefined) => void;
  value?: Date;
  ref: React.Ref<HTMLInputElement>;
}

const InputDate = ({ onChange, value, labelTitle }: InputDateProps, ref : React.LegacyRef<HTMLDivElement>) => {
  const date = value;
  const handleSelect = (d: Date | undefined) => {
    onChange(d);
  };

  return (
    <>
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
            selected={value}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </>
  );
};

export default React.forwardRef(InputDate);
