'use client';

import React, { useState, useEffect } from 'react';
import BreweryMap from '@/components/BreweryMap';
import PlacesAutocomplete from '@/components/PlacesAutocomplete';

interface Brewery {
  id: string;
  name: string;
  brewery_type: string;
  latitude: number;
  longitude: number;
  address_1?: string;
  city: string;
  state_province: string;
  distance?: number;
}

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [breweries, setBreweries] = useState<Brewery[]>([]);
  const [route, setRoute] = useState<Brewery[]>([]);
  const [loading, setLoading] = useState(false);
  const [maxStops, setMaxStops] = useState(5);
  const [searchRadius, setSearchRadius] = useState(10);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<{lat: number; lng: number; address: string} | null>(null);

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setUseCurrentLocation(true);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your current location. Please use the search instead.');
          setUseCurrentLocation(false);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser. Please use the search instead.');
      setUseCurrentLocation(false);
    }
  };

  // Handle place selection from autocomplete
  const handlePlaceSelect = (place: {lat: number; lng: number; address: string}) => {
    console.log('handlePlaceSelect called with:', place);
    setLocation({ lat: place.lat, lng: place.lng });
    setSelectedPlace(place);
    setUseCurrentLocation(false);
  };

  // Search for breweries
  const searchBreweries = async () => {
    if (!location) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/breweries/search?lat=${location.lat}&lng=${location.lng}&radius=${searchRadius}&limit=50`
      );
      
      if (!response.ok) throw new Error('Failed to search breweries');
      
      const data = await response.json();
      setBreweries(data.breweries);
    } catch (error) {
      console.error('Error searching breweries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Optimize route
  const optimizeRoute = async () => {
    if (!location || breweries.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/breweries/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLat: location.lat,
          startLng: location.lng,
          breweries,
          maxStops
        })
      });

      if (!response.ok) throw new Error('Failed to optimize route');

      const data = await response.json();
      setRoute(data.route);
    } catch (error) {
      console.error('Error optimizing route:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Search breweries when location or radius changes
  useEffect(() => {
    if (location) {
      searchBreweries();
    }
  }, [location, searchRadius]);

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">🍺 Brewery Crawl Planner</h1>
          
          <div className="space-y-4">
            <p className="text-gray-600">Choose your starting point:</p>
            
            <button
              onClick={getCurrentLocation}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              📍 Use My Current Location
            </button>
            
            <div className="text-gray-500">or</div>
            
            <div className="space-y-3">
              <PlacesAutocomplete 
                placeholder="Search for a city, address, or place"
                disabled={loading}
                onPlaceSelect={handlePlaceSelect}
              />
              
              <p className="text-xs text-gray-500">
                Start typing to see suggestions, then click to select
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          🍺 Brewery Crawl Planner
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Plan Your Crawl</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Starting Point
                  </label>
                  <div className="text-sm text-gray-600 mb-2">
                    {useCurrentLocation ? 
                      '📍 Using your current location' : 
                      `📍 ${selectedPlace?.address || 'Custom location'}`
                    }
                  </div>
                  <button
                    onClick={() => {
                      setLocation(null);
                      setBreweries([]);
                      setRoute([]);
                      setSelectedPlace(null);
                    }}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition duration-200"
                  >
                    Change Location
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Radius (miles)
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600">{searchRadius} miles</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Stops
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={maxStops}
                    onChange={(e) => setMaxStops(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600">{maxStops} breweries</div>
                </div>

                <button
                  onClick={optimizeRoute}
                  disabled={loading || breweries.length === 0}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                  {loading ? 'Planning...' : 'Plan Route'}
                </button>

                <div className="text-sm text-gray-600">
                  Found {breweries.length} breweries nearby
                </div>
              </div>

              {/* Route Summary */}
              {route.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Your Route</h3>
                  <div className="space-y-2">
                    {route.map((brewery, index) => (
                      <div key={brewery.id} className="text-sm">
                        <span className="font-medium text-green-700">
                          {index + 1}. {brewery.name}
                        </span>
                        <div className="text-green-600">
                          {brewery.city}, {brewery.state_province}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-96 lg:h-[600px]">
                <BreweryMap
                  breweries={breweries}
                  route={route}
                  center={location}
                  onBreweryClick={(brewery) => {
                    console.log('Clicked brewery:', brewery.name);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}