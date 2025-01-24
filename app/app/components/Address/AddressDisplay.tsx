import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AddressDisplayProps {
  address: string;
  maxLength?: number;
}

export function AddressDisplay({ address, maxLength = 15 }: AddressDisplayProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="p-0 hover:bg-transparent"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <span className="cursor-pointer">
            {address.substring(0, maxLength) + "..."}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-fit"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <p className="text-sm">{address}</p>
      </PopoverContent>
    </Popover>
  );
} 