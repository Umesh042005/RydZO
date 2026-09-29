/**
 * OpenStreetMap / Nominatim Geocoding Service
 * 
 * Provides address-to-coordinates (forward) and
 * coordinates-to-address (reverse) geocoding via Nominatim API.
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Convert a text address to coordinates using Nominatim.
 * 
 * @param {string} address - Human-readable address
 * @returns {Promise<{address: string, coordinates: {lat: number, lng: number}}>}
 */
export async function geocodeAddress(address) {
  if (!address || address.trim().length === 0) {
    throw new Error('Address is required for geocoding');
  }

  const params = new URLSearchParams({
    q: address.trim(),
    format: 'json',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'in'
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en'
    }
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No coordinates found for the given address');
  }

  const item = data[0];
  const lat = parseFloat(item.lat);
  const lng = parseFloat(item.lon);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid coordinates received from geocoding service');
  }

  return {
    address: item.display_name,
    coordinates: { lat, lng }
  };
}

/**
 * Convert coordinates to a human-readable address using Nominatim reverse geocoding.
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{address: string, coordinates: {lat: number, lng: number}}>}
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    throw new Error('Valid latitude and longitude are required');
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1'
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en'
    }
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data || (!data.display_name && !data.name)) {
    throw new Error('No address found for the given coordinates');
  }

  return {
    address: data.display_name || data.name,
    coordinates: {
      lat: Number(lat),
      lng: Number(lng)
    }
  };
}

const osmGeocodingService = {
  geocodeAddress,
  reverseGeocode
};

export default osmGeocodingService;
