/**
 * OpenStreetMap / Nominatim Places & Autocomplete Service
 * 
 * Provides place search suggestions using the OpenStreetMap Nominatim API,
 * matching the output interface of placesService.js.
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Helper to fetch Nominatim results with timeout and error handling.
 * 
 * @param {string} endpoint - API endpoint with query parameters
 * @returns {Promise<any>}
 */
async function fetchNominatim(endpoint) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${NOMINATIM_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim request failed: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn('Nominatim request timed out');
    }
    return null;
  }
}

/**
 * Search for place predictions using Nominatim search API.
 * Includes progressive query relaxation for specific Indian addresses.
 * 
 * @param {string} query - Search text
 * @returns {Promise<Array<{placeId: string, description: string, mainText: string, secondaryText: string, _coordinates?: {lat: number, lng: number}}>>}
 */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();

  const runSearch = async (searchTerm) => {
    const params = new URLSearchParams({
      q: searchTerm,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'in'
    });

    const data = await fetchNominatim(`/search?${params.toString()}`);
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map((item) => {
      const displayName = item.display_name || '';
      const parts = displayName.split(',');
      const mainText = parts[0]?.trim() || item.name || displayName;
      const secondaryText = parts.slice(1).join(',').trim();

      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      return {
        placeId: String(item.place_id),
        description: displayName,
        mainText,
        secondaryText,
        _coordinates: !isNaN(lat) && !isNaN(lng) ? { lat, lng } : undefined
      };
    });
  };

  try {
    // 1. Try exact query
    let results = await runSearch(cleanQuery);

    // 2. If no results, relax query by stripping specific house/flat numbers
    if (results.length === 0) {
      const relaxed = cleanQuery.replace(
        /^(LIG|MIG|HIG|PLOT|FLAT|NO|HOUSE|SECTOR|[A-Z0-9\-/]+)\s*[0-9A-Z\-/]*\s*,?\s*/i,
        ''
      ).trim();

      if (relaxed && relaxed.length >= 3 && relaxed !== cleanQuery) {
        results = await runSearch(relaxed);
      }
    }

    return results;
  } catch (err) {
    console.warn('OSM searchPlaces error:', err);
    return [];
  }
}

/**
 * Get place details (address + coordinates) by placeId or prediction object.
 * Returns structure matching Bike handoverLocation schema:
 * { address: string, coordinates: { lat: number, lng: number } }
 * 
 * @param {string} placeId - OSM Place ID
 * @param {object} [prediction] - Selected prediction object
 * @returns {Promise<{address: string, coordinates: {lat: number, lng: number}}>}
 */
export async function getPlaceDetails(placeId, prediction = null) {
  // If coordinates are already present in the prediction object
  if (prediction?._coordinates?.lat != null && prediction?._coordinates?.lng != null) {
    return {
      address: prediction.description,
      coordinates: {
        lat: Number(prediction._coordinates.lat),
        lng: Number(prediction._coordinates.lng)
      }
    };
  }

  // Lookup details from Nominatim details endpoint if coordinates missing
  if (placeId) {
    try {
      const data = await fetchNominatim(`/details?place_id=${encodeURIComponent(placeId)}&format=json`);
      if (data && data.geometry && Array.isArray(data.geometry.coordinates)) {
        const [lon, lat] = data.geometry.coordinates;
        return {
          address: data.localname || prediction?.description || 'Selected Location',
          coordinates: {
            lat: Number(lat),
            lng: Number(lon)
          }
        };
      }
    } catch (err) {
      console.warn('OSM getPlaceDetails lookup error:', err);
    }
  }

  throw new Error('Unable to retrieve coordinates for the selected place');
}

const osmPlacesService = {
  searchPlaces,
  getPlaceDetails
};

export default osmPlacesService;
