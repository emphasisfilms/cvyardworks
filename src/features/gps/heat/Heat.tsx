'use client';

// FEATURE: heat — toggle that shows where trucks have spent the most time.

import { useEffect, useState } from 'react';
import type { MapCtx } from '../map-types';
import { esc, fmtMins } from '../shared';
import { getHeatAction } from './actions';

export default function Heat({ ctx }: { ctx: MapCtx }) {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const { map, L } = ctx;
    if (!on) return;
    const group = L.layerGroup().addTo(map);
    let cancelled = false;

    (async () => {
      const res = await getHeatAction();
      if (cancelled) return;
      if (!res.ok) return setNote(res.error);
      const max = Math.max(1, ...res.spots.map((s) => s.minutes));
      for (const s of res.spots) {
        const share = Math.sqrt(s.minutes / max); // area, not radius, tracks time
        L.circle([s.lat, s.lng], {
          radius: 60 + share * 420, // metres
          color: '#c0392b',
          weight: 1,
          opacity: 0.5,
          fillColor: '#e4572e',
          fillOpacity: 0.12 + share * 0.4,
        })
          .bindTooltip(`${s.label ? `${esc(s.label)}<br>` : ''}<strong>${fmtMins(s.minutes)}</strong> over ${s.visits} stop${s.visits === 1 ? '' : 's'}`)
          .addTo(group);
      }
      setNote(`${res.spots.length} places`);
    })();

    return () => {
      cancelled = true;
      group.remove();
    };
  }, [on, ctx]);

  return (
    <label className="admin-field-hint gps-toggle" title="Bubbles sized by total time trucks have spent there this season">
      <input type="checkbox" className="admin-check" checked={on} onChange={(e) => { setOn(e.target.checked); setNote(null); }} />
      Time heat map{on && note ? ` · ${note}` : ''}
    </label>
  );
}
