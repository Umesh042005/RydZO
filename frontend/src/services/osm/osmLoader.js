/**
 * OpenStreetMap / Leaflet Loader and Setup
 * 
 * Configures Leaflet and fixes default icon assets for Webpack/CRA bundling.
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let isConfigured = false;

/**
 * Configure default Leaflet marker icons.
 * Prevents missing marker icons in React/Create React App builds.
 * 
 * @returns {typeof L}
 */
export function setupLeaflet() {
  if (isConfigured) return L;

  try {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
    isConfigured = true;
  } catch (err) {
    console.warn('Failed to configure Leaflet icons:', err);
  }

  return L;
}

/**
 * Check if Leaflet is available in the current environment.
 * @returns {boolean}
 */
export function isOsmConfigured() {
  return typeof window !== 'undefined';
}

/**
 * Load and return Leaflet instance.
 * @returns {Promise<typeof L>}
 */
export async function loadLeaflet() {
  return setupLeaflet();
}

export default setupLeaflet;
