'use client';

// The admin map: client pins colored by team, live trucks, address lookup and
// hand-placed pins. Draws through the engine-neutral layer in src/lib/map-engine
// (Apple Maps, with an OpenStreetMap fallback), never a map library directly.

import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { CLIENT_DAYS, type ClientRow, type TeamRow } from '@/lib/supabase/content-types';
import { teamColor, UNASSIGNED_COLOR } from '@/lib/team-colors';
import { createEngine, type MapEngine, type MapLayer } from '@/lib/map-engine';
import { geocodeMissingAction, getFleetPositionsAction, setClientPinAction } from './actions';
import type { FleetAsset } from '@/lib/fleetlocate';
import type { MapCtx } from '@/features/gps/map-types';

// Walpole, NH — where the map opens when there are no pins yet.
const HOME: [number, number] = [43.0743, -72.4262];

function fmtMins(m: number | null): string {
  if (m == null) return '—';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r ? `${r}m` : ''}`.trim() : `${r}m`;
}

const TRUCK_COLORS: Record<FleetAsset['status'], string> = {
  Moving: '#2f7a3e',
  Idle: '#d97706',
  Stopped: '#4b5563',
  Unknown: '#9aa5a0',
};

const TRUCK_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="#fff" aria-hidden="true"><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7zM6 19a2 2 0 100-4 2 2 0 000 4zm11 0a2 2 0 100-4 2 2 0 000 4z"/></svg>';

function ago(iso: string | null): string {
  if (!iso) return 'unknown';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins)) return 'unknown';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} hr ago`;
  return `${Math.round(h / 24)} days ago`;
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
  fleetReady,
  appleReady,
  extras,
}: {
  rows: ClientRow[];
  setRows: Dispatch<SetStateAction<ClientRow[]>>;
  teams: TeamRow[];
  disabled: boolean;
  geoReady: boolean;
  fleetReady: boolean;
  appleReady: boolean; // Apple Maps keys are present on the server
  // Optional add-on tools drawn above the map. They get the live map to draw on.
  extras?: (ctx: MapCtx) => ReactNode;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const clientLayer = useRef<MapLayer | null>(null);
  const truckLayer = useRef<MapLayer | null>(null);

  const [day, setDay] = useState<string>('');
  const [team, setTeam] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [service, setService] = useState<'' | 'mow' | 'plow'>('');
  const [labels, setLabels] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [placing, setPlacing] = useState<ClientRow | null>(null);
  const [engine, setEngine] = useState<MapEngine | null>(null); // set once the map exists
  const [engineNote, setEngineNote] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null); // tapped line / circle (Apple)
  const [showTrucks, setShowTrucks] = useState(true);
  const [trucks, setTrucks] = useState<FleetAsset[]>([]);
  const [truckMsg, setTruckMsg] = useState<string | null>(null);
  const [truckTime, setTruckTime] = useState<string | null>(null);

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
        if (service === 'mow' && !r.mow) return false;
        if (service === 'plow' && !r.plow) return false;
        return r.lat != null && r.lng != null;
      }),
    [rows, day, team, showInactive, service]
  );

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let made: MapEngine | null = null;
    (async () => {
      if (!mapEl.current) return;
      const { engine: e, note } = await createEngine(mapEl.current, { apple: appleReady, center: HOME, onInfo: setInfo });
      if (cancelled) return e.destroy();
      made = e;
      clientLayer.current = e.layer();
      truckLayer.current = e.layer();
      setEngineNote(note);
      setEngine(e);
    })();
    return () => {
      cancelled = true;
      made?.destroy();
      clientLayer.current = null;
      truckLayer.current = null;
      setEngine(null);
    };
  }, [appleReady]);

  // While "Place pin" is active, the next click on the map sets that client's pin.
  useEffect(() => {
    if (!engine || !placing) return;
    const target = placing;
    return engine.onClick(async (lat, lng) => {
      setPlacing(null);
      const res = await setClientPinAction(target.id, lat, lng);
      if (res.ok) {
        setRows((rs) => rs.map((r) => (r.id === target.id ? { ...r, lat, lng, geocode_status: 'manual' } : r)));
        setGeoMsg(`Pin placed for ${target.name}.`);
      } else {
        setGeoMsg(`Couldn’t save pin: ${res.error}`);
      }
    });
  }, [engine, placing, setRows]);

  // Redraw client pins whenever the data or filters change.
  useEffect(() => {
    const layer = clientLayer.current;
    if (!engine || !layer) return;
    layer.clear();
    const pts: [number, number][] = [];
    for (const r of visible) {
      const color = r.active ? teamColor(r.current_team) : UNASSIGNED_COLOR;
      const teamLabel = r.current_team ? teamName.get(r.current_team) ?? `Team ${r.current_team}` : 'No team';
      const flags = [
        [r.mow ? 'Mow' : null, r.plow ? 'Plow' : null].filter(Boolean).join(' + ') || 'No services',
        r.required_day ? `Must be ${r.required_day}` : null,
        r.team_required ? 'Team required' : null,
        r.bagged ? 'Bagged' : null,
        r.sander ? 'Sander' : null,
        r.geocode_status === 'manual' ? 'Pin placed by hand' : null,
        !r.active ? 'Inactive' : null,
      ].filter((f): f is string => !!f);
      layer.pin({
        lat: r.lat!,
        lng: r.lng!,
        size: 20,
        html: `<span class="cvy-pin-dot" style="background:${color};opacity:${r.active ? 1 : 0.55}"></span>`,
        label: r.name,
        labelShown: labels,
        popup: () =>
          `<div class="cvy-pop">
            <strong>${esc(r.name)}</strong><br>${esc(r.address)}<br>
            <span style="color:${color};font-weight:600">${esc(teamLabel)}</span> · ${r.current_day ?? 'No day'} · ${fmtMins(r.service_minutes)}
            ${flags.length ? `<br><small>${flags.map(esc).join(' · ')}</small>` : ''}
            <div class="cvy-pop-extra" data-client="${r.id}"></div>
          </div>`,
        // Lets add-ons (e.g. the client-history feature) fill the empty slot.
        onPopup: (el, refresh) => {
          const slot = el.querySelector<HTMLElement>('.cvy-pop-extra');
          if (slot) document.dispatchEvent(new CustomEvent('cvy:client-popup', { detail: { clientId: r.id, slot, refresh } }));
        },
      });
      pts.push([r.lat!, r.lng!]);
    }
    engine.fit(pts, 15);
  }, [engine, visible, labels, teamName]);

  // Live trucks from FleetLocate: load when the map opens, refresh every minute.
  useEffect(() => {
    if (!fleetReady || !showTrucks) return;
    let cancelled = false;
    const load = async () => {
      const res = await getFleetPositionsAction();
      if (cancelled) return;
      if (res.ok) {
        setTrucks(res.assets);
        setTruckTime(res.fetchedAt);
        setTruckMsg(null);
      } else {
        setTruckMsg(res.error);
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [fleetReady, showTrucks]);

  // Draw trucks on their own layer so refreshing them never moves the view.
  useEffect(() => {
    const layer = truckLayer.current;
    if (!engine || !layer) return;
    layer.clear();
    if (!showTrucks) return;
    for (const t of trucks) {
      if (t.lat == null || t.lng == null) continue;
      const color = TRUCK_COLORS[t.status];
      layer.pin({
        lat: t.lat,
        lng: t.lng,
        size: 26,
        z: 1000,
        html: `<span class="cvy-truck-box" style="background:${color}">${TRUCK_SVG}</span>`,
        label: t.name,
        labelShown: labels,
        labelClass: 'cvy-label-truck',
        popup: () =>
          `<div class="cvy-pop">
            <strong>${esc(t.name)}</strong>${t.vehicle ? `<br>${esc(t.vehicle)}` : ''}<br>
            <span style="color:${color};font-weight:600">${t.status}</span>${t.status === 'Moving' && t.speed != null ? ` · ${t.speed} mph` : ''}
            ${t.address ? `<br>${esc(t.address)}` : ''}
            <br><small>Reported ${ago(t.lastReported)}</small>
          </div>`,
      });
    }
  }, [engine, trucks, showTrucks, labels]);

  // Look up any un-pinned addresses automatically when the map opens.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !geoReady || disabled || geocoding) return;
    if (missing.length === 0) return;
    autoRan.current = true;
    runGeocode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoReady, disabled, missing.length]);

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
  const ctx = useMemo<MapCtx | null>(() => (engine ? { engine } : null), [engine]);

  return (
    <>
      {!geoReady && (
        <div className="admin-notice">
          The map needs the coordinates columns. In the Supabase SQL Editor run{' '}
          <code>supabase/migrations/007_clients_geo.sql</code> once, then reload.
        </div>
      )}
      {engineNote && <div className="admin-notice">{engineNote}</div>}

      <div className="admin-toolbar">
        <select className="admin-select" value={service} onChange={(e) => setService(e.target.value as '' | 'mow' | 'plow')} style={{ width: 150 }}>
          <option value="">All services</option>
          <option value="mow">Mow (summer)</option>
          <option value="plow">Plow (winter)</option>
        </select>
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
        <label className="admin-field-hint gps-toggle">
          <input type="checkbox" className="admin-check" checked={labels} onChange={(e) => setLabels(e.target.checked)} />
          Names
        </label>
        <label className="admin-field-hint gps-toggle">
          <input type="checkbox" className="admin-check" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Inactive
        </label>
        <label
          className="admin-field-hint gps-toggle"
          style={{ cursor: fleetReady ? 'pointer' : 'not-allowed' }}
          title={fleetReady ? 'Live truck positions from FleetLocate' : 'FleetLocate is not connected yet (see Dashboard)'}
        >
          <input
            type="checkbox"
            className="admin-check"
            checked={showTrucks && fleetReady}
            disabled={!fleetReady}
            onChange={(e) => setShowTrucks(e.target.checked)}
          />
          Trucks
          {fleetReady && showTrucks && trucks.length > 0 && ` (${trucks.filter((t) => t.lat != null).length})`}
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
                {geocoding ? 'Looking up addresses…' : 'Find addresses'}
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
      {truckMsg && showTrucks && (
        <p className="admin-field-hint" style={{ marginBottom: 10, color: 'var(--admin-danger)' }}>
          Trucks: {truckMsg}
        </p>
      )}

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

      {ctx && extras?.(ctx)}

      <div className="cvy-map-wrap">
        <div ref={mapEl} className="cvy-map" style={placing ? { cursor: 'crosshair' } : undefined} />
        {/* Apple has no hover tooltips on lines and circles: a tapped shape's details show here. */}
        {info && <div className="cvy-map-info" dangerouslySetInnerHTML={{ __html: info }} />}
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
          {fleetReady && showTrucks && trucks.length > 0 && (
            <>
              <span className="cvy-legend-item">
                <span className="cvy-dot cvy-dot-sq" style={{ background: TRUCK_COLORS.Moving }} />
                Truck moving
              </span>
              <span className="cvy-legend-item">
                <span className="cvy-dot cvy-dot-sq" style={{ background: TRUCK_COLORS.Idle }} />
                idling
              </span>
              <span className="cvy-legend-item">
                <span className="cvy-dot cvy-dot-sq" style={{ background: TRUCK_COLORS.Stopped }} />
                stopped
              </span>
            </>
          )}
          <span className="cvy-legend-item" style={{ marginLeft: 'auto' }}>
            {visible.length} pin{visible.length === 1 ? '' : 's'} shown
            {truckTime && showTrucks ? ` · trucks updated ${ago(truckTime)}` : ''}
          </span>
        </div>
      </div>

      {failed.length > 0 && (
        <section className="admin-card" style={{ marginTop: 16 }}>
          <h2 className="admin-card-title">Addresses not found</h2>
          <p className="admin-card-desc">
            Fix the address on Clients &amp; Routes and it will be looked up again, or place the pin by hand.
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
