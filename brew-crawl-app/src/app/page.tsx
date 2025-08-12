'use client';

import React, { useState, useEffect } from 'react';
import BreweryMap from '@/components/BreweryMap';
import PlacesAutocomplete from '@/components/PlacesAutocomplete';
import { sanitizeForUrl, validateCoordinates } from '@/utils/security';

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

  const handlePlaceSelect = (place: {lat: number; lng: number; address: string}) => {
    console.log('handlePlaceSelect called with:', place);
    setLocation({ lat: place.lat, lng: place.lng });
    setSelectedPlace(place);
    setUseCurrentLocation(false);
  };

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

  const exportToGoogleMaps = () => {
    if (!location || route.length === 0) return;

    const waypoints = route.map(brewery => 
      `${brewery.latitude},${brewery.longitude}`
    ).join('|');

    const googleMapsUrl = `https://www.google.com/maps/dir/${location.lat},${location.lng}/${waypoints}`;
    
    window.open(googleMapsUrl, '_blank');
  };

  const exportToGoogleMapsWithNames = () => {
    if (!location || route.length === 0) return;

    if (!validateCoordinates(location.lat, location.lng)) {
      alert('Invalid starting location coordinates');
      return;
    }

    const waypoints = route.map(brewery => {
      const address = `${brewery.name}, ${brewery.address_1 || ''} ${brewery.city}, ${brewery.state_province}`;
      return sanitizeForUrl(address);
    }).join('/');

    const googleMapsUrl = `https://www.google.com/maps/dir/Current+Location/${waypoints}`;
    
    window.open(googleMapsUrl, '_blank');
  };

  const shareRoute = () => {
    if (!location || route.length === 0) return;

    const routeText = `🍺 My Brew Journey Route:\n\n` +
      route.map((brewery, index) => 
        `${index + 1}. ${brewery.name}\n   📍 ${brewery.city}, ${brewery.state_province}`
      ).join('\n\n') +
      `\n\n🎯 Total stops: ${route.length}\n📱 Created with Brew Journey`;

    if (navigator.share) {
      navigator.share({
        title: 'My Brew Journey Route',
        text: routeText,
      });
    } else {
      navigator.clipboard.writeText(routeText).then(() => {
        alert('Route copied to clipboard! 📋');
      });
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (location) {
      searchBreweries();
    }
  }, [location, searchRadius]);

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center bg-white p-8 rounded-xl shadow-xl max-w-md w-full mx-4 border border-orange-100">
          <div className="text-6xl mb-4">🍺</div>
          <h1 className="text-4xl font-bold mb-6 text-amber-900">Brew Journey</h1>
          <p className="text-amber-700 mb-6">Craft your brewery adventure</p>

          <div className="space-y-4">
            <p className="text-amber-800 font-medium">Choose your starting point:</p>
            
            <button
              onClick={getCurrentLocation}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
            >
              📍 Use My Current Location
            </button>
            
            <div className="text-amber-600">or</div>
            
            <div className="space-y-3 text-orange-800">
              <PlacesAutocomplete 
                placeholder="Search for a city, address, or place"
                disabled={loading}
                onPlaceSelect={handlePlaceSelect}
              />
              
              <p className="text-xs text-amber-600">
                Start typing to see suggestions, then click to select
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <style dangerouslySetInnerHTML={{
        __html: `
          .brew-slider::-webkit-slider-thumb {
            appearance: none;
            height: 28px;
            width: 28px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ea580c, #fb923c);
            border: 3px solid #ffffff;
            box-shadow: 0 2px 8px rgba(234, 88, 12, 0.4);
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }
          
          .brew-slider::-webkit-slider-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 4px 16px rgba(234, 88, 12, 0.5);
          }
          
          .brew-slider.target-slider::-webkit-slider-thumb::before {
            content: '🎯';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 14px;
          }
          
          .brew-slider.beer-slider::-webkit-slider-thumb::before {
            content: '🍺';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 14px;
          }
          
          .brew-slider::-moz-range-thumb {
            height: 28px;
            width: 28px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ea580c, #fb923c);
            border: 3px solid #ffffff;
            box-shadow: 0 2px 8px rgba(234, 88, 12, 0.4);
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }
          
          .brew-slider::-moz-range-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 4px 16px rgba(234, 88, 12, 0.5);
          }
          
          .brew-slider::-moz-range-track {
            background: transparent;
            border: none;
          }
        `
      }} />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🍺</div>
          <h1 className="text-5xl font-bold text-amber-900 mb-2">
            Brew Journey
          </h1>
          <p className="text-amber-700 text-lg">Craft your perfect brewery adventure</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-xl p-6 border border-orange-100">
              <h2 className="text-2xl font-semibold mb-6 text-amber-900 flex items-center gap-2">
                <span>🗺️</span>
                Plan Your Journey
              </h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📍</span>
                    <label className="block text-sm font-medium text-amber-900">
                      Starting Point
                    </label>
                  </div>
                  <div className="text-sm text-amber-700 mb-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
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
                    className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-2 rounded-lg transition duration-200 border border-orange-300"
                  >
                    🔄 Change Location
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-semibold text-amber-900 mb-1">
                      Search Radius
                    </label>
                    <p className="text-sm text-amber-700 mb-3">How far to search for breweries</p>
                  </div>
                  
                  <div className="relative bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                      className="brew-slider target-slider w-full h-4 bg-orange-100 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-3 focus:ring-orange-300"
                      style={{
                        background: `linear-gradient(to right, #fb923c 0%, #fb923c ${((searchRadius - 5) / (50 - 5)) * 100}%, #fed7aa ${((searchRadius - 5) / (50 - 5)) * 100}%, #fed7aa 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-amber-600 mt-2">
                      <span>5 mi</span>
                      <span>50 mi</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-lg font-bold text-orange-600 bg-orange-100 px-4 py-2 rounded-full border-2 border-orange-300">
                      <span>🎯</span>
                      <span>{searchRadius} miles</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-semibold text-amber-900 mb-1">
                      Brewery Stops
                    </label>
                    <p className="text-sm text-amber-700 mb-3">Perfect crawl size</p>
                  </div>
                  
                  <div className="relative bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <input
                      type="range"
                      min="2"
                      max="10"
                      value={maxStops}
                      onChange={(e) => setMaxStops(parseInt(e.target.value))}
                      className="brew-slider beer-slider w-full h-4 bg-amber-100 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-3 focus:ring-amber-300"
                      style={{
                        background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((maxStops - 2) / (10 - 2)) * 100}%, #fde68a ${((maxStops - 2) / (10 - 2)) * 100}%, #fde68a 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-amber-600 mt-2">
                      <span>2 stops</span>
                      <span>10 stops</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-lg font-bold text-amber-600 bg-amber-100 px-4 py-2 rounded-full border-2 border-amber-300">
                      <span>🍺</span>
                      <span>{maxStops} stops</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={optimizeRoute}
                  disabled={loading || breweries.length === 0}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Planning Journey...
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      Plan My Brew Journey
                    </>
                  )}
                </button>

                <div className="text-sm text-amber-700 text-center bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <span className="font-medium">🏭 {breweries.length}</span> breweries discovered
                </div>
              </div>

              {route.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    Your Brew Journey Route
                  </h3>
                  
                  <div className="mb-4">
                    <button
                      onClick={exportToGoogleMapsWithNames}
                      className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
                    >
                      <span>🗺️</span>
                      Open in Maps
                    </button>
                  </div>

                  <div className="space-y-3">
                    {route.map((brewery, index) => (
                      <div key={brewery.id} className="text-sm bg-white p-3 rounded-lg border border-orange-100">
                        <div className="flex items-center gap-2">
                          <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-medium text-amber-900">
                            {brewery.name}
                          </span>
                        </div>
                        <div className="text-amber-700 ml-8 text-xs">
                          📍 {brewery.city}, {brewery.state_province}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-xl p-6 border border-orange-100">
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