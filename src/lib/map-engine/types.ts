// A small, engine-neutral drawing surface for the admin map.
//
// The map page and every map feature draw through this interface, never
// through Apple's or Leaflet's API directly. Two implementations exist:
//   apple-engine.ts    Apple Maps (MapKit JS) — the one we want
//   leaflet-engine.ts  OpenStreetMap fallback, used only when Apple Maps is
//                      not configured or fails to start. Delete that file and
//                      its branch in index.ts once Apple is proven in production.

export interface PinOptions {
  lat: number;
  lng: number;
  html: string; // the marker's own markup (a dot, a truck badge…)
  size: number; // square, in px, centred on the coordinate
  label?: string; // name beside the pin
  labelShown?: boolean; // always visible (true) or hover-only (false)
  labelClass?: string;
  popup?: () => string; // HTML for the bubble, built when it opens
  // Called once the bubble exists; `refresh` re-measures it after content changes.
  onPopup?: (el: HTMLElement, refresh: () => void) => void;
  z?: number; // higher draws on top
}

export interface PinHandle {
  move(lat: number, lng: number): void;
}

export interface LineStyle {
  color: string;
  weight: number;
  opacity: number;
}

export interface LineHandle {
  setPoints(points: [number, number][]): void;
}

export interface CircleStyle extends LineStyle {
  fillColor: string;
  fillOpacity: number;
}

// A group of drawings that can be cleared or removed together.
export interface MapLayer {
  pin(o: PinOptions): PinHandle;
  // `info` is short HTML shown when the shape is hovered (Leaflet) or tapped (Apple).
  line(points: [number, number][], style: LineStyle, info?: string): LineHandle;
  circle(lat: number, lng: number, radiusM: number, style: CircleStyle, info?: string): void;
  clear(): void;
  remove(): void;
}

export interface MapEngine {
  kind: 'apple' | 'leaflet';
  layer(): MapLayer;
  fit(points: [number, number][], maxZoom?: number): void;
  onClick(cb: (lat: number, lng: number) => void): () => void;
  resize(): void;
  destroy(): void;
}

export interface EngineOptions {
  center: [number, number];
  // Apple has no hover tooltips on lines and circles; it reports the tapped
  // shape's `info` here instead (null when deselected).
  onInfo: (html: string | null) => void;
}
