import { NextRequest, NextResponse } from 'next/server';

interface BreweryPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address_1?: string;
  city: string;
  state_province: string;
}

interface RouteRequest {
  startLat: number;
  startLng: number;
  breweries: BreweryPoint[];
  maxStops: number;
}

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

//Nearst Neighbors Algo
function optimizeRoute(startLat: number, startLng: number, breweries: BreweryPoint[], maxStops: number): BreweryPoint[] {
  if (breweries.length === 0) return [];
  
  const route: BreweryPoint[] = [];
  const remaining = [...breweries];
  let currentLat = startLat;
  let currentLng = startLng;
  
  while (route.length < maxStops && remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(
      currentLat, 
      currentLng, 
      remaining[0].latitude, 
      remaining[0].longitude
    );
    
    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(
        currentLat, 
        currentLng, 
        remaining[i].latitude, 
        remaining[i].longitude
      );
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    const nextBrewery = remaining.splice(nearestIndex, 1)[0];
    route.push(nextBrewery);
    currentLat = nextBrewery.latitude;
    currentLng = nextBrewery.longitude;
  }
  
  return route;
}

export async function POST(request: NextRequest) {
  try {
    const body: RouteRequest = await request.json();
    const { startLat, startLng, breweries, maxStops } = body;
    
    if (!startLat || !startLng || !breweries || !Array.isArray(breweries)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }
    
    const optimizedRoute = optimizeRoute(startLat, startLng, breweries, maxStops || 5);
    
    let totalDistance = 0;
    let currentLat = startLat;
    let currentLng = startLng;
    
    for (const brewery of optimizedRoute) {
      totalDistance += calculateDistance(currentLat, currentLng, brewery.latitude, brewery.longitude);
      currentLat = brewery.latitude;
      currentLng = brewery.longitude;
    }
    
    return NextResponse.json({
      route: optimizedRoute,
      totalDistance: Math.round(totalDistance * 100) / 100,
      estimatedTime: Math.round(totalDistance * 2 * 100) / 100 // 2 min per mile estimate
    });
    
  } catch (error) {
    console.error('Error optimizing route:', error);
    return NextResponse.json(
      { error: 'Failed to optimize route' },
      { status: 500 }
    );
  }
}