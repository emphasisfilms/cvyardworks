'use client';

// FEATURE: replay — pick a truck and a date, then play its day back on the map.
// Everything it draws lives in its own layer and is removed when closed.

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import type { MapCtx } from '../map-types';
import { esc, etTime, etToday, fmtMins } from '../shared';
import { getReplayAction, listReplayVehiclesAction, type ReplayData } from './actions';

const SPEEDS = [
  { label: '1 min/sec', rate: 60 },
  { label: '5 min/sec', rate: 300 },
  { label: '15 min/sec', rate: 900 },
];

const STOP_COLORS: Record<string, string> = { client: '#2f7a3e', shop: '#b7791f', dump: '#8e5a2b', other: '#5b6b60' };

export default function Replay({ ctx }: { ctx: MapCtx }) {
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [day, setDay] = useState(etToday());
  const [data, setData] = useState<ReplayData | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(SPEEDS[1].rate);
  const [clock, setClock] = useState(0); // simulated time, epoch ms

  const group = useRef<Leaflet.LayerGroup | null>(null);
  const marker = useRef<Leaflet.CircleMarker | null>(null);
  const done = useRef<Leaflet.Polyline | null>(null);

  // Truck list, once, when the panel first opens.
  useEffect(() => {
    if (!open || vehicles.length) return;
    listReplayVehiclesAction().then((v) => {
      setVehicles(v);
      if (v[0]) setVehicleId((cur) => cur || v[0].id);
    });
  }, [open, vehicles.length]);

  // Draw the day when data arrives; clean up when it changes or the panel closes.
  useEffect(() => {
    if (!open || !data || data.points.length === 0) return;
    const { map, L } = ctx;
    const g = L.layerGroup().addTo(map);
    group.current = g;
    const latlngs = data.points.map((p) => [p.lat, p.lng] as [number, number]);
    L.polyline(latlngs, { color: '#1f6fb2', weight: 3, opacity: 0.3 }).addTo(g);
    done.current = L.polyline([], { color: '#1f6fb2', weight: 4, opacity: 0.9 }).addTo(g);
    for (const s of data.stops) {
      L.circleMarker([s.lat, s.lng], {
        radius: Math.min(16, 5 + Math.sqrt(s.minutes ?? 4)),
        color: '#ffffff',
        weight: 2,
        fillColor: STOP_COLORS[s.kind] ?? STOP_COLORS.other,
        fillOpacity: 0.85,
      })
        .bindTooltip(
          `<strong>${esc(s.label)}</strong><br>${etTime(s.arrived)} – ${s.departed ? etTime(s.departed) : 'still there'} · ${fmtMins(s.minutes)}`
        )
        .addTo(g);
    }
    marker.current = L.circleMarker(latlngs[0], {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#16211a',
      fillOpacity: 1,
    }).addTo(g);
    map.fitBounds(L.latLngBounds(latlngs).pad(0.15), { maxZoom: 15 });

    return () => {
      g.remove();
      group.current = null;
      marker.current = null;
      done.current = null;
    };
  }, [open, data, ctx]);

  // Move the truck to wherever the clock says it was.
  useEffect(() => {
    if (!data || data.points.length === 0 || !marker.current || !done.current) return;
    const pts = data.points;
    let i = 0;
    while (i < pts.length - 1 && pts[i + 1].t <= clock) i++;
    const a = pts[i];
    const b = pts[Math.min(i + 1, pts.length - 1)];
    const f = b.t > a.t ? Math.min(1, Math.max(0, (clock - a.t) / (b.t - a.t))) : 0;
    const pos: [number, number] = [a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f];
    marker.current.setLatLng(pos);
    done.current.setLatLngs([...pts.slice(0, i + 1).map((p) => [p.lat, p.lng] as [number, number]), pos]);
  }, [clock, data]);

  // The clock ticks while playing.
  useEffect(() => {
    if (!playing || !data || data.points.length === 0) return;
    const end = data.points[data.points.length - 1].t;
    const timer = setInterval(() => {
      setClock((c) => {
        const next = c + rate * 100; // 100 ms of real time
        if (next >= end) {
          setPlaying(false);
          return end;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [playing, rate, data]);

  async function load() {
    if (!vehicleId) return;
    setLoading(true);
    setMsg(null);
    setPlaying(false);
    const res = await getReplayAction(vehicleId, day);
    setLoading(false);
    if (!res.ok) {
      setData(null);
      return setMsg(res.error);
    }
    if (res.data.points.length === 0) {
      setData(null);
      return setMsg('No GPS data for that truck on that day.');
    }
    setData(res.data);
    setClock(res.data.points[0].t);
    setPlaying(true);
  }

  function close() {
    setOpen(false);
    setPlaying(false);
    setData(null);
    setMsg(null);
  }

  if (!open) {
    return (
      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setOpen(true)} title="Play back a truck's day on the map">
        ▶ Replay a day
      </button>
    );
  }

  const start = data?.points[0]?.t ?? 0;
  const end = data?.points[data.points.length - 1]?.t ?? 0;
  const here = data?.stops.find(
    (s) => new Date(s.arrived).getTime() <= clock && (!s.departed || new Date(s.departed).getTime() >= clock)
  );

  return (
    <div className="gps-replay">
      <select className="admin-select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={{ width: 150 }}>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <input className="admin-input" type="date" value={day} max={etToday()} onChange={(e) => setDay(e.target.value)} style={{ width: 150 }} />
      <button className="admin-btn admin-btn-sm" onClick={load} disabled={loading || !vehicleId}>
        {loading ? 'Loading…' : 'Load'}
      </button>

      {data && (
        <>
          <button
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={() => {
              if (!playing && clock >= end) setClock(start); // finished: start over
              setPlaying((p) => !p);
            }}
            style={{ minWidth: 64 }}
          >
            {playing ? 'Pause' : clock >= end ? 'Replay' : 'Play'}
          </button>
          <input
            type="range"
            min={start}
            max={end}
            step={1000}
            value={clock}
            onChange={(e) => {
              setClock(Number(e.target.value));
            }}
            onMouseDown={() => setPlaying(false)}
            className="gps-replay-slider"
            aria-label="Time of day"
          />
          <select className="admin-select" value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: 120 }}>
            {SPEEDS.map((s) => (
              <option key={s.rate} value={s.rate}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="admin-field-hint" style={{ minWidth: 190 }}>
            <strong>{etTime(new Date(clock).toISOString())}</strong>
            {here ? ` · at ${here.label}` : ' · driving'}
          </span>
        </>
      )}
      {msg && <span className="admin-field-hint" style={{ color: 'var(--admin-danger)' }}>{msg}</span>}
      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={close}>
        Close
      </button>
    </div>
  );
}
