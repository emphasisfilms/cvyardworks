'use client';

// FEATURE: trails — toggle that draws each truck's route so far today.

import { useEffect, useState } from 'react';
import type { MapCtx } from '../map-types';
import { esc } from '../shared';
import { teamColor } from '@/lib/team-colors';
import { getTrailsAction } from './actions';

// Distinct line colours for trucks with no team yet.
const PALETTE = ['#1f6fb2', '#d97706', '#8e44ad', '#c0392b', '#0e8a83', '#b5651d', '#d6336c', '#4b5bd6', '#2f7a3e', '#5b6b60'];

export default function Trails({ ctx }: { ctx: MapCtx }) {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!on) return;
    const layer = ctx.engine.layer();
    let cancelled = false;

    const load = async () => {
      const res = await getTrailsAction();
      if (cancelled) return;
      if (!res.ok) return setNote(res.error);
      layer.clear();
      res.trails.forEach((t, i) => {
        const color = t.team ? teamColor(t.team) : PALETTE[i % PALETTE.length];
        layer.line(t.points, { color, weight: 3, opacity: 0.75 }, `<strong>${esc(t.name)}</strong> · today’s route`);
      });
      setNote(res.trails.length ? `${res.trails.length} trucks out today` : 'No movement yet today');
    };
    load();
    const timer = setInterval(load, 120000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      layer.remove();
    };
  }, [on, ctx]);

  return (
    <label className="admin-field-hint gps-toggle" title="Draw where each truck has driven so far today">
      <input type="checkbox" className="admin-check" checked={on} onChange={(e) => { setOn(e.target.checked); setNote(null); }} />
      Today’s trails{on && note ? ` · ${note}` : ''}
    </label>
  );
}
