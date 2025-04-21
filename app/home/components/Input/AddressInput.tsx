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
import { useEffect, useRef, useState, useCallback } from "react";
import { APIProvider, Map, Marker, useMapsLibrary } from '@vis.gl/react-google-maps';
import React from "react";
import { Address } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { debounce } from "lodash";

interface AddressInputProps {
  labelTitle?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name: string;
  control: Control<any>;
  rules?: Record<string, any>;
  errors?: FieldErrors<FieldValues>;
}

const mapContainerStyle = {
  width: "100%",
  height: "200px",
  marginTop: "0.5rem",
  borderRadius: "0.375rem",
};

function CustomPlacesAutocomplete({ 
  inputRef, 
  onPlaceSelect 
}: { 
  inputRef: React.RefObject<HTMLInputElement>,
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void
}) {
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const places = useMapsLibrary('places');
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);

  useEffect(() => {
    if (!places) return;
    autocompleteService.current = new places.AutocompleteService();
    // Create a dummy div for PlacesService (required)
    const dummyElement = document.createElement('div');
    placesService.current = new places.PlacesService(dummyElement);
  }, [places]);

  const getPlacePredictions = useCallback(
    async (input: string) => {
      if (!autocompleteService.current || input.length < 3) {
        setPredictions([]);
        return;
      }

      const request: google.maps.places.AutocompletionRequest = {
        input
      };

      try {
        const response = await autocompleteService.current.getPlacePredictions(request);
        setPredictions(response.predictions);
        setShowPredictions(true);
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setPredictions([]);
      }
    },
    []
  );

  const handlePredictionClick = useCallback(async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    const request: google.maps.places.PlaceDetailsRequest = {
      placeId: prediction.place_id,
      fields: ['formatted_address', 'geometry', 'address_components']
    };

    placesService.current.getDetails(request, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        onPlaceSelect(place);
        if (inputRef.current) {
          inputRef.current.value = place.formatted_address || '';
        }
        setShowPredictions(false);
      }
    });
  }, [inputRef, onPlaceSelect]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [inputRef]);

  useEffect(() => {
    if (!inputRef.current) return;
    const ref = inputRef.current

    const handleInput = (e: Event) => {
      const input = (e.target as HTMLInputElement).value;
      getPlacePredictions(input);
    };

    const debouncedHandler = debounce(handleInput, 300);
    inputRef.current.addEventListener('input', debouncedHandler);

    return () => {
      if (ref) {
        ref.removeEventListener('input', debouncedHandler);
      }
    };
  }, [getPlacePredictions, inputRef]);

  useEffect(() => {
    if (!inputRef.current) return;
    const ref = inputRef.current

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showPredictions || predictions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < predictions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : -1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handlePredictionClick(predictions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowPredictions(false);
          setSelectedIndex(-1);
          break;
      }
    };

    ref.addEventListener('keydown', handleKeyDown);
    return () => {
      if (ref) {
        ref.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [showPredictions, predictions, selectedIndex, inputRef, handlePredictionClick]);

  // Reset selected index when predictions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [predictions]);

  return (
    <div className="relative">
      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((prediction, index) => (
            <div
              key={prediction.place_id}
              className={cn(
                "px-4 py-2 cursor-pointer text-sm",
                selectedIndex === index 
                  ? "bg-blue-100 hover:bg-blue-200" 
                  : "hover:bg-gray-100"
              )}
              onClick={() => handlePredictionClick(prediction)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {prediction.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressInput({
  labelTitle,
  placeholder = "Start typing an address...",
  className = "",
  disabled = false,
  name,
  control,
  rules,
  errors,
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const { field } = useController({
    name,
    control,
    rules,
  });

  // Handle initial value
  useEffect(() => {
    if (!field.value?.location) return;
    setLocation(field.value.location);
  }, [field.value]);

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    console.log("[AddressInput] place_changed event", place);
    if (place.formatted_address && place.geometry?.location) {
      // Parse address components
      const addressComponents = place.address_components || [];
      const streetNumber = addressComponents.find(c => c.types.includes('street_number'))?.long_name || '';
      const route = addressComponents.find(c => c.types.includes('route'))?.long_name || '';
      const subpremise = addressComponents.find(c => c.types.includes('subpremise'))?.long_name || '';
      const city = addressComponents.find(c => c.types.includes('postal_town') || c.types.includes('locality'))?.long_name || '';
      const county = addressComponents.find(c => c.types.includes('administrative_area_level_2'))?.long_name || '';
      const postcode = addressComponents.find(c => c.types.includes('postal_code'))?.long_name || '';

      // Construct line1 from subpremise (if exists), street number and route
      const line1Parts = [subpremise, streetNumber, route].filter(Boolean);
      const line1 = line1Parts.join(' ');

      const newAddress: Address = {
        formatted: place.formatted_address,
        line1,
        line2: '',  // Optional: Can be filled manually if needed
        line3: '',  // Optional: Can be filled manually if needed
        city,
        county,
        postcode,
        location: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
      };
      field.onChange(newAddress);
      setLocation(newAddress.location);
    }
  };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
      <div>
        {labelTitle && <Label text={labelTitle} />}
        <div className="relative">
          <ShadInput
            ref={inputRef}
            className={cn("focus:ring-0 focus:border-none", className)}
            placeholder={placeholder}
            disabled={disabled}
            defaultValue={field.value?.formatted ?? ""}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              const target = e.target as HTMLInputElement;
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
          <CustomPlacesAutocomplete 
            inputRef={inputRef}
            onPlaceSelect={handlePlaceSelect}
          />
        </div>
        {location && location.lat !== 0 && location.lng !== 0 && (
          <div style={mapContainerStyle}>
            <Map
              zoom={15}
              center={location}
              gestureHandling="none"
              disableDefaultUI={true}
            >
              <Marker position={location} />
            </Map>
          </div>
        )}
        <ErrorMessage
          errors={errors}
          name={field.name}
          render={({ message }) => InputError({ message })}
        />
      </div>
    </APIProvider>
  );
}

export default AddressInput; 