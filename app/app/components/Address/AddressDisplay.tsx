import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Address, formatAddress } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";

interface AddressDisplayProps {
  address: Address;
  maxLength?: number;
}

const shortAddress = (address: Address, maxLength: number) => {
  if (address.formatted.length > maxLength) {
    return address.formatted.substring(0, maxLength) + "...";
  }
  return address.formatted;
}

export function AddressDisplay({ address, maxLength = 15 }: AddressDisplayProps) {
  const [open, setOpen] = useState(false);
  const formattedAddress = formatAddress(address);
  const shorterAddress = shortAddress(address, maxLength);

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
            {shorterAddress}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-fit whitespace-pre-line"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <p className="text-sm">{formattedAddress}</p>
      </PopoverContent>
    </Popover>
  );
} 