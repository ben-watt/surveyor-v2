import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Address,
  formatAddress,
} from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

interface AddressDisplayProps {
  address: Address;
  maxLength?: number;
}

const shortAddress = (address: Address, maxLength: number) => {
  if (address.formatted.length > maxLength) {
    return address.formatted.substring(0, maxLength) + '...';
  }
  return address.formatted;
};

/**
 * Build a Google Maps URL for an address.
 *
 * @param {Address} address - The address object, optionally including location coordinates.
 * @param {string} formattedAddress - The human-readable formatted address string.
 * @returns {string} A Google Maps search URL that opens the location in a new tab.
 */
const getGoogleMapsUrl = (address: Address, formattedAddress: string): string => {
  const hasLocation =
    typeof address.location?.lat === 'number' && typeof address.location?.lng === 'number';
  if (hasLocation) {
    const { lat, lng } = address.location!;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress)}`;
};

export function AddressDisplay({ address, maxLength = 15 }: AddressDisplayProps) {
  const [open, setOpen] = useState(false);
  const formattedAddress = formatAddress(address);
  const shorterAddress = shortAddress(address, maxLength);
  const hasLocation =
    typeof address.location?.lat === 'number' && typeof address.location?.lng === 'number';
  const googleMapsUrl = getGoogleMapsUrl(address, formattedAddress);
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
          aria-label={`Open Google Maps for ${formattedAddress}`}
          title={`Open in Google Maps: ${formattedAddress}`}
          onClick={() => {
            window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
          }}
        >
          <span className="cursor-pointer">{shorterAddress}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit whitespace-pre-line"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {hasLocation && (
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
            <div style={mapContainerStyle} className="relative">
              <Map
                zoom={15}
                center={{ lat: address.location!.lat, lng: address.location!.lng }}
                gestureHandling="none"
                disableDefaultUI={true}
              >
                <Marker position={{ lat: address.location!.lat, lng: address.location!.lng }} />
              </Map>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open Google Maps for ${formattedAddress}`}
                title={`Open in Google Maps: ${formattedAddress}`}
                className="absolute inset-0 z-10"
                role="link"
              />
            </div>
          </APIProvider>
        )}
        <div className="mt-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open Google Maps for ${formattedAddress}`}
            className="text-xs underline"
          >
            Open in Google Maps
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
