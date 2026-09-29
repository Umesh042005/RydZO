/**
 * Google Maps JavaScript API Loader
 * 
 * Loads the Google Maps JS API dynamically from REACT_APP_GOOGLE_MAPS_API_KEY.
 * Prevents duplicate script loading and provides readiness checks.
 */

let googleMapsPromise = null;

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

/**
 * Check if the Google Maps API key is configured.
 * @returns {boolean}
 */
export function isGoogleMapsConfigured() {
  return !!(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim().length > 0);
}

/**
 * Load the Google Maps JavaScript API.
 * Returns the google.maps namespace once loaded.
 * Prevents duplicate script tags.
 * 
 * @returns {Promise<typeof google.maps>}
 */
export function loadGoogleMaps() {
  // Return existing promise if already loading/loaded
  if (googleMapsPromise) return googleMapsPromise;

  // Already loaded by another mechanism
  if (window.google && window.google.maps) {
    googleMapsPromise = Promise.resolve(window.google.maps);
    return googleMapsPromise;
  }

  if (!isGoogleMapsConfigured()) {
    return Promise.reject(
      new Error('Google Maps API key is not configured. Set REACT_APP_GOOGLE_MAPS_API_KEY in .env')
    );
  }

  // Prevent duplicate script tags
  const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existingScript) {
    googleMapsPromise = new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => {
        if (window.google && window.google.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps failed to initialize'));
        }
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Google Maps script'));
      });
      // If already loaded
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      }
    });
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps script loaded but google.maps is not available'));
      }
    };

    script.onerror = () => {
      googleMapsPromise = null; // Allow retry
      reject(new Error('Failed to load Google Maps script. Check your API key and network connection.'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
