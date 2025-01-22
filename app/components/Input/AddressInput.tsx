import { Input as ShadInput } from "@/components/ui/input";
import {
  FieldErrors,
  FieldValues,
  useController,
  Control,
} from "react-hook-form";
import { Label } from "./Label";
import { ErrorMessage } from "@hookform/error-message";
import InputError from "../InputError";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useJsApiLoader, GoogleMap, MarkerF } from "@react-google-maps/api";
import React from "react";
import { Address } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

interface AddressInputProps {
  labelTitle?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name: string;
  control: Control<any>;
  rules?: Record<string, any>;
  errors?: FieldErrors<FieldValues>;
  countryCode?: string; // Optional override for country restriction
}

const mapContainerStyle = {
  width: "100%",
  height: "200px",
  marginTop: "0.5rem",
  borderRadius: "0.375rem",
};

// Add styles to ensure autocomplete appears above other elements
const autocompleteStyle = `
  .pac-container {
    z-index: 9999;
  }
`;

function AddressInput({
  labelTitle,
  placeholder = "Start typing an address...",
  className = "",
  disabled = false,
  name,
  control,
  rules,
  errors,
  countryCode: propCountryCode,
}: AddressInputProps) {
  const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [location, setLocation] = useState<google.maps.LatLng | null>(null);
  const [countryCode, setCountryCode] = useState<string | undefined>(propCountryCode);
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const { field } = useController({
    name,
    control,
    rules,
  });

  // Try to detect user's country if not provided in props
  useEffect(() => {
    if (propCountryCode) return;

    // First try to get country from browser language
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) {
      const country = browserLang.split('-')[1]?.toLowerCase();
      if (country) {
        setCountryCode(country);
        return;
      }
    }

    // If browser language doesn't work, try IP geolocation
    fetch('https://ipapi.co/json/')
      .then(response => response.json())
      .then(data => {
        if (data.country_code) {
          setCountryCode(data.country_code.toLowerCase());
        }
      })
      .catch(error => {
        console.error('Error detecting country:', error);
      });
  }, [propCountryCode]);

  // Handle initial value
  useEffect(() => {
    if (!isLoaded || !field.value) return;

    // If we already have location data in the field value, use it
    if (field.value.location) {
      const latLng = new google.maps.LatLng(
        field.value.location.lat,
        field.value.location.lng
      );
      setLocation(latLng);
    }
  }, [isLoaded, field.value]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize Google Places Autocomplete with country restriction if available
    autoCompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry"],
      ...(countryCode && {
        componentRestrictions: { country: countryCode },
      })
    });

    // Add listener for place selection
    autoCompleteRef.current.addListener("place_changed", () => {
      const place = autoCompleteRef.current?.getPlace();
      if (place?.formatted_address && place.geometry?.location) {
        const newAddress: Address = {
          formatted: place.formatted_address,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        };
        field.onChange(newAddress);
        setLocation(place.geometry.location);
      }
    });

    return () => {
      // Cleanup
      if (autoCompleteRef.current) {
        google.maps.event.clearInstanceListeners(autoCompleteRef.current);
      }
    };
  }, [isLoaded, field, countryCode]);

  if (!isLoaded) {
    return (
      <div>
        {labelTitle && <Label text={labelTitle} />}
        <div className="flex items-center gap-2">
          <ShadInput
            disabled
            placeholder="Loading Google Maps..."
            className={cn("focus:ring-0 focus:border-none", className)}
          />
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{autocompleteStyle}</style>
      {labelTitle && <Label text={labelTitle} />}
      <div className="relative">
        <ShadInput
          ref={inputRef}
          className={cn("focus:ring-0 focus:border-none", className)}
          placeholder={countryCode ? `Search in ${new Intl.DisplayNames([navigator.language], { type: 'region' }).of(countryCode.toUpperCase())}...` : placeholder}
          disabled={disabled}
          defaultValue={field.value?.formatted ?? ""}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
            const target = e.target as HTMLInputElement;
            // Only update the formatted address on manual input
            field.onChange({
              ...field.value,
              formatted: target.value
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
        />
      </div>
      {location && (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={{
            lat: location.lat(),
            lng: location.lng(),
          }}
          zoom={15}
          options={{
            draggable: false,
            zoomControl: false,
            scrollwheel: false,
            disableDoubleClickZoom: true,
            streetViewControl: false,
            mapTypeControl: false,
            clickableIcons: false,
          }}
        >
          <MarkerF
            position={{
              lat: location.lat(),
              lng: location.lng(),
            }}
          />
        </GoogleMap>
      )}
      <ErrorMessage
        errors={errors}
        name={field.name}
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
}

export default AddressInput; 