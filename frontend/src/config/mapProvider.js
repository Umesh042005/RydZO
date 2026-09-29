/**
 * RydZO Map Provider Configuration & Feature Flag
 * 
 * Supports switching between Google Maps and OpenStreetMap (OSM) via
 * the REACT_APP_MAP_PROVIDER environment variable.
 * 
 * Values:
 * - 'google' (default): Uses Google Maps JavaScript API, Places Autocomplete, and Directions.
 * - 'osm' or 'leaflet': Uses OpenStreetMap, Leaflet, Nominatim, and OSRM routing.
 */

import React from 'react';
import GoogleMapView from '../components/maps/GoogleMapView';
import LocationSearchInput from '../components/maps/LocationSearchInput';
import OSMMapView from '../components/maps/osm/OSMMapView';
import OSMLocationSearchInput from '../components/maps/osm/OSMLocationSearchInput';

import {
  calculateRoute as googleCalculateRoute,
  calculateRouteFromCurrentLocation as googleRouteFromCurrentLocation
} from '../services/routesService';

import {
  calculateRoute as osmCalculateRoute,
  calculateRouteFromCurrentLocation as osmRouteFromCurrentLocation
} from '../services/osm/osmRoutesService';

export const MAP_PROVIDERS = {
  GOOGLE: 'google',
  OSM: 'osm'
};

const rawProvider = (process.env.REACT_APP_MAP_PROVIDER || '').trim().toLowerCase();

export const CURRENT_MAP_PROVIDER =
  rawProvider === 'osm' || rawProvider === 'leaflet'
    ? MAP_PROVIDERS.OSM
    : MAP_PROVIDERS.GOOGLE;

/**
 * Check if the active provider is OpenStreetMap.
 * @returns {boolean}
 */
export const isOsmProvider = () => CURRENT_MAP_PROVIDER === MAP_PROVIDERS.OSM;

/**
 * Check if the active provider is Google Maps.
 * @returns {boolean}
 */
export const isGoogleProvider = () => CURRENT_MAP_PROVIDER === MAP_PROVIDERS.GOOGLE;

/**
 * Get the name of current map provider.
 * @returns {string} 'google' | 'osm'
 */
export const getMapProvider = () => CURRENT_MAP_PROVIDER;

/**
 * Unified MapView Component.
 * Automatically delegates to OSMMapView or GoogleMapView based on CURRENT_MAP_PROVIDER.
 */
export const UnifiedMapView = (props) => {
  if (isOsmProvider()) {
    return <OSMMapView {...props} />;
  }
  return <GoogleMapView {...props} />;
};

/**
 * Unified LocationSearchInput Component.
 * Automatically delegates to OSMLocationSearchInput or LocationSearchInput based on CURRENT_MAP_PROVIDER.
 */
export const UnifiedLocationSearchInput = (props) => {
  if (isOsmProvider()) {
    return <OSMLocationSearchInput {...props} />;
  }
  return <LocationSearchInput {...props} />;
};

/**
 * Unified route calculation between two points.
 */
export async function calculateRoute(origin, destination) {
  if (isOsmProvider()) {
    return osmCalculateRoute(origin, destination);
  }
  return googleCalculateRoute(origin, destination);
}

/**
 * Unified route calculation from user's current GPS location.
 */
export async function calculateRouteFromCurrentLocation(destination) {
  if (isOsmProvider()) {
    return osmRouteFromCurrentLocation(destination);
  }
  return googleRouteFromCurrentLocation(destination);
}

const mapProviderConfig = {
  MAP_PROVIDERS,
  CURRENT_MAP_PROVIDER,
  isOsmProvider,
  isGoogleProvider,
  getMapProvider,
  UnifiedMapView,
  UnifiedLocationSearchInput,
  calculateRoute,
  calculateRouteFromCurrentLocation
};

export default mapProviderConfig;
