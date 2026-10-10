import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { setupLeaflet } from '../../../services/osm/osmLoader';
import { geocodeAddressCached } from '../../../services/osm/osmGeocodingService';
import { FiMapPin, FiExternalLink, FiNavigation, FiAlertCircle } from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';

/**
 * Controller component to update Leaflet view when center, zoom, or route bounds change.
 */
function MapViewController({ center, zoom, routePoints }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (routePoints && routePoints.length > 1) {
      try {
        map.fitBounds(routePoints, { padding: [40, 40] });
      } catch (e) {
        if (center) map.setView(center, zoom);
      }
    } else if (center) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom, routePoints]);

  // Leaflet measures its container once at mount. When the card around it is still
  // laying out, part of the map stays grey until it is told to re-measure.
  useEffect(() => {
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);

  return null;
}

/**
 * Lets the user move the pin by clicking/tapping the map (only when editable).
 */
function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

/**
 * Reusable OSMMapView Component (Leaflet + OpenStreetMap)
 * 
 * Matches props and fallback behavior of GoogleMapView.jsx.
 * 
 * @param {Object} props
 * @param {{lat: number, lng: number}} [props.coordinates] - Coordinates object
 * @param {number} [props.lat] - Latitude fallback
 * @param {number} [props.lng] - Longitude fallback
 * @param {string} [props.address] - Location address for display/fallback
 * @param {number} [props.zoom=15] - Initial map zoom level
 * @param {string} [props.height="280px"] - Container height
 * @param {string} [props.className=""] - Additional container CSS classes
 * @param {Object} [props.directionsResult] - Optional route result to render polyline
 * @param {boolean} [props.showExternalLink=true] - Whether to show "Open in OpenStreetMap" link
 * @param {(coords: {lat: number, lng: number}) => void} [props.onPositionChange] - When set, the pin
 *   can be dragged or placed by clicking the map, and this is called with the new position
 */
const OSMMapView = ({
  coordinates,
  lat: propLat,
  lng: propLng,
  address = '',
  zoom = 15,
  height = '280px',
  className = '',
  directionsResult = null,
  showExternalLink = true,
  onPositionChange = null
}) => {
  // Ensure default marker icons are configured
  useEffect(() => {
    setupLeaflet();
  }, []);

  // Extract coordinates from object or props
  const lat = coordinates?.lat != null ? Number(coordinates.lat) : (propLat != null ? Number(propLat) : null);
  const lng = coordinates?.lng != null ? Number(coordinates.lng) : (propLng != null ? Number(propLng) : null);
  const hasStoredCoordinates = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  // Listings saved with only an address (e.g. "Bhopal") have no coordinates. Look the
  // address up so the map still shows the area, and label it as approximate.
  const [approxCoords, setApproxCoords] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  useEffect(() => {
    if (hasStoredCoordinates || !address) {
      setApproxCoords(null);
      setIsGeocoding(false);
      return;
    }
    let cancelled = false;
    setIsGeocoding(true);
    geocodeAddressCached(address).then((coords) => {
      if (cancelled) return;
      setApproxCoords(coords);
      setIsGeocoding(false);
    });
    return () => { cancelled = true; };
  }, [hasStoredCoordinates, address]);

  const isApproximate = !hasStoredCoordinates && approxCoords != null;
  const hasValidCoordinates = hasStoredCoordinates || isApproximate;
  const displayLat = hasStoredCoordinates ? lat : approxCoords?.lat;
  const displayLng = hasStoredCoordinates ? lng : approxCoords?.lng;
  // An address-only location is usually a city or locality, so show the wider area
  const effectiveZoom = isApproximate ? Math.min(zoom, 13) : zoom;

  const center = useMemo(() => {
    return hasValidCoordinates ? [displayLat, displayLng] : [23.2599, 77.4126]; // Default fallback center (Bhopal)
  }, [hasValidCoordinates, displayLat, displayLng]);

  const isEditable = typeof onPositionChange === 'function';
  const markerHandlers = useMemo(() => ({
    dragend(e) {
      const pos = e.target.getLatLng();
      if (onPositionChange) onPositionChange({ lat: pos.lat, lng: pos.lng });
    }
  }), [onPositionChange]);

  // Extract route coordinates if directionsResult is provided
  const routePoints = useMemo(() => {
    if (!directionsResult) return null;
    if (Array.isArray(directionsResult.coordinates) && directionsResult.coordinates.length > 0) {
      return directionsResult.coordinates;
    }
    if (Array.isArray(directionsResult)) {
      return directionsResult;
    }
    return null;
  }, [directionsResult]);

  // Construct external map URL
  const osmUrl = hasStoredCoordinates
    ?`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`
    : address
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
    : null;

  // Case: Completely missing address and coordinates
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

  // Case: Missing or invalid coordinates
  if (!hasValidCoordinates) {
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
            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              <FiAlertCircle className="text-xs" />
              {isGeocoding ? 'Finding this address on the map...' : 'Map location unavailable (coordinates pending)'}
            </span>
          </div>
        </div>

        {showExternalLink && osmUrl && (
          <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center justify-between">
            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline"
            >
              <FiNavigation className="text-xs" />
              Open in OpenStreetMap
              <FiExternalLink className="text-xs ml-0.5" />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-neutral-200 shadow-sm ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={effectiveZoom}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewController center={center} zoom={effectiveZoom} routePoints={routePoints} />

        {isEditable && <MapClickHandler onPick={onPositionChange} />}

        <Marker position={center} draggable={isEditable} eventHandlers={markerHandlers}>
          {address && (
            <Popup>
              <div className="text-xs font-medium text-neutral-800">
                {address}
              </div>
            </Popup>
          )}
        </Marker>

        {routePoints && routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: '#15803d', weight: 5, opacity: 0.8 }}
          />
        )}
      </MapContainer>

      {isApproximate && (
        <span className="absolute top-2 left-2 z-20 inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md shadow-sm">
          <FiAlertCircle className="text-xs" />
          Approximate area from address
        </span>
      )}

      {isEditable && (
        <span className="absolute top-2 left-2 z-20 text-xs text-neutral-800 bg-white border border-neutral-200 px-2 py-1 rounded-md shadow-sm">
          Drag the pin or tap the map to set the exact spot
        </span>
      )}

      {showExternalLink && osmUrl && (
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 bg-white/95 hover:bg-white text-neutral-800 text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-md border border-neutral-200 inline-flex items-center gap-1.5 transition-all z-20"
        >
          <span>Open in OpenStreetMap</span>
          <FiExternalLink className="text-xs" />
        </a>
      )}
    </div>
  );
};

export default OSMMapView;
