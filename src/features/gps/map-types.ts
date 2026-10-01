// What the Map page hands to each map feature: the live Leaflet map and library.
import type * as Leaflet from 'leaflet';

export interface MapCtx {
  map: Leaflet.Map;
  L: typeof Leaflet;
}
