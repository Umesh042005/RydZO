/**
 * Google Routes / Directions Service
 * 
 * Calculates driving route, distance, and ETA between two points
 * using Google Maps DirectionsService.
 */

import { loadGoogleMaps, isGoogleMapsConfigured } from './googleMapsLoader';

/**
 * Calculate driving route between origin and destination.
 * 
 * @param {{lat: number, lng: number}|string} origin - Start point (coordinates or address)
 * @param {{lat: number, lng: number}|string} destination - End point (coordinates or address)
 * @returns {Promise<{available: boolean, distance: object, duration: object, ...}>}
 */
export async function calculateRoute(origin, destination) {
  if (!isGoogleMapsConfigured()) {
    return { available: false, error: 'Google Maps is not configured' };
  }

  try {
    const maps = await loadGoogleMaps();
    const directionsService = new maps.DirectionsService();

    return new Promise((resolve) => {
      directionsService.route(
        {
          origin,
          destination,
          travelMode: maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === 'OK' && result && result.routes[0]) {
            const route = result.routes[0];
            const leg = route.legs[0];
            resolve({
              available: true,
              distance: leg.distance,     // { text: '5.2 km', value: 5200 }
              duration: leg.duration,     // { text: '15 mins', value: 900 }
              startAddress: leg.start_address,
              endAddress: leg.end_address,
              polyline: route.overview_polyline,
              directionsResult: result    // Full result for DirectionsRenderer
            });
          } else {
            resolve({
              available: false,
              error: `Route calculation failed: ${status}`
            });
          }
        }
      );
    });
  } catch (err) {
    return { available: false, error: err.message || 'Failed to calculate route' };
  }
}

/**
 * Calculate route from user's current browser location to a destination.
 * Requests geolocation permission only when called.
 * 
 * @param {{lat: number, lng: number}} destination - Destination coordinates
 * @returns {Promise<{available: boolean, distance: object, duration: object, ...}>}
 */
export async function calculateRouteFromCurrentLocation(destination) {
  if (!navigator.geolocation) {
    return { available: false, error: 'Geolocation is not supported by this browser' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const origin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        const result = await calculateRoute(origin, destination);
        resolve(result);
      },
      (error) => {
        let message = 'Failed to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Your location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
          default:
            break;
        }
        resolve({ available: false, error: message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}
