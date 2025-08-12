'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getGoogleMapsLoader } from '@/utils/googleMapsLoader';
import { escapeHtml } from '@/utils/security';

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

interface GoogleMapsAPI {
  maps: {
    Map: new (element: Element, options: Record<string, unknown>) => object;
    Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
    InfoWindow: new (options: Record<string, unknown>) => GoogleInfoWindowInstance;
    DirectionsService: new () => GoogleDirectionsServiceInstance;
    DirectionsRenderer: new (options: Record<string, unknown>) => GoogleDirectionsRendererInstance;
    Size: new (width: number, height: number) => object;
    MapTypeId: { ROADMAP: string };
    TravelMode: { DRIVING: string };
  };
}

interface GoogleMarkerInstance {
  setMap: (map: object | null) => void;
  addListener: (event: string, callback: () => void) => void;
}

interface GoogleInfoWindowInstance {
  open: (map: object, marker: GoogleMarkerInstance) => void;
}

interface GoogleDirectionsServiceInstance {
  route: (request: Record<string, unknown>, callback: (response: unknown, status: string) => void) => void;
}

interface GoogleDirectionsRendererInstance {
  setMap: (map: object) => void;
  setDirections: (directions: Record<string, unknown>) => void;
}

declare const google: GoogleMapsAPI;

export default function BreweryMap({ breweries, route, center, onBreweryClick }: BreweryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<object | null>(null);
  const [markers, setMarkers] = useState<GoogleMarkerInstance[]>([]);
  const [directionsRenderer, setDirectionsRenderer] = useState<GoogleDirectionsRendererInstance | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = async () => {
      try {
        await getGoogleMapsLoader();
        
        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: center,
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
          
          const renderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            draggable: false,
            polylineOptions: {
              strokeColor: '#fb923c',
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

  const updateMarkers = useCallback(() => {
    if (!map) return;

    markers.forEach((marker: GoogleMarkerInstance) => marker.setMap(null));
    
    const newMarkers: GoogleMarkerInstance[] = [];

    breweries.forEach((brewery: Brewery) => {
      const isInRoute = route?.some((r: Brewery) => r.id === brewery.id);
      const routeIndex = route?.findIndex((r: Brewery) => r.id === brewery.id) ?? -1;
      
      let markerIcon: Record<string, unknown>;
      let markerLabel: Record<string, unknown> | undefined;
      
      if (isInRoute && routeIndex !== -1) {
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
        markerIcon = {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new google.maps.Size(24, 24)
        };
        markerLabel = undefined;
      }
      
      const marker = new google.maps.Marker({
        position: { lat: brewery.latitude, lng: brewery.longitude },
        map: map,
        title: brewery.name,
        icon: markerIcon,
        label: markerLabel,
        zIndex: isInRoute ? 1000 : 100
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

    const startMarker = new google.maps.Marker({
      position: center,
      map: map,
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

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  useEffect(() => {
    if (!map || !directionsRenderer || !route || route.length === 0) {
      if (directionsRenderer) {
        directionsRenderer.setDirections({routes: []});
      }
      return;
    }

    const directionsService = new google.maps.DirectionsService();

    const waypoints = route.slice(0, -1).map((brewery: Brewery) => ({
      location: { lat: brewery.latitude, lng: brewery.longitude },
      stopover: true
    }));

    const destination = route[route.length - 1];

    directionsService.route({
      origin: center,
      destination: { lat: destination.latitude, lng: destination.longitude },
      waypoints: waypoints,
      optimizeWaypoints: false,
      travelMode: google.maps.TravelMode.DRIVING,
    }, (response: unknown, status: string) => {
      if (status === 'OK' && response) {
        directionsRenderer.setDirections(response as Record<string, unknown>);
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