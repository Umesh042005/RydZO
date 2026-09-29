/**
 * Google Places Service
 * 
 * Supports Google Places API (New) AutocompleteSuggestion,
 * with graceful fallback to legacy AutocompleteService and Geocoder.
 */

import { loadGoogleMaps, isGoogleMapsConfigured } from './googleMapsLoader';

/**
 * Search for place predictions using:
 * 1. Google Places API (New) AutocompleteSuggestion
 * 2. Legacy Places AutocompleteService
 * 3. Geocoder Search Fallback (with progressive query relaxation)
 * 
 * @param {string} query - Search text
 * @returns {Promise<Array<{placeId: string, description: string, mainText: string, secondaryText: string, _placePrediction?: any, _coordinates?: {lat: number, lng: number}}>>}
 */
export async function searchPlaces(query) {
  if (!isGoogleMapsConfigured()) {
    return [];
  }

  if (!query || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();

  try {
    const maps = await loadGoogleMaps();

    // Strategy 1: Google Places API (New) AutocompleteSuggestion
    if (typeof maps.importLibrary === 'function') {
      try {
        const placesLib = await maps.importLibrary('places');
        if (placesLib && placesLib.AutocompleteSuggestion && typeof placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions === 'function') {
          const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: cleanQuery,
            includedRegionCodes: ['IN'],
            region: 'IN'
          });

          if (response && Array.isArray(response.suggestions) && response.suggestions.length > 0) {
            const predictions = response.suggestions
              .filter((s) => s.placePrediction)
              .map((s) => {
                const p = s.placePrediction;
                const fullText = p.text ? p.text.toString() : (p.structuredFormat?.mainText?.text || cleanQuery);
                const main = p.structuredFormat?.mainText?.text || fullText;
                const secondary = p.structuredFormat?.secondaryText?.text || '';
                return {
                  placeId: p.placeId,
                  description: fullText,
                  mainText: main,
                  secondaryText: secondary,
                  _placePrediction: p
                };
              });

            if (predictions.length > 0) {
              return predictions;
            }
          }
        }
      } catch (newPlacesErr) {
        // Places API (New) not enabled or restricted; fall through to fallbacks
      }
    }

    // Strategy 2: Legacy AutocompleteService
    if (maps.places && maps.places.AutocompleteService) {
      try {
        const legacyResults = await new Promise((resolve) => {
          const service = new maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: cleanQuery,
              componentRestrictions: { country: 'in' }
            },
            (predictions, status) => {
              if (status === maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
                resolve(
                  predictions.map((p) => ({
                    placeId: p.place_id,
                    description: p.description,
                    mainText: p.structured_formatting?.main_text || p.description,
                    secondaryText: p.structured_formatting?.secondary_text || ''
                  }))
                );
              } else {
                resolve(null);
              }
            }
          );
        });

        if (legacyResults && legacyResults.length > 0) {
          return legacyResults;
        }
      } catch (legacyErr) {
        // Legacy API may be disabled; fall through to Geocoder
      }
    }

    // Strategy 3: Geocoder Fallback with progressive relaxation
    if (maps.Geocoder) {
      try {
        const geocoder = new maps.Geocoder();

        const runGeocode = (addr) => {
          return new Promise((resolve) => {
            geocoder.geocode(
              {
                address: addr,
                componentRestrictions: { country: 'IN' }
              },
              (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                  resolve(
                    results.slice(0, 5).map((r) => {
                      const parts = r.formatted_address.split(',');
                      const mainText = parts[0]?.trim() || r.formatted_address;
                      const secondaryText = parts.slice(1).join(',').trim();
                      return {
                        placeId: r.place_id,
                        description: r.formatted_address,
                        mainText,
                        secondaryText,
                        _coordinates: {
                          lat: r.geometry.location.lat(),
                          lng: r.geometry.location.lng()
                        }
                      };
                    })
                  );
                } else {
                  resolve([]);
                }
              }
            );
          });
        };

        // Try exact query
        let geocodeResults = await runGeocode(cleanQuery);

        // If exact query returns no results, relax query by removing specific house/flat numbers
        if (geocodeResults.length === 0) {
          const relaxed = cleanQuery.replace(/^(LIG|MIG|HIG|PLOT|FLAT|NO|HOUSE|SECTOR|[A-Z0-9\-/]+)\s*[0-9A-Z\-/]*\s*,?\s*/i, '').trim();
          if (relaxed && relaxed.length >= 3 && relaxed !== cleanQuery) {
            geocodeResults = await runGeocode(relaxed);
          }
        }

        if (geocodeResults && geocodeResults.length > 0) {
          return geocodeResults;
        }
      } catch (geoErr) {
        // Geocoder error
      }
    }

    return [];
  } catch (err) {
    return [];
  }
}

/**
 * Get place details (address + coordinates) by place ID or prediction object.
 * Returns the structure matching the Bike handoverLocation schema.
 * 
 * @param {string} placeId - Google Place ID
 * @param {object} [prediction] - Selected prediction object (may contain _placePrediction or _coordinates)
 * @returns {Promise<{address: string, coordinates: {lat: number, lng: number}}>}
 */
export async function getPlaceDetails(placeId, prediction = null) {
  if (!isGoogleMapsConfigured()) {
    return { error: 'Google Maps is not configured' };
  }

  // If coordinates are already pre-resolved from geocoder search
  if (prediction?._coordinates?.lat != null && prediction?._coordinates?.lng != null) {
    return {
      address: prediction.description,
      coordinates: {
        lat: Number(prediction._coordinates.lat),
        lng: Number(prediction._coordinates.lng)
      }
    };
  }

  const maps = await loadGoogleMaps();

  // Strategy 1: Places API (New) toPlace().fetchFields()
  if (prediction?._placePrediction && typeof prediction._placePrediction.toPlace === 'function') {
    try {
      const place = prediction._placePrediction.toPlace();
      await place.fetchFields({
        fields: ['formattedAddress', 'displayName', 'location']
      });

      if (place.location) {
        const lat = typeof place.location.lat === 'function' ? place.location.lat() : Number(place.location.lat);
        const lng = typeof place.location.lng === 'function' ? place.location.lng() : Number(place.location.lng);
        return {
          address: place.formattedAddress || place.displayName || prediction.description,
          coordinates: { lat, lng }
        };
      }
    } catch (e) {
      // Fall through to next strategy
    }
  }

  // Strategy 2: Places API (New) new Place({ id }).fetchFields()
  if (typeof maps.importLibrary === 'function' && placeId) {
    try {
      const placesLib = await maps.importLibrary('places');
      if (placesLib && placesLib.Place) {
        const place = new placesLib.Place({ id: placeId });
        await place.fetchFields({
          fields: ['formattedAddress', 'displayName', 'location']
        });

        if (place.location) {
          const lat = typeof place.location.lat === 'function' ? place.location.lat() : Number(place.location.lat);
          const lng = typeof place.location.lng === 'function' ? place.location.lng() : Number(place.location.lng);
          return {
            address: place.formattedAddress || place.displayName || (prediction?.description || ''),
            coordinates: { lat, lng }
          };
        }
      }
    } catch (e) {
      // Fall through to next strategy
    }
  }

  // Strategy 3: Geocoder by placeId (High reliability)
  if (maps.Geocoder && placeId) {
    try {
      const geocoded = await new Promise((resolve) => {
        const geocoder = new maps.Geocoder();
        geocoder.geocode({ placeId }, (results, status) => {
          if (status === 'OK' && results && results[0] && results[0].geometry) {
            resolve({
              address: results[0].formatted_address,
              coordinates: {
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng()
              }
            });
          } else {
            resolve(null);
          }
        });
      });

      if (geocoded) {
        return geocoded;
      }
    } catch (e) {
      // Fall through to legacy
    }
  }

  // Strategy 4: Legacy PlacesService
  if (maps.places && maps.places.PlacesService && placeId) {
    try {
      const container = document.createElement('div');
      const service = new maps.places.PlacesService(container);

      const legacyPlace = await new Promise((resolve, reject) => {
        service.getDetails(
          {
            placeId,
            fields: ['formatted_address', 'geometry', 'name']
          },
          (place, status) => {
            if (status === maps.places.PlacesServiceStatus.OK && place && place.geometry) {
              resolve({
                address: place.formatted_address || place.name || '',
                coordinates: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                }
              });
            } else {
              reject(new Error(`PlacesService failed: ${status}`));
            }
          }
        );
      });

      if (legacyPlace) {
        return legacyPlace;
      }
    } catch (e) {
      // Fall through
    }
  }

  throw new Error('Unable to retrieve coordinates for the selected place');
}
