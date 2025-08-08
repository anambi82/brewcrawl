import { Loader } from '@googlemaps/js-api-loader';

// Single loader instance with all required libraries
let loaderInstance: Loader | null = null;
let loadPromise: Promise<typeof google> | null = null;

export const getGoogleMapsLoader = (): Promise<typeof google> => {
  if (loadPromise) {
    // Return existing promise if already loading/loaded
    return loadPromise;
  }

  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places', 'geometry'] // Include all libraries we need
    });
  }

  loadPromise = loaderInstance.load();
  return loadPromise;
};