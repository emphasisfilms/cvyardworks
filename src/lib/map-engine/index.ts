// Picks the map engine. Apple Maps when it is configured and starts cleanly,
// otherwise the OpenStreetMap fallback so the page is never blank.

import type { EngineOptions, MapEngine } from './types';

export type { MapEngine, MapLayer, PinHandle, LineHandle, PinOptions } from './types';

export async function createEngine(
  el: HTMLElement,
  opts: EngineOptions & { apple: boolean }
): Promise<{ engine: MapEngine; note: string | null }> {
  if (opts.apple) {
    try {
      const { createAppleEngine } = await import('./apple-engine');
      return { engine: await createAppleEngine(el, opts), note: null };
    } catch (e) {
      el.innerHTML = ''; // clear anything Apple left behind before the fallback draws
      const { createLeafletEngine } = await import('./leaflet-engine'); // fallback (removable)
      return {
        engine: await createLeafletEngine(el, opts),
        note: `${(e as Error).message}. Showing the standard map instead.`,
      };
    }
  }
  const { createLeafletEngine } = await import('./leaflet-engine'); // fallback (removable)
  return {
    engine: await createLeafletEngine(el, opts),
    note: 'Apple Maps is not set up yet (add APPLE_MAPS_TEAM_ID, APPLE_MAPS_KEY_ID and APPLE_MAPS_PRIVATE_KEY on Vercel). Showing the standard map.',
  };
}
