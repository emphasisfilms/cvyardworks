'use client';

// The row of GPS tools above the map. Each feature is one line here and one
// folder beside this file — delete both to remove it. See docs/GPS-FEATURES.md.

import type { MapCtx } from './map-types';
import Replay from './replay/Replay';                       // feature: replay
import Trails from './trails/Trails';                       // feature: trails
import Heat from './heat/Heat';                             // feature: heat
import ClientHistory from './client-history/ClientHistory'; // feature: client-history

export default function MapGpsTools({ ctx }: { ctx: MapCtx }) {
  return (
    <div className="admin-toolbar gps-tools">
      <span className="admin-field-hint" style={{ fontWeight: 600 }}>GPS</span>
      <Trails ctx={ctx} />          {/* feature: trails */}
      <Heat ctx={ctx} />            {/* feature: heat */}
      <Replay ctx={ctx} />          {/* feature: replay */}
      <ClientHistory ctx={ctx} />   {/* feature: client-history (no button; fills client popups) */}
    </div>
  );
}
