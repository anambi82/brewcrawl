import { NextRequest, NextResponse } from 'next/server';

export interface Brewery {
  id: string;
  name: string;
  brewery_type: string;
  address_1?: string;
  address_2?: string;
  address_3?: string;
  city: string;
  state_province: string;
  state: string;
  postal_code?: string;
  country: string;
  longitude: number;
  latitude: number;
  phone?: string;
  website_url?: string;
  street?: string;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Radius of Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latitude = parseFloat(searchParams.get('lat') || '0');
  const longitude = parseFloat(searchParams.get('lng') || '0');
  const radius = parseInt(searchParams.get('radius') || '10');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!latitude || !longitude) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  try {
    // Search breweries by distance from Open Brewery DB
    const response = await fetch(
      `https://api.openbrewerydb.org/v1/breweries?per_page=100&by_dist=${latitude},${longitude}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch breweries');
    }

    const breweries: Brewery[] = await response.json();

    // Filter breweries within radius and add distance
    const nearbyBreweries = breweries
      .filter(brewery => brewery.latitude && brewery.longitude) // Already numbers, no need to parse
      .map(brewery => {
        const distance = calculateDistance(
          latitude,
          longitude,
          brewery.latitude,
          brewery.longitude
        );
        return { ...brewery, distance };
      })
      .filter(brewery => brewery.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return NextResponse.json({
      breweries: nearbyBreweries,
      total: nearbyBreweries.length
    });

  } catch (error) {
    console.error('Error fetching breweries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch breweries' },
      { status: 500 }
    );
  }
}