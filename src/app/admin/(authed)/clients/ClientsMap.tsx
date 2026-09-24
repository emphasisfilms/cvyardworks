'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CLIENT_DAYS, type ClientRow, type TeamRow } from '@/lib/supabase/content-types';
import { teamColor, UNASSIGNED_COLOR } from '@/lib/team-colors';
import { geocodeMissingAction, setClientPinAction } from './actions';

// Walpole, NH — where the map opens when there are no pins yet.
const HOME: [number, number] = [43.0743, -72.4262];

function fmtMins(m: number | null): string {
  if (m == null) return '—';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r ? `${r}m` : ''}`.trim() : `${r}m`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function ClientsMap({
  rows,
  setRows,
  teams,
  disabled,
  geoReady,
}: {
  rows: ClientRow[];
  setRows: Dispatch<SetStateAction<ClientRow[]>>;
  teams: TeamRow[];
  disabled: boolean;
  geoReady: boolean;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);

  const [day, setDay] = useState<string>('');
  const [team, setTeam] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [labels, setLabels] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [placing, setPlacing] = useState<ClientRow | null>(null);
  const [ready, setReady] = useState(false); // flips once Leaflet has built the map
  const placingRef = useRef<ClientRow | null>(null);
  placingRef.current = placing;

  const teamName = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) m.set(String(t.number), t.name || t.lead_name ? `Team ${t.number} · ${t.name || t.lead_name}` : `Team ${t.number}`);
    return m;
  }, [teams]);

  const missing = rows.filter((r) => r.active && r.address && r.lat == null && r.geocode_status !== 'failed');
  const failed = rows.filter((r) => r.active && r.address && r.lat == null && r.geocode_status === 'failed');

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (!showInactive && !r.active) return false;
        if (day && (r.current_day ?? '') !== day) return false;
        if (team && (r.current_team ?? '') !== team) return false;
        return r.lat != null && r.lng != null;
      }),
    [rows, day, team, showInactive]
  );

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current, { center: HOME, zoom: 11, scrollWheelZoom: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on('click', async (e: Leaflet.LeafletMouseEvent) => {
        const target = placingRef.current;
        if (!target) return;
        setPlacing(null);
        const res = await setClientPinAction(target.id, e.latlng.lat, e.latlng.lng);
        if (res.ok) {
          setRows((rs) =>
            rs.map((r) => (r.id === target.id ? { ...r, lat: e.latlng.lat, lng: e.latlng.lng, geocode_status: 'manual' } : r))
          );
          setGeoMsg(`Pin placed for ${target.name}.`);
        } else {
          setGeoMsg(`Couldn’t save pin: ${res.error}`);
        }
      });
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      setReady(false);
    };
  }, [setRows]);

  // Redraw pins whenever the data or filters change (and once the map is ready).
  useEffect(() => {
    if (!ready) return;
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    const pts: Leaflet.LatLngExpression[] = [];
    for (const r of visible) {
      const color = r.active ? teamColor(r.current_team) : UNASSIGNED_COLOR;
      const m = L.circleMarker([r.lat!, r.lng!], {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: r.active ? 0.95 : 0.5,
      });
      const teamLabel = r.current_team ? teamName.get(r.current_team) ?? `Team ${r.current_team}` : 'No team';
      const flags = [
        r.required_day ? `Must be ${r.required_day}` : null,
        r.team_required ? 'Team required' : null,
        r.bagged ? 'Bagged' : null,
        r.geocode_status === 'manual' ? 'Pin placed by hand' : null,
        !r.active ? 'Inactive' : null,
      ].filter(Boolean);
      m.bindPopup(
        `<div class="cvy-pop">
          <strong>${esc(r.name)}</strong><br>${esc(r.address)}<br>
          <span style="color:${color};font-weight:600">${esc(teamLabel)}</span> · ${r.current_day ?? 'No day'} · ${fmtMins(r.service_minutes)}
          ${flags.length ? `<br><small>${flags.map(esc as (s: string | null) => string).join(' · ')}</small>` : ''}
        </div>`
      );
      if (labels) {
        m.bindTooltip(r.name, { permanent: true, direction: 'right', offset: [10, 0], className: 'cvy-label' });
      } else {
        m.bindTooltip(r.name, { direction: 'top' });
      }
      m.addTo(layer);
      pts.push([r.lat!, r.lng!]);
    }
    if (pts.length) {
      map.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 15 });
    }
  }, [ready, visible, labels, teamName]);

  // Leaflet needs a nudge when its container appears after being hidden.
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => clearTimeout(t);
  });

  async function runGeocode(retryFailed: boolean) {
    setGeocoding(true);
    setGeoMsg(null);
    let done = 0;
    let found = 0;
    for (let i = 0; i < 40; i++) {
      const res = await geocodeMissingAction(retryFailed && i === 0);
      if (!res.ok) {
        setGeoMsg(`Geocoding stopped: ${res.error}`);
        break;
      }
      const byId = new Map(res.updated.map((u) => [u.id, u]));
      setRows((rs) => rs.map((r) => (byId.has(r.id) ? { ...r, ...byId.get(r.id)! } : r)));
      done += res.updated.length;
      found += res.updated.filter((u) => u.geocode_status === 'ok').length;
      setGeoMsg(`Looked up ${done} address${done === 1 ? '' : 'es'}, ${found} found…`);
      if (res.updated.length === 0 || res.remaining === 0) break;
    }
    setGeoMsg(
      done === 0
        ? 'Nothing to look up.'
        : `Looked up ${done} address${done === 1 ? '' : 'es'}: ${found} found${done - found ? `, ${done - found} not found` : ''}.`
    );
    setGeocoding(false);
  }

  const teamsInUse = Array.from(new Set(rows.map((r) => r.current_team).filter(Boolean) as string[])).sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );

  return (
    <>
      {!geoReady && (
        <div className="admin-notice">
          The map needs the coordinates columns. In the Supabase SQL Editor run{' '}
          <code>supabase/migrations/007_clients_geo.sql</code> once, then reload.
        </div>
      )}

      <div className="admin-toolbar">
        <select className="admin-select" value={day} onChange={(e) => setDay(e.target.value)} style={{ width: 130 }}>
          <option value="">All days</option>
          {CLIENT_DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select className="admin-select" value={team} onChange={(e) => setTeam(e.target.value)} style={{ width: 200 }}>
          <option value="">All teams</option>
          {teamsInUse.map((t) => (
            <option key={t} value={t}>
              {teamName.get(t) ?? `Team ${t}`}
            </option>
          ))}
        </select>
        <label className="admin-field-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" className="admin-check" style={{ width: 15, height: 15 }} checked={labels} onChange={(e) => setLabels(e.target.checked)} />
          Names
        </label>
        <label className="admin-field-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" className="admin-check" style={{ width: 15, height: 15 }} checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Inactive
        </label>
        <span className="spacer" />
        {(missing.length > 0 || failed.length > 0) && geoReady && (
          <>
            <span className="admin-field-hint">
              {missing.length > 0 ? `${missing.length} not on the map yet` : ''}
              {missing.length > 0 && failed.length > 0 ? ' · ' : ''}
              {failed.length > 0 ? `${failed.length} not found` : ''}
            </span>
            {missing.length > 0 && (
              <button className="admin-btn admin-btn-sm" onClick={() => runGeocode(false)} disabled={disabled || geocoding}>
                {geocoding ? 'Looking up…' : 'Find addresses'}
              </button>
            )}
            {failed.length > 0 && missing.length === 0 && (
              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => runGeocode(true)} disabled={disabled || geocoding}>
                {geocoding ? 'Looking up…' : 'Retry not found'}
              </button>
            )}
          </>
        )}
      </div>

      {geoMsg && <p className="admin-field-hint" style={{ marginBottom: 10 }}>{geoMsg}</p>}

      {placing && (
        <div className="admin-notice" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>
            Click the map where <strong>{placing.name}</strong> is ({placing.address}).
          </span>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setPlacing(null)}>
            Cancel
          </button>
        </div>
      )}

      <div className="cvy-map-wrap">
        <div ref={mapEl} className="cvy-map" style={placing ? { cursor: 'crosshair' } : undefined} />
        <div className="cvy-legend">
          {teamsInUse.map((t) => (
            <span key={t} className="cvy-legend-item">
              <span className="cvy-dot" style={{ background: teamColor(t) }} />
              {teamName.get(t) ?? `Team ${t}`}
            </span>
          ))}
          {rows.some((r) => r.active && !r.current_team && r.lat != null) && (
            <span className="cvy-legend-item">
              <span className="cvy-dot" style={{ background: UNASSIGNED_COLOR }} />
              No team
            </span>
          )}
          <span className="cvy-legend-item" style={{ marginLeft: 'auto' }}>
            {visible.length} pin{visible.length === 1 ? '' : 's'} shown
          </span>
        </div>
      </div>

      {failed.length > 0 && (
        <section className="admin-card" style={{ marginTop: 16 }}>
          <h2 className="admin-card-title">Addresses not found</h2>
          <p className="admin-card-desc">
            Fix the address on the Table tab and it will be looked up again, or place the pin by hand.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {failed.map((r) => (
              <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                <strong>{r.name}</strong>
                <span style={{ color: 'var(--admin-text-muted)', flex: 1 }}>{r.address}</span>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setPlacing(r)} disabled={disabled}>
                  Place pin
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
