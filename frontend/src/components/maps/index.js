/**
 * RydZO Maps Component Exports
 * 
 * Exports Google components, OSM components, and provider-aware unified components.
 */

import GoogleMapView from './GoogleMapView';
import LocationSearchInput from './LocationSearchInput';
import OSMMapView from './osm/OSMMapView';
import OSMLocationSearchInput from './osm/OSMLocationSearchInput';
import {
  UnifiedMapView,
  UnifiedLocationSearchInput,
  isOsmProvider,
  CURRENT_MAP_PROVIDER
} from '../../config/mapProvider';

export {
  GoogleMapView,
  LocationSearchInput,
  OSMMapView,
  OSMLocationSearchInput,
  UnifiedMapView,
  UnifiedLocationSearchInput,
  isOsmProvider,
  CURRENT_MAP_PROVIDER
};

// Default map view delegates to active provider
export default UnifiedMapView;
