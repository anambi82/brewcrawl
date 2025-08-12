export function escapeHtml(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;");
}


export function sanitizeForUrl(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters and encode
  const cleaned = input.replace(/[<>\"'&]/g, '');
  return encodeURIComponent(cleaned);
}

export function sanitizeNumeric(input: string | number, min?: number, max?: number): number {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid numeric input');
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`Value must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`Value must be at most ${max}`);
  }
  
  return num;
}

export function validateCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    isFinite(lat) && isFinite(lng)
  );
}


export function sanitizeBreweryData(brewery: any) {
  return {
    id: escapeHtml(String(brewery.id || '')),
    name: escapeHtml(String(brewery.name || 'Unknown Brewery')),
    brewery_type: escapeHtml(String(brewery.brewery_type || '')),
    address_1: escapeHtml(String(brewery.address_1 || '')),
    city: escapeHtml(String(brewery.city || '')),
    state_province: escapeHtml(String(brewery.state_province || '')),
    latitude: sanitizeNumeric(brewery.latitude, -90, 90),
    longitude: sanitizeNumeric(brewery.longitude, -180, 180),
    phone: escapeHtml(String(brewery.phone || '')),
    website_url: brewery.website_url ? sanitizeForUrl(String(brewery.website_url)) : '',
  };
}