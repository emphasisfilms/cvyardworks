'use client';

// FEATURE: scorecard — pick a day, see each truck's totals.

import { useEffect, useState } from 'react';
import { teamColor } from '@/lib/team-colors';
import { etTime, etToday, fmtMins } from '../shared';
import { getScorecardAction, type ScoreRow } from './actions';

export default function Scorecard() {
  const [day, setDay] = useState(etToday());
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getScorecardAction(day);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setRows(res.rows);
        setMsg(null);
      } else {
        setMsg(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [day]);

  const worked = (rows ?? []).filter((r) => r.drivingMin > 0 || r.stops > 0);
  const total = (k: 'miles' | 'stops' | 'onSiteMin' | 'drivingMin' | 'idleMin') =>
    worked.reduce((t, r) => t + (r[k] ?? 0), 0);

  return (
    <section className="admin-card gps-scorecard">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <h2 className="admin-card-title" style={{ margin: 0 }}>Daily scorecard</h2>
        <input className="admin-input" type="date" value={day} max={etToday()} onChange={(e) => setDay(e.target.value)} style={{ width: 160 }} />
        {loading && <span className="admin-field-hint">Loading…</span>}
        {msg && <span className="admin-field-hint" style={{ color: 'var(--admin-danger)' }}>{msg}</span>}
      </div>
      <div className="admin-summary" style={{ display: 'block', marginTop: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Truck</th>
              <th>Left shop</th>
              <th>Back</th>
              <th className="num">Miles</th>
              <th className="num">Stops</th>
              <th className="num">On site</th>
              <th className="num">Driving</th>
              <th className="num" title="Engine running while parked">Idling</th>
            </tr>
          </thead>
          <tbody>
            {rows && worked.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: 'var(--admin-text-muted)' }}>No trucks went out that day.</td>
              </tr>
            )}
            {worked.map((r) => (
              <tr key={r.id}>
                <td>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: teamColor(r.team), display: 'inline-block', marginRight: 6 }} />
                  {r.name}
                </td>
                <td>{etTime(r.leftShop)}</td>
                <td>{etTime(r.backAtShop)}</td>
                <td className="num">{r.miles != null ? r.miles.toFixed(1) : '—'}</td>
                <td className="num" title={`${r.clientStops} at known clients`}>
                  {r.stops}
                  {r.clientStops > 0 ? ` (${r.clientStops})` : ''}
                </td>
                <td className="num">{fmtMins(r.onSiteMin)}</td>
                <td className="num">{fmtMins(r.drivingMin)}</td>
                <td className="num">{r.idleMin ? fmtMins(r.idleMin) : '—'}</td>
              </tr>
            ))}
            {worked.length > 1 && (
              <tr style={{ fontWeight: 700 }}>
                <td>Fleet total</td>
                <td />
                <td />
                <td className="num">{total('miles').toFixed(1)}</td>
                <td className="num">{total('stops')}</td>
                <td className="num">{fmtMins(total('onSiteMin'))}</td>
                <td className="num">{fmtMins(total('drivingMin'))}</td>
                <td className="num">{fmtMins(total('idleMin'))}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="admin-field-hint" style={{ marginTop: 8 }}>
        Stops in brackets are at known clients. Driving and idling are estimated from ping counts.
      </p>
    </section>
  );
}
