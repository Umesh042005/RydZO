/**
 * OpenStreetMap / OSRM Routes & Directions Service
 * 
 * Calculates driving route, distance, ETA, and geometry between two points
 * using the OSRM (Open Source Routing Machine) public routing API.
 */

import { geocodeAddress } from './osmGeocodingService';

const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Format distance in meters to user-friendly string.
 * @param {number} meters 
 * @returns {string} e.g. "5.2 km" or "850 m"
 */
function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format duration in seconds to user-friendly string.
 * @param {number} seconds 
 * @returns {string} e.g. "1 hr 15 mins" or "14 mins"
 */
function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 1) return '1 min';
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} hr ${mins} mins` : `${hours} hr`;
  }
  return `${totalMinutes} mins`;
}

/**
 * Resolve coordinates from input (either { lat, lng } or address string).
 * @param {{lat: number, lng: number}|string} point 
 * @returns {Promise<{lat: number, lng: number}>}
 */
async function resolvePoint(point) {
  if (typeof point === 'string') {
    const res = await geocodeAddress(point);
    return res.coordinates;
  }
  if (point && point.lat != null && point.lng != null) {
    return {
      lat: Number(point.lat),
      lng: Number(point.lng)
    };
  }
  throw new Error('Invalid coordinates or address');
}

/**
 * Calculate driving route between origin and destination.
 * 
 * @param {{lat: number, lng: number}|string} origin - Start point (coordinates or address)
 * @param {{lat: number, lng: number}|string} destination - End point (coordinates or address)
 * @returns {Promise<{available: boolean, distance: object, duration: object, coordinates: Array<[number, number]>, directionsResult: object, error?: string}>}
 */
export async function calculateRoute(origin, destination) {
  try {
    const origCoords = await resolvePoint(origin);
    const destCoords = await resolvePoint(destination);

    // OSRM coordinates are specified as {longitude},{latitude}
    const coordsStr = `${origCoords.lng},${origCoords.lat};${destCoords.lng},${destCoords.lat}`;
    const url = `${OSRM_BASE_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM routing failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
      return {
        available: false,
        error: data.message || 'No driving route found between these locations'
      };
    }

    const primaryRoute = data.routes[0];
    const distanceMeters = primaryRoute.distance;
    const durationSeconds = primaryRoute.duration;

    // Convert GeoJSON [lon, lat] coordinates to Leaflet [lat, lon] points
    const latLngCoordinates = (primaryRoute.geometry?.coordinates || []).map(([lon, lat]) => [lat, lon]);

    return {
      available: true,
      distance: {
        text: formatDistance(distanceMeters),
        value: Math.round(distanceMeters)
      },
      duration: {
        text: formatDuration(durationSeconds),
        value: Math.round(durationSeconds)
      },
      coordinates: latLngCoordinates,
      directionsResult: {
        coordinates: latLngCoordinates,
        distance: formatDistance(distanceMeters),
        duration: formatDuration(durationSeconds),
        origin: origCoords,
        destination: destCoords
      }
    };
  } catch (err) {
    console.warn('OSM calculateRoute error:', err);
    return {
      available: false,
      error: err.message || 'Failed to calculate route'
    };
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

const osmRoutesService = {
  calculateRoute,
  calculateRouteFromCurrentLocation
};

export default osmRoutesService;
