/**
 * Google Geocoding Service
 * 
 * Provides address-to-coordinates (forward) and
 * coordinates-to-address (reverse) geocoding.
 */

import { loadGoogleMaps, isGoogleMapsConfigured } from './googleMapsLoader';

/**
 * Convert a text address to coordinates.
 * 
 * @param {string} address - Human-readable address
 * @returns {Promise<{address: string, coordinates: {lat: number, lng: number}}>}
 */
export async function geocodeAddress(address) {
  if (!isGoogleMapsConfigured()) {
    return { error: 'Google Maps is not configured' };
  }

  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        resolve({
          address: results[0].formatted_address,
          coordinates: {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          }
        });
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Convert coordinates to a human-readable address.
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{address: string, coordinates: {lat: number, lng: number}}>}
 */
export async function reverseGeocode(lat, lng) {
  if (!isGoogleMapsConfigured()) {
    return { error: 'Google Maps is not configured' };
  }

  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        resolve({
          address: results[0].formatted_address,
          coordinates: { lat, lng }
        });
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`));
      }
    });
  });
}
