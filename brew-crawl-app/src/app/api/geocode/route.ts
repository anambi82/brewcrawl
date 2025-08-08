import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Address parameter is required' },
      { status: 400 }
    );
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    );
  }

  try {
    console.log('Geocoding address:', address);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      console.error('Google API response not ok:', response.status);
      throw new Error(`Google API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Google API response:', data);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      return NextResponse.json({
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id
      });
    } else {
      console.error('Google API status:', data.status);
      return NextResponse.json(
        { error: `Geocoding failed: ${data.status}` },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    );
  }
}