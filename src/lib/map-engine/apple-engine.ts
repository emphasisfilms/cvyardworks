// Apple Maps implementation of MapEngine (MapKit JS 5).
/* global mapkit */

import type { EngineOptions, MapEngine, MapLayer, PinHandle, LineHandle } from './types';

declare global {
  interface Window {
    mapkit?: typeof mapkit;
  }
}

let loader: Promise<typeof mapkit> | null = null;
let tokenProblem: string | null = null; // why our token endpoint failed, if it did
let initialized = false; // MapKit only authorizes once per page load

// Load the script and register how to fetch tokens. Safe to call repeatedly.
function loadMapKit(): Promise<typeof mapkit> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => {
      const mk = window.mapkit;
      if (!mk) return reject(new Error('Apple Maps failed to load'));
      mk.init({
        language: 'en',
        authorizationCallback: (done) => {
          fetch('/api/mapkit/token', { cache: 'no-store' })
            .then(async (r) => {
              if (!r.ok) throw new Error(`${(await r.text()).slice(0, 120)} (HTTP ${r.status})`);
              tokenProblem = null;
              return r.text();
            })
            .then(done)
            .catch((e: Error) => {
              tokenProblem = e.message;
              done(''); // an empty token makes MapKit raise its error event
            });
        },
      });
      resolve(mk);
    };
    script.onerror = () => {
      loader = null;
      reject(new Error('Could not reach Apple Maps'));
    };
    document.head.appendChild(script);
  });
  return loader;
}

export async function createAppleEngine(el: HTMLElement, opts: EngineOptions): Promise<MapEngine> {
  const mk = await loadMapKit();

  const map = new mk.Map(el, {
    region: new mk.CoordinateRegion(
      new mk.Coordinate(opts.center[0], opts.center[1]),
      new mk.CoordinateSpan(0.22, 0.3)
    ),
    showsMapTypeControl: true, // Standard / Hybrid / Satellite
    showsZoomControl: true,
    showsCompass: mk.FeatureVisibility.Hidden,
    isRotationEnabled: false,
    colorScheme: 'light',
  });

  // Wait for Apple to accept the token, or fail fast so the caller can fall back.
  if (!initialized) {
    await new Promise<void>((resolve, reject) => {
      const ok = (e: { status: string }) => {
        if (e.status === 'Initialized') {
          initialized = true;
          cleanup();
          resolve();
        }
      };
      const bad = (e: { status: string }) => {
        cleanup();
        reject(
          new Error(
            tokenProblem
              ? `Apple Maps could not get a token: ${tokenProblem}`
              : `Apple rejected the map token (${e.status}). Use the Apple Maps test on the Dashboard to see why`
          )
        );
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Apple Maps did not respond'));
      }, 10000);
      const cleanup = () => {
        clearTimeout(timer);
        mk.removeEventListener('configuration-change', ok as never);
        mk.removeEventListener('error', bad as never);
      };
      mk.addEventListener('configuration-change', ok as never);
      mk.addEventListener('error', bad as never);
    }).catch((e) => {
      map.destroy();
      throw e;
    });
  }

  // Tapping a line or circle reports its info text.
  type WithInfo = { data?: { info?: string } };
  const onSelect = (e: { overlay?: WithInfo }) => opts.onInfo(e.overlay?.data?.info ?? null);
  const onDeselect = (e: { overlay?: WithInfo }) => {
    if (e.overlay) opts.onInfo(null);
  };
  map.addEventListener('select', onSelect as never);
  map.addEventListener('deselect', onDeselect as never);

  function layer(): MapLayer {
    let annotations: mapkit.Annotation[] = [];
    let overlays: mapkit.Overlay[] = [];

    return {
      pin(o): PinHandle {
        // MapKit anchors a custom annotation at the element's bottom centre.
        // Giving the element half the pin's height puts the pin's centre there.
        const box = document.createElement('div');
        box.className = 'mk-pin';
        box.style.width = `${o.size}px`;
        box.style.height = `${o.size / 2}px`;
        const body = document.createElement('div');
        body.className = 'mk-pin-body';
        body.style.width = body.style.height = `${o.size}px`;
        body.innerHTML = o.html;
        box.appendChild(body);
        if (o.label) {
          box.title = o.label;
          if (o.labelShown) {
            const tag = document.createElement('span');
            tag.className = `cvy-label mk-label ${o.labelClass ?? ''}`.trim();
            tag.textContent = o.label;
            tag.style.left = `${o.size + 3}px`;
            tag.style.top = `${o.size / 2}px`;
            box.appendChild(tag);
          }
        }
        const ann = new mk.Annotation(new mk.Coordinate(o.lat, o.lng), () => box, {
          size: { width: o.size, height: o.size / 2 },
          displayPriority: o.z ?? 500,
          calloutEnabled: !!o.popup,
          callout: o.popup
            ? {
                calloutElementForAnnotation: () => {
                  const bubble = document.createElement('div');
                  bubble.className = 'mk-callout';
                  bubble.innerHTML = o.popup!();
                  o.onPopup?.(bubble, () => {});
                  return bubble;
                },
              }
            : undefined,
        });
        map.addAnnotation(ann);
        annotations.push(ann);
        return {
          move(lat, lng) {
            ann.coordinate = new mk.Coordinate(lat, lng);
          },
        };
      },

      line(points, style, info): LineHandle {
        const toCoords = (pts: [number, number][]) => pts.map(([a, b]) => new mk.Coordinate(a, b));
        const overlay = new mk.PolylineOverlay(toCoords(points), {
          style: new mk.Style({
            lineWidth: style.weight,
            strokeColor: style.color,
            strokeOpacity: style.opacity,
            lineJoin: 'round',
            lineCap: 'round',
          }),
          data: { info },
          enabled: !!info, // only shapes with info react to taps
        });
        map.addOverlay(overlay);
        overlays.push(overlay);
        return {
          setPoints(pts) {
            overlay.points = toCoords(pts);
          },
        };
      },

      circle(lat, lng, radiusM, style, info) {
        const overlay = new mk.CircleOverlay(new mk.Coordinate(lat, lng), radiusM, {
          style: new mk.Style({
            lineWidth: style.weight,
            strokeColor: style.color,
            strokeOpacity: style.opacity,
            fillColor: style.fillColor,
            fillOpacity: style.fillOpacity,
          }),
          data: { info },
          enabled: !!info,
        });
        map.addOverlay(overlay);
        overlays.push(overlay);
      },

      clear() {
        if (annotations.length) map.removeAnnotations(annotations);
        if (overlays.length) map.removeOverlays(overlays);
        annotations = [];
        overlays = [];
      },
      remove() {
        this.clear();
      },
    };
  }

  return {
    kind: 'apple',
    layer,
    fit(points, maxZoom = 15) {
      if (points.length === 0) return;
      const lats = points.map((p) => p[0]);
      const lngs = points.map((p) => p[1]);
      const region = new mk.BoundingRegion(
        Math.max(...lats),
        Math.max(...lngs),
        Math.min(...lats),
        Math.min(...lngs)
      ).toCoordinateRegion();
      // Breathing room, and never closer than roughly `maxZoom`.
      const minSpan = 360 / Math.pow(2, maxZoom) * 1.2;
      region.span = new mk.CoordinateSpan(
        Math.max(region.span.latitudeDelta * 1.3, minSpan),
        Math.max(region.span.longitudeDelta * 1.3, minSpan)
      );
      map.setRegionAnimated(region, true);
    },
    onClick(cb) {
      const handler = (e: { pointOnPage: { x: number; y: number } }) => {
        const c = map.convertPointOnPageToCoordinate(new DOMPoint(e.pointOnPage.x, e.pointOnPage.y));
        cb(c.latitude, c.longitude);
      };
      map.addEventListener('single-tap', handler as never);
      return () => map.removeEventListener('single-tap', handler as never);
    },
    resize() {
      /* MapKit tracks its container size itself */
    },
    destroy() {
      map.removeEventListener('select', onSelect as never);
      map.removeEventListener('deselect', onDeselect as never);
      map.destroy();
    },
  };
}
