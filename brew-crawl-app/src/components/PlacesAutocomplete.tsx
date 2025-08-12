'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { getGoogleMapsLoader } from '@/utils/googleMapsLoader';

interface PlacesAutocompleteProps {
  placeholder?: string;
  disabled?: boolean;
  onPlaceSelect?: (place: { lat: number; lng: number; address: string }) => void;
}

export interface PlacesAutocompleteRef {
  onPlaceSelect: (callback: (place: { lat: number; lng: number; address: string }) => void) => void;
}

const PlacesAutocomplete = forwardRef<PlacesAutocompleteRef, PlacesAutocompleteProps>(
  ({ placeholder = "Enter city, address, or zip code", disabled = false, onPlaceSelect }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const callbackRef = useRef<((place: { lat: number; lng: number; address: string }) => void) | null>(null);

    // Set the callback
    useImperativeHandle(ref, () => ({
      onPlaceSelect: (callback: (place: { lat: number; lng: number; address: string }) => void) => {
        callbackRef.current = callback;
      }
    }));

    // Also support direct prop callback
    useEffect(() => {
      if (onPlaceSelect) {
        callbackRef.current = onPlaceSelect;
      }
    }, [onPlaceSelect]);

    useEffect(() => {
      const initializeAutocomplete = async () => {
        try {
          await getGoogleMapsLoader();
          
          if (inputRef.current) {
            const autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
              types: ['establishment', 'geocode'],
              fields: ['place_id', 'formatted_address', 'geometry', 'name'],
            });

            // Prevent form submission on Enter key
            inputRef.current.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            });

            // Listen for place selection
            autocompleteInstance.addListener('place_changed', () => {
              const place = autocompleteInstance.getPlace();
              console.log('Place selected:', place);
              
              if (place.geometry && place.geometry.location && callbackRef.current) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const address = place.formatted_address || place.name || '';
                
                console.log('Calling callback with:', { lat, lng, address });
                callbackRef.current({ lat, lng, address });
              } else {
                console.log('No geometry or callback available');
              }
            });

            console.log('Autocomplete initialized');
          }
        } catch (error) {
          console.error('Error loading Google Places:', error);
        }
      };

      if (!disabled) {
        initializeAutocomplete();
      }
    }, [disabled]);

    return (
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    );
  }
);

PlacesAutocomplete.displayName = 'PlacesAutocomplete';

export default PlacesAutocomplete;