'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TeamRow } from '@/lib/supabase/content-types';
import { teamColor } from '@/lib/team-colors';
import { rebuildVisitsAction, setShopFromTrucksAction, setVehicleTeamAction, syncNowAction } from './actions';

export interface VehicleView {
  id: string;
  name: string;
  vehicle: string;
  team: string | null;
  status: string;
  address: string | null;
  lastReported: string | null;
  events: number;
  backfillDay: string | null;
  backfillDone: boolean;
}

export interface VisitView {
  id: string;
  truck: string;
  place: string;
  clientCount: number;
  kind: string;
  arrivedAt: string;
  departedAt: string | null;
  minutes: number | null;
}

export interface LogRow {
  id: number;
  ran_at: string;
  source: string | null;
  vehicles: number | null;
  events: number | null;
  backfill_days: number | null;
  visits: number | null;
  ms: number | null;
  error: string | null;
}

// Fixed locale and time zone so server and browser render the same text.
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const when = (iso: string | null) => (iso ? fmt.format(new Date(iso)) : '—');

function fmtMins(m: number | null): string {
  if (m == null) return 'still there';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r ? `${r}m` : ''}`.trim() : `${r}m`;
}

const STATUS_COLOR: Record<string, string> = {
  Moving: 'var(--admin-ok)',
  Idle: 'var(--admin-warn)',
  Stopped: 'var(--admin-text-muted)',
};

export default function FleetPanel({
  vehicles,
  teams,
  log,
  visits,
  shop,
  totalEvents,
  fleetReady,
  cronReady,
  disabled,
}: {
  vehicles: VehicleView[];
  teams: TeamRow[];
  log: LogRow[];
  visits: VisitView[];
  shop: { address: string; lat: number; lng: number; radius_m: number } | null;
  totalEvents: number;
  fleetReady: boolean;
  cronReady: boolean;
  disabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'sync' | 'backfill' | 'shop' | 'rebuild'>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [teamOf, setTeamOf] = useState<Record<string, string | null>>(
    Object.fromEntries(vehicles.map((v) => [v.id, v.team]))
  );
  const stop = useRef(false);

  const backfilling = vehicles.filter((v) => !v.backfillDone).length;
  const lastRun = log[0];

  async function syncOnce() {
    setBusy('sync');
    setMsg(null);
    const res = await syncNowAction();
    setBusy(null);
    setMsg(
      res.ok
        ? { kind: 'ok', text: res.skipped ?? `Synced ${res.vehicles} trucks: ${res.events} new events, ${res.visits} visits updated.` }
        : { kind: 'err', text: res.error ?? 'Sync failed' }
    );
    router.refresh();
  }

  // Keep running passes until every truck's history is in (or Stop is pressed).
  async function backfillAll() {
    setBusy('backfill');
    stop.current = false;
    let events = 0;
    let days = 0;
    for (let i = 0; i < 200 && !stop.current; i++) {
      const res = await syncNowAction();
      if (!res.ok) {
        setMsg({ kind: 'err', text: res.error ?? 'Backfill failed' });
        break;
      }
      events += res.events;
      days += res.backfillDays;
      setMsg({ kind: 'ok', text: `Loading history… ${days} truck-days read, ${events} events saved, ${res.backfillRemaining} trucks to go.` });
      if (res.backfillRemaining === 0) {
        setMsg({ kind: 'ok', text: `History loaded: ${days} truck-days read, ${events} events saved.` });
        break;
      }
    }
    setBusy(null);
    router.refresh();
  }

  // Re-derive every stop from the saved events (used after matching rules change).
  async function rebuildStops() {
    setBusy('rebuild');
    stop.current = false;
    let total = 0;
    let cursor: Parameters<typeof rebuildVisitsAction>[0] = null;
    for (let i = 0; i < 400 && !stop.current; i++) {
      const res = await rebuildVisitsAction(cursor);
      if (res.error) {
        setMsg({ kind: 'err', text: res.error });
        break;
      }
      total += res.visits;
      if (!res.next) {
        setMsg({ kind: 'ok', text: `Stops rebuilt: ${total.toLocaleString('en-US')} stops across ${res.vehicles} trucks.` });
        break;
      }
      setMsg({ kind: 'ok', text: `Rebuilding stops… truck ${res.next.i + 1} of ${res.vehicles}, ${total.toLocaleString('en-US')} so far.` });
      cursor = res.next;
    }
    setBusy(null);
    router.refresh();
  }

  async function recenterShop() {
    setBusy('shop');
    setMsg(null);
    const res = await setShopFromTrucksAction();
    setBusy(null);
    setMsg(
      res.ok
        ? { kind: 'ok', text: `Shop re-centered on ${res.trucks} parked trucks.` }
        : { kind: 'err', text: res.error }
    );
    router.refresh();
  }

  async function changeTeam(id: string, team: string | null) {
    const prev = teamOf[id];
    setTeamOf((t) => ({ ...t, [id]: team }));
    const res = await setVehicleTeamAction(id, team);
    if (!res.ok) {
      setTeamOf((t) => ({ ...t, [id]: prev }));
      setMsg({ kind: 'err', text: res.error });
    }
  }

  return (
    <>
      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat-label">Trucks</div>
          <div className="admin-stat-value">{vehicles.length}</div>
          <div className="admin-stat-hint">
            {vehicles.filter((v) => teamOf[v.id]).length} assigned to a team
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Events saved</div>
          <div className="admin-stat-value">{totalEvents.toLocaleString('en-US')}</div>
          <div className="admin-stat-hint">
            {backfilling > 0 ? `History still loading for ${backfilling} truck${backfilling === 1 ? '' : 's'}` : 'History fully loaded'}
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Last sync</div>
          <div className="admin-stat-value" style={{ fontSize: '1rem' }}>{lastRun ? when(lastRun.ran_at) : 'Never'}</div>
          <div className="admin-stat-hint" style={lastRun?.error ? { color: 'var(--admin-danger)' } : undefined}>
            {lastRun?.error ?? (lastRun ? `${lastRun.events ?? 0} events · ${lastRun.source}` : 'Press Sync now')}
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Automatic sync</div>
          <div className="admin-stat-value">
            {cronReady ? <span className="admin-pill">Key set</span> : <span className="admin-pill admin-pill-warn">Needs setup</span>}
          </div>
          <div className="admin-stat-hint">
            {cronReady
              ? 'Runs every 10 minutes once the Supabase timer is added'
              : 'Add SUPABASE_SERVICE_ROLE_KEY on Vercel'}
          </div>
        </div>
      </div>

      <div className="admin-toolbar">
        <button className="admin-btn" onClick={syncOnce} disabled={disabled || !fleetReady || busy !== null}>
          {busy === 'sync' ? 'Syncing…' : 'Sync now'}
        </button>
        {busy === 'backfill' || busy === 'rebuild' ? (
          <button className="admin-btn admin-btn-secondary" onClick={() => (stop.current = true)}>
            Stop
          </button>
        ) : (
          <button
            className="admin-btn admin-btn-secondary"
            onClick={backfillAll}
            disabled={disabled || !fleetReady || busy !== null || (vehicles.length > 0 && backfilling === 0)}
            title="Pull up to 120 days of past events for every truck"
          >
            Load history
          </button>
        )}
        <button
          className="admin-btn admin-btn-secondary"
          onClick={rebuildStops}
          disabled={disabled || busy !== null || vehicles.length === 0}
          title="Re-work every stop from the saved GPS events, using the current client pins and rules"
        >
          {busy === 'rebuild' ? 'Rebuilding…' : 'Rebuild stops'}
        </button>
        {msg && (
          <span className="admin-field-hint" style={{ color: msg.kind === 'ok' ? 'var(--admin-ok)' : 'var(--admin-danger)' }}>
            {msg.text}
          </span>
        )}
        {!fleetReady && <span className="admin-field-hint">FleetLocate is not connected (see Dashboard).</span>}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table admin-table-fit">
          <colgroup>
            <col style={{ width: '18%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 90 }} />
            <col />
            <col style={{ width: 130 }} />
            <col style={{ width: 150 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Truck</th>
              <th>Vehicle</th>
              <th>Team</th>
              <th>Status</th>
              <th>Last position</th>
              <th>Reported</th>
              <th>Saved events</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={7} className="admin-table-empty">
                  No trucks yet. Press Sync now to pull them from FleetLocate.
                </td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{v.name}</td>
                <td className="muted">{v.vehicle || '—'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: teamColor(teamOf[v.id]), flexShrink: 0 }} />
                    <select
                      className="admin-select"
                      value={teamOf[v.id] ?? ''}
                      onChange={(e) => changeTeam(v.id, e.target.value || null)}
                      disabled={disabled}
                    >
                      <option value="">No team yet</option>
                      {teams.map((t) => (
                        <option key={t.id} value={String(t.number)}>
                          Team {t.number}
                          {t.name || t.lead_name ? ` · ${t.name || t.lead_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td style={{ color: STATUS_COLOR[v.status] ?? 'var(--admin-text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>
                  {v.status}
                </td>
                <td className="muted" title={v.address ?? undefined}>{v.address ?? '—'}</td>
                <td className="muted">{when(v.lastReported)}</td>
                <td className="muted">
                  {v.events.toLocaleString('en-US')}
                  {!v.backfillDone && (
                    <span className="admin-pill admin-pill-warn" style={{ marginLeft: 6 }} title="Still loading older history">
                      {v.backfillDay ? `back to ${v.backfillDay.slice(5)}` : 'history pending'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-summary">
        <section className="admin-card" style={{ marginBottom: 0 }}>
          <h2 className="admin-card-title">Shop location</h2>
          <p className="admin-card-desc">
            {shop
              ? `${shop.address} · stops within ${shop.radius_m} m count as “at the shop”.`
              : 'Not set yet.'}{' '}
            The street address pins at the road, so re-center it while the trucks are parked in the yard.
          </p>
          <button
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={recenterShop}
            disabled={disabled || !fleetReady || busy !== null}
          >
            {busy === 'shop' ? 'Working…' : 'Use where trucks are parked now'}
          </button>
        </section>

        <section className="admin-card" style={{ marginBottom: 0 }}>
          <h2 className="admin-card-title">Recent syncs</h2>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th className="num">Events</th>
                <th className="num">Visits</th>
                <th className="num">Took</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--admin-text-muted)' }}>None yet</td>
                </tr>
              )}
              {log.map((l) => (
                <tr key={l.id} title={l.error ?? undefined}>
                  <td style={l.error ? { color: 'var(--admin-danger)' } : undefined}>
                    {when(l.ran_at)} · {l.source}
                    {l.error ? ' · failed' : ''}
                  </td>
                  <td className="num">{l.events ?? 0}</td>
                  <td className="num">{l.visits ?? 0}</td>
                  <td className="num">{l.ms != null ? `${(l.ms / 1000).toFixed(1)}s` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-card" style={{ marginTop: 16 }}>
        <h2 className="admin-card-title">Recent stops</h2>
        <p className="admin-card-desc">
          The latest 40 stops across all trucks. A stop is linked to every client pin within 250 m of where the
          truck parked, since one parking spot often serves several neighbours. Its time is shared between them.
        </p>
        <div className="admin-summary" style={{ display: 'block', marginTop: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Truck</th>
                <th>Where</th>
                <th>Arrived</th>
                <th>Left</th>
                <th className="num">Time there</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--admin-text-muted)' }}>No stops recorded yet.</td>
                </tr>
              )}
              {visits.map((v) => (
                <tr key={v.id}>
                  <td>{v.truck}</td>
                  <td>
                    {v.kind === 'client' && (
                      <span className="admin-pill" style={{ marginRight: 6 }}>
                        {v.clientCount > 1 ? `${v.clientCount} clients` : 'Client'}
                      </span>
                    )}
                    {v.kind !== 'client' && v.kind !== 'other' ? (
                      <span className="admin-pill admin-pill-warn">{v.place}</span>
                    ) : (
                      v.place
                    )}
                  </td>
                  <td>{when(v.arrivedAt)}</td>
                  <td>{v.departedAt ? when(v.departedAt) : '—'}</td>
                  <td className="num">{fmtMins(v.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
