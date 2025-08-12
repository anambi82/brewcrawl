import { Loader } from '@googlemaps/js-api-loader';

let loaderInstance: Loader | null = null;
let loadPromise: Promise<typeof google> | null = null;

export const getGoogleMapsLoader = (): Promise<typeof google> => {
  if (loadPromise) {
    return loadPromise;
  }

  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places', 'geometry'], 
      language: 'en',
      region: 'US'
    });
  }

  loadPromise = loaderInstance.load();
  return loadPromise;
};