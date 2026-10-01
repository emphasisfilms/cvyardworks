'use client';

// FEATURE: trails — toggle that draws each truck's route so far today.

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import type { MapCtx } from '../map-types';
import { teamColor } from '@/lib/team-colors';
import { getTrailsAction } from './actions';

// Distinct line colours for trucks with no team yet.
const PALETTE = ['#1f6fb2', '#d97706', '#8e44ad', '#c0392b', '#0e8a83', '#b5651d', '#d6336c', '#4b5bd6', '#2f7a3e', '#5b6b60'];

export default function Trails({ ctx }: { ctx: MapCtx }) {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);

  useEffect(() => {
    const { map, L } = ctx;
    if (!on) return;
    const group = L.layerGroup().addTo(map);
    layer.current = group;
    let cancelled = false;

    const load = async () => {
      const res = await getTrailsAction();
      if (cancelled) return;
      if (!res.ok) return setNote(res.error);
      group.clearLayers();
      res.trails.forEach((t, i) => {
        const color = t.team ? teamColor(t.team) : PALETTE[i % PALETTE.length];
        L.polyline(t.points, { color, weight: 3, opacity: 0.75 })
          .bindTooltip(t.name, { sticky: true })
          .addTo(group);
      });
      setNote(res.trails.length ? `${res.trails.length} trucks out today` : 'No movement yet today');
    };
    load();
    const timer = setInterval(load, 120000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      group.remove();
      layer.current = null;
    };
  }, [on, ctx]);

  return (
    <label className="admin-field-hint gps-toggle" title="Draw where each truck has driven so far today">
      <input type="checkbox" className="admin-check" checked={on} onChange={(e) => { setOn(e.target.checked); setNote(null); }} />
      Today’s trails{on && note ? ` · ${note}` : ''}
    </label>
  );
}
