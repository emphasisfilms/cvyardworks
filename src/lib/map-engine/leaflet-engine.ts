// Fallback implementation of MapEngine: Leaflet + OpenStreetMap tiles.
// Used only when Apple Maps is not configured or fails to start.
// TO REMOVE once Apple Maps is proven: delete this file, the fallback branch in
// index.ts, and run `npm uninstall leaflet @types/leaflet`.

import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EngineOptions, MapEngine, MapLayer } from './types';

export async function createLeafletEngine(el: HTMLElement, opts: EngineOptions): Promise<MapEngine> {
  const L = (await import('leaflet')).default;
  const map = L.map(el, { center: opts.center, zoom: 11, scrollWheelZoom: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 50);

  function layer(): MapLayer {
    const group = L.layerGroup().addTo(map);
    return {
      pin(o) {
        const m = L.marker([o.lat, o.lng], {
          icon: L.divIcon({ className: 'mk-pin-leaflet', html: o.html, iconSize: [o.size, o.size], iconAnchor: [o.size / 2, o.size / 2] }),
          zIndexOffset: o.z ?? 0,
        });
        if (o.label) {
          m.bindTooltip(o.label, {
            permanent: !!o.labelShown,
            direction: 'right',
            offset: [o.size / 2 + 2, 0],
            className: `cvy-label ${o.labelClass ?? ''}`.trim(),
          });
        }
        if (o.popup) {
          m.bindPopup(() => o.popup!());
          m.on('popupopen', (e: Leaflet.PopupEvent) => {
            const node = e.popup.getElement();
            if (node) o.onPopup?.(node, () => e.popup.update());
          });
        }
        m.addTo(group);
        return { move: (lat, lng) => void m.setLatLng([lat, lng]) };
      },
      line(points, style, info) {
        const line = L.polyline(points, { color: style.color, weight: style.weight, opacity: style.opacity }).addTo(group);
        if (info) line.bindTooltip(info, { sticky: true });
        return { setPoints: (pts) => void line.setLatLngs(pts) };
      },
      circle(lat, lng, radiusM, style, info) {
        const c = L.circle([lat, lng], {
          radius: radiusM,
          color: style.color,
          weight: style.weight,
          opacity: style.opacity,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity,
        }).addTo(group);
        if (info) c.bindTooltip(info);
      },
      clear: () => void group.clearLayers(),
      remove: () => void group.remove(),
    };
  }

  return {
    kind: 'leaflet',
    layer,
    fit(points, maxZoom = 15) {
      if (points.length) map.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom });
    },
    onClick(cb) {
      const handler = (e: Leaflet.LeafletMouseEvent) => cb(e.latlng.lat, e.latlng.lng);
      map.on('click', handler);
      return () => void map.off('click', handler);
    },
    resize: () => void map.invalidateSize(),
    destroy: () => void map.remove(),
  };
}
