import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, isGoogleMapsConfigured } from '../../services/googleMapsLoader';
import { FiMapPin, FiExternalLink, FiNavigation, FiLoader, FiAlertCircle } from 'react-icons/fi';

/**
 * Reusable GoogleMapView Component
 * 
 * Renders an interactive Google Map with a marker at specified coordinates.
 * Gracefully degrades to a styled fallback view if the API key is not configured,
 * if network fails, or if coordinates are not provided.
 * 
 * @param {Object} props
 * @param {{lat: number, lng: number}} [props.coordinates] - Coordinates object
 * @param {number} [props.lat] - Latitude fallback
 * @param {number} [props.lng] - Longitude fallback
 * @param {string} [props.address] - Location address for display/fallback
 * @param {number} [props.zoom=15] - Initial map zoom level
 * @param {string} [props.height="280px"] - Container height
 * @param {string} [props.className=""] - Additional container CSS classes
 * @param {Object} [props.directionsResult] - Optional DirectionsResult to render route
 * @param {boolean} [props.showExternalLink=true] - Whether to show "Open in Google Maps" link
 */
const GoogleMapView = ({
  coordinates,
  lat: propLat,
  lng: propLng,
  address = '',
  zoom = 15,
  height = '280px',
  className = '',
  directionsResult = null,
  showExternalLink = true
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const directionsRendererRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Extract coordinates from coordinates object or individual props
  const lat = coordinates?.lat != null ? Number(coordinates.lat) : (propLat != null ? Number(propLat) : null);
  const lng = coordinates?.lng != null ? Number(coordinates.lng) : (propLng != null ? Number(propLng) : null);
  const hasValidCoordinates = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  const isConfigured = isGoogleMapsConfigured();

  // Initialize or update map
  useEffect(() => {
    if (!isConfigured || !hasValidCoordinates || !mapRef.current) {
      return;
    }

    let isMounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapRef.current) return;

        const center = { lat, lng };

        if (!mapInstanceRef.current) {
          // Initialize map instance
          const map = new maps.Map(mapRef.current, {
            center,
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true
          });

          mapInstanceRef.current = map;

          // Add location marker
          markerRef.current = new maps.Marker({
            position: center,
            map,
            title: address || 'Handover Location',
            animation: maps.Animation.DROP
          });

          // Optional info window
          if (address) {
            const infoWindow = new maps.InfoWindow({
              content: `<div style="padding: 6px; font-size: 13px; font-weight: 500;">${address}</div>`
            });
            markerRef.current.addListener('click', () => {
              infoWindow.open(map, markerRef.current);
            });
          }
        } else {
          // Update existing map center and marker
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setZoom(zoom);
          if (markerRef.current) {
            markerRef.current.setPosition(center);
          }
        }

        // Render directions if provided
        if (directionsResult) {
          if (!directionsRendererRef.current) {
            directionsRendererRef.current = new maps.DirectionsRenderer({
              map: mapInstanceRef.current,
              suppressMarkers: false
            });
          }
          directionsRendererRef.current.setDirections(directionsResult);
        } else if (directionsRendererRef.current) {
          directionsRendererRef.current.set('directions', null);
        }

        setMapLoaded(true);
        setLoadError(null);
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Google Maps could not be loaded:', err.message);
          setLoadError(err.message || 'Map failed to load');
          setMapLoaded(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isConfigured, hasValidCoordinates, lat, lng, zoom, address, directionsResult]);

  // Construct external Google Maps navigation URL
  const googleMapsUrl = hasValidCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  // Case 3 & 4: Completely missing address and coordinates
  if (!address && !hasValidCoordinates) {
    return (
      <div
        className={`rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex items-center justify-center text-center text-neutral-500 text-sm ${className}`}
        style={{ minHeight: height }}
      >
        <div className="space-y-1">
          <FiMapPin className="text-2xl text-neutral-400 mx-auto" />
          <p className="font-medium text-neutral-700">Pickup Location Pending</p>
          <p className="text-xs text-neutral-500">Handover location will be confirmed with the owner.</p>
        </div>
      </div>
    );
  }

  // Case 2 & 5: Maps API unconfigured, load error, or missing/invalid coordinates
  if (!isConfigured || loadError || !hasValidCoordinates) {
    return (
      <div
        className={`rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col justify-between ${className}`}
        style={{ minHeight: height }}
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-primary-100 text-primary-700 shrink-0 mt-0.5">
            <FiMapPin className="text-xl" />
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-semibold text-neutral-800">
              Pickup & Handover Location
            </h4>
            <p className="text-sm text-neutral-600 break-words">
              {address || 'Address not available'}
            </p>
            {hasValidCoordinates && (
              <p className="text-xs text-neutral-400 font-mono">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            )}

            {!hasValidCoordinates && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <FiAlertCircle className="text-xs" />
                Map location unavailable (coordinates pending)
              </span>
            )}

            {!isConfigured && hasValidCoordinates && (
              <p className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded inline-block">
                Interactive map preview disabled (API key unconfigured)
              </p>
            )}

            {loadError && (
              <p className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block">
                Map preview unavailable: {loadError}
              </p>
            )}
          </div>
        </div>

        {showExternalLink && googleMapsUrl && (
          <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center justify-between">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline"
            >
              <FiNavigation className="text-xs" />
              Open in Google Maps
              <FiExternalLink className="text-xs ml-0.5" />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-neutral-200 shadow-sm ${className}`}>
      {/* Loading state indicator before map resolves */}
      {!mapLoaded && (
        <div
          className="absolute inset-0 z-10 bg-neutral-100 flex items-center justify-center gap-2 text-neutral-500 text-xs font-medium"
          style={{ height }}
        >
          <FiLoader className="animate-spin text-primary-600 text-lg" />
          <span>Loading map...</span>
        </div>
      )}

      <div ref={mapRef} style={{ width: '100%', height }} />

      {showExternalLink && googleMapsUrl && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 bg-white/95 hover:bg-white text-neutral-800 text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-md border border-neutral-200 inline-flex items-center gap-1.5 transition-all z-10"
        >
          <span>Open in Google Maps</span>
          <FiExternalLink className="text-xs" />
        </a>
      )}
    </div>
  );
};

export default GoogleMapView;
