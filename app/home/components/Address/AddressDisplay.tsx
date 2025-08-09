import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Address, formatAddress } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

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
  const hasLocation = typeof address.location?.lat === 'number' && typeof address.location?.lng === 'number';
  const mapContainerStyle = {
    width: '260px',
    height: '160px',
    marginTop: '0.5rem',
    borderRadius: '0.375rem',
  } as const;

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
        {hasLocation && (
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
            <div style={mapContainerStyle}>
              <Map
                zoom={15}
                center={{ lat: address.location!.lat, lng: address.location!.lng }}
                gestureHandling="none"
                disableDefaultUI={true}
              >
                <Marker position={{ lat: address.location!.lat, lng: address.location!.lng }} />
              </Map>
            </div>
          </APIProvider>
        )}
      </PopoverContent>
    </Popover>
  );
} 