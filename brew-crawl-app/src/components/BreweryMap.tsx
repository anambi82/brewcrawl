'use client';

import { useEffect, useRef, useState } from 'react';
import { getGoogleMapsLoader } from '@/utils/googleMapsLoader';
import { escapeHtml } from '@/utils/security';

// Type declaration for Google Maps (if @types/google.maps doesn't work)
declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element, opts?: MapOptions);
    }
    class Marker {
      constructor(opts?: MarkerOptions);
      addListener(eventName: string, handler: Function): void;
      setMap(map: Map | null): void;
    }
    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map: Map, anchor?: Marker): void;
    }
    class DirectionsService {
      route(request: DirectionsRequest, callback: (response: DirectionsResult | null, status: DirectionsStatus) => void): void;
    }
    class DirectionsRenderer {
      constructor(opts?: DirectionsRendererOptions);
      setMap(map: Map): void;
      setDirections(directions: DirectionsResult): void;
    }
    namespace places {
      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(eventName: string, handler: Function): void;
        getPlace(): PlaceResult;
      }
      interface AutocompleteOptions {
        types?: string[];
        fields?: string[];
      }
      interface PlaceResult {
        place_id?: string;
        formatted_address?: string;
        name?: string;
        geometry?: {
          location?: {
            lat(): number;
            lng(): number;
          };
        };
      }
    }
    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      mapTypeId?: MapTypeId;
      styles?: MapTypeStyle[];
    }
    interface MarkerOptions {
      position?: LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: string | Icon;
      label?: string | MarkerLabel;
      zIndex?: number;
    }
    interface InfoWindowOptions {
      content?: string;
    }
    interface DirectionsRendererOptions {
      suppressMarkers?: boolean;
      draggable?: boolean;
      polylineOptions?: {
        strokeColor?: string;
        strokeWeight?: number;
        strokeOpacity?: number;
      };
    }
    interface DirectionsRequest {
      origin: LatLngLiteral;
      destination: LatLngLiteral;
      waypoints?: DirectionsWaypoint[];
      optimizeWaypoints?: boolean;
      travelMode: TravelMode;
    }
    interface DirectionsWaypoint {
      location: LatLngLiteral;
      stopover: boolean;
    }
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    interface Icon {
      url: string;
      scaledSize: Size;
    }
    interface MarkerLabel {
      text: string;
      color: string;
      fontWeight: string;
      fontSize?: string;
    }
    enum MapTypeId {
      ROADMAP = 'roadmap'
    }
    enum TravelMode {
      DRIVING = 'DRIVING'
    }
    type DirectionsStatus = string;
    type DirectionsResult = any;
    type MapTypeStyle = any;
    class Size {
      constructor(width: number, height: number);
    }
  }
}

interface Brewery {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address_1?: string;
  city: string;
  state_province: string;
  distance?: number;
}

interface BreweryMapProps {
  breweries: Brewery[];
  route?: Brewery[];
  center: { lat: number; lng: number };
  onBreweryClick?: (brewery: Brewery) => void;
}

export default function BreweryMap({ breweries, route, center, onBreweryClick }: BreweryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = async () => {
      try {
        await getGoogleMapsLoader();
        
        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center,
            zoom: 12,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          });
          
          setMap(mapInstance);
          
          // Initialize directions renderer with suppressed markers
          const renderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true, // This prevents duplicate markers
            draggable: false,
            polylineOptions: {
              strokeColor: '#fb923c', // Orange route line
              strokeWeight: 4,
              strokeOpacity: 0.8
            }
          });
          renderer.setMap(mapInstance);
          setDirectionsRenderer(renderer);
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initializeMap();
  }, [center]);

  // Update brewery markers
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    
    const newMarkers: google.maps.Marker[] = [];

    // Add brewery markers
    breweries.forEach((brewery) => {
      const isInRoute = route?.some(r => r.id === brewery.id);
      const routeIndex = route?.findIndex(r => r.id === brewery.id) ?? -1;
      
      // Choose marker style based on route status
      let markerIcon;
      let markerLabel;
      
      if (isInRoute && routeIndex !== -1) {
        // Brewery is in the planned route - use numbered red markers
        markerIcon = {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        };
        markerLabel = {
          text: (routeIndex + 1).toString(),
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px'
        };
      } else {
        // Brewery not in route - use smaller blue markers
        markerIcon = {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new google.maps.Size(24, 24)
        };
        markerLabel = undefined;
      }
      
      const marker = new google.maps.Marker({
        position: { lat: brewery.latitude, lng: brewery.longitude },
        map,
        title: brewery.name,
        icon: markerIcon,
        label: markerLabel,
        zIndex: isInRoute ? 1000 : 100 // Route markers appear on top
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; max-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #000000 !important;">${escapeHtml(brewery.name)}</h3>
            ${brewery.address_1 ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">${escapeHtml(brewery.address_1)}</p>` : ''}
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">${escapeHtml(brewery.city)}, ${escapeHtml(brewery.state_province)}</p>
            ${brewery.distance ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #2563eb; font-weight: 500;">📍 ${brewery.distance.toFixed(1)} miles away</p>` : ''}
            ${isInRoute && routeIndex !== -1 ? `<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 6px 8px; margin-top: 8px;"><p style="margin: 0; font-size: 12px; color: #92400e; font-weight: 600;">🎯 Stop #${routeIndex + 1} on your route</p></div>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        if (onBreweryClick) {
          onBreweryClick(brewery);
        }
      });

      newMarkers.push(marker);
    });

    // Add starting point marker
    const startMarker = new google.maps.Marker({
      position: center,
      map,
      title: 'Starting Point',
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      },
      label: {
        text: 'START',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '10px'
      }
    });

    newMarkers.push(startMarker);
    setMarkers(newMarkers);
  }, [map, breweries, route, center, onBreweryClick]);

  // Draw route
  useEffect(() => {
    if (!map || !directionsRenderer || !route || route.length === 0) {
      // Clear any existing route when no route is provided
      if (directionsRenderer) {
        directionsRenderer.setDirections({routes: []});
      }
      return;
    }

    const directionsService = new google.maps.DirectionsService();

    // Create waypoints from route
    const waypoints = route.slice(0, -1).map(brewery => ({
      location: { lat: brewery.latitude, lng: brewery.longitude },
      stopover: true
    }));

    const destination = route[route.length - 1];

    directionsService.route({
      origin: center,
      destination: { lat: destination.latitude, lng: destination.longitude },
      waypoints,
      optimizeWaypoints: false, // We've already optimized
      travelMode: google.maps.TravelMode.DRIVING,
    }, (response, status) => {
      if (status === 'OK' && response) {
        directionsRenderer.setDirections(response);
      } else {
        console.error('Directions request failed:', status);
      }
    });
  }, [map, directionsRenderer, route, center]);

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}