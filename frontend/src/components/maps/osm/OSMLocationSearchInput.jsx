import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces, getPlaceDetails } from '../../../services/osm/osmPlacesService';
import { reverseGeocode } from '../../../services/osm/osmGeocodingService';
import { FiMapPin, FiSearch, FiX, FiCrosshair, FiLoader, FiCheck, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

/**
 * OSMLocationSearchInput Component
 * 
 * OpenStreetMap / Nominatim based location search input.
 * Matches props, behavior, and data shape of LocationSearchInput.jsx:
 * {
 *   address: string,
 *   coordinates: {
 *     lat: number | null,
 *     lng: number | null
 *   }
 * }
 */
const OSMLocationSearchInput = ({
  value = '',
  onLocationSelect,
  placeholder = 'Type address or locality (e.g. Sonagiri Bhopal)...',
  required = false,
  className = '',
  disabled = false
}) => {
  const [query, setQuery] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync internal query with value prop if externally updated
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle manual typing
  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);

    // CRITICAL: Manual typing immediately clears previously locked coordinates
    setSelectedCoordinates(null);
    if (onLocationSelect) {
      onLocationSelect({
        address: text,
        coordinates: { lat: null, lng: null }
      });
    }

    if (text.trim().length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchPlaces(text);
        if (Array.isArray(results) && results.length > 0) {
          setPredictions(results);
          setIsOpen(true);
        } else {
          setPredictions([]);
          setIsOpen(false);
        }
      } catch (err) {
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);
  };

  // Handle selecting a place prediction from the suggestions dropdown
  const handleSelectPrediction = async (prediction) => {
    setQuery(prediction.description);
    setIsOpen(false);
    setIsLoading(true);

    try {
      const details = await getPlaceDetails(prediction.placeId, prediction);
      if (details && details.coordinates && details.coordinates.lat != null && details.coordinates.lng != null) {
        setSelectedCoordinates(details.coordinates);
        if (onLocationSelect) {
          onLocationSelect({
            address: details.address || prediction.description,
            coordinates: {
              lat: Number(details.coordinates.lat),
              lng: Number(details.coordinates.lng)
            }
          });
        }
      } else {
        setSelectedCoordinates(null);
        if (onLocationSelect) {
          onLocationSelect({
            address: prediction.description,
            coordinates: { lat: null, lng: null }
          });
        }
      }
    } catch (err) {
      setSelectedCoordinates(null);
      if (onLocationSelect) {
        onLocationSelect({
          address: prediction.description,
          coordinates: { lat: null, lng: null }
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Explicit, separate action: Detect device GPS coordinates
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const geocodeResult = await reverseGeocode(lat, lng);
          const address = geocodeResult.address || `Current Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          setQuery(address);
          setSelectedCoordinates({ lat, lng });
          if (onLocationSelect) {
            onLocationSelect({
              address,
              coordinates: { lat, lng }
            });
          }
          toast.success('Current location detected and pinned');
        } catch (err) {
          const fallbackAddress = `Current Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          setQuery(fallbackAddress);
          setSelectedCoordinates({ lat, lng });
          if (onLocationSelect) {
            onLocationSelect({
              address: fallbackAddress,
              coordinates: { lat, lng }
            });
          }
          toast.success('Current coordinates pinned');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = 'Unable to retrieve location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please allow location access in your browser settings.';
        }
        toast.error(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setIsOpen(false);
    setSelectedCoordinates(null);
    if (onLocationSelect) {
      onLocationSelect({
        address: '',
        coordinates: { lat: null, lng: null }
      });
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-neutral-400 pointer-events-none">
          {isLoading ? (
            <FiLoader className="animate-spin text-primary-600" />
          ) : (
            <FiSearch />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className="input-field pl-9 pr-10"
        />

        {/* Clear Button */}
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100"
            title="Clear search"
          >
            <FiX className="text-sm" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-neutral-100">
          {predictions.map((p) => (
            <li
              key={p.placeId || p.description}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectPrediction(p);
              }}
              className="px-4 py-2.5 hover:bg-primary-50 cursor-pointer flex items-start gap-2.5 transition-colors text-left"
            >
              <FiMapPin className="text-primary-600 mt-1 shrink-0 text-sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {p.mainText}
                </p>
                {p.secondaryText && (
                  <p className="text-xs text-neutral-500 truncate">
                    {p.secondaryText}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Location Status & Separate "Use Current Location" Action */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleDetectCurrentLocation}
          disabled={disabled || isLocating}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 shadow-xs transition-colors disabled:opacity-50"
        >
          {isLocating ? (
            <FiLoader className="animate-spin text-sm text-primary-600" />
          ) : (
            <FiCrosshair className="text-sm text-primary-600" />
          )}
          <span>{isLocating ? 'Detecting GPS...' : 'Use My Current Location'}</span>
        </button>

        {selectedCoordinates?.lat != null ? (
          <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
            <FiCheck className="text-green-600" />
            <span>
              Location confirmed ({selectedCoordinates.lat.toFixed(4)}, {selectedCoordinates.lng.toFixed(4)})
            </span>
          </div>
        ) : query && query.trim().length >= 2 ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            <FiAlertCircle className="text-amber-600 shrink-0" />
            <span>Select a suggestion or click Use My Current Location</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OSMLocationSearchInput;
