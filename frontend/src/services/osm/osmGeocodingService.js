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
export async function geocodeAddress(address, { settlementOnly = false } = {}) {
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
  // Restrict to cities/towns/villages so a lone word cannot match a random street or shop
  if (settlementOnly) params.set('featureType', 'settlement');

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

// Address -> coordinates results, kept per address so each page view does not re-query
// Nominatim (its usage policy allows about 1 request per second).
const geocodeCache = new Map();
const GEOCODE_CACHE_PREFIX = 'rydzo:geocode:';

// Leading words of Indian addresses that are not place names
const GENERIC_ADDRESS_WORDS = new Set([
  'near', 'opp', 'opposite', 'behind', 'beside', 'front', 'infront', 'next', 'current', 'location',
  'house', 'flat', 'plot', 'road', 'street', 'lane', 'gali', 'sector', 'ward', 'block',
  'main', 'new', 'old', 'the', 'shop', 'building', 'colony', 'nagar'
]);

/**
 * Like geocodeAddress, but cached in memory and sessionStorage.
 * Resolves to null instead of throwing when the address cannot be found.
 *
 * @param {string} address
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function geocodeAddressCached(address) {
  const key = (address || '').trim().toLowerCase();
  if (!key) return null;

  if (geocodeCache.has(key)) return geocodeCache.get(key);

  try {
    const stored = sessionStorage.getItem(GEOCODE_CACHE_PREFIX + key);
    if (stored) {
      const parsed = JSON.parse(stored);
      geocodeCache.set(key, parsed);
      return parsed;
    }
  } catch {
    // sessionStorage unavailable (private mode etc.) - fall through to the network
  }

  // Free-typed addresses often fail as a whole (e.g. "Balaghat Madhyapradesh"), so fall back
  // to the part before the first comma, then to the first word (usually the town). The
  // shorter fallbacks only accept a city/town/village, so a partial match cannot land
  // the pin somewhere unrelated.
  const full = address.trim();
  const candidates = [{ q: full, settlementOnly: false }];
  const firstPart = full.split(',')[0].trim();
  if (firstPart && firstPart !== full) candidates.push({ q: firstPart, settlementOnly: true });
  const firstWord = firstPart.split(/\s+/)[0];
  if (firstWord && firstWord !== firstPart && firstWord.length >= 3 &&
      !GENERIC_ADDRESS_WORDS.has(firstWord.toLowerCase())) {
    candidates.push({ q: firstWord, settlementOnly: true });
  }

  const pending = (async () => {
    for (const { q, settlementOnly } of candidates) {
      try {
        const res = await geocodeAddress(q, { settlementOnly });
        return res.coordinates;
      } catch {
        // try the next, shorter candidate
      }
    }
    return null;
  })();
  geocodeCache.set(key, pending);

  const coords = await pending;
  geocodeCache.set(key, coords);
  if (coords) {
    try {
      sessionStorage.setItem(GEOCODE_CACHE_PREFIX + key, JSON.stringify(coords));
    } catch {
      // ignore storage errors
    }
  }
  return coords;
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
  geocodeAddressCached,
  reverseGeocode
};

export default osmGeocodingService;
