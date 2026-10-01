// What the Map page hands to each map feature: the drawing engine.
// Features draw through it and never touch Apple's or Leaflet's API.
import type { MapEngine } from '@/lib/map-engine';

export interface MapCtx {
  engine: MapEngine;
}
