'use client';

// FEATURE: status-board — live list of every truck and what it is doing.
// Refreshes the page data every minute while open.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teamColor } from '@/lib/team-colors';
import { etTime, fmtMins } from '../shared';
import type { StatusBoardData } from './data';

const ORDER: Record<string, number> = { Moving: 0, Idle: 1, Stopped: 2, Unknown: 3 };
const DOT: Record<string, string> = { Moving: 'var(--admin-ok)', Idle: 'var(--admin-warn)', Stopped: 'var(--admin-text-dim)' };

export default function StatusBoard({ data }: { data: StatusBoardData }) {
  const router = useRouter();
  const { rows } = data;
  // Durations are measured from when the server took the snapshot, so the
  // text is identical on server and browser. A refresh brings a new snapshot.
  const now = new Date(data.asOf).getTime();

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60000);
    return () => clearInterval(t);
  }, [router]);

  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3) || a.name.localeCompare(b.name, undefined, { numeric: true }));
  const moving = rows.filter((r) => r.status === 'Moving').length;
  const mins = (iso: string) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

  return (
    <section className="admin-card gps-status">
      <h2 className="admin-card-title">Right now</h2>
      <p className="admin-card-desc">
        {moving} of {rows.length} trucks on the move. Updates every minute.
      </p>
      <ul className="gps-status-list">
        {sorted.map((r) => {
          const stale = r.lastReported ? now - new Date(r.lastReported).getTime() > 3 * 3600000 : false;
          return (
            <li key={r.id}>
              <span className="gps-status-dot" style={{ background: DOT[r.status] ?? DOT.Stopped }} />
              <span className="gps-status-name">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: teamColor(r.team), display: 'inline-block', marginRight: 6 }} />
                {r.name}
              </span>
              <span className="gps-status-text">
                {r.status === 'Moving' ? (
                  <>Driving{r.address ? ` on ${r.address}` : ''}{r.speed ? ` · ${r.speed} mph` : ''}</>
                ) : r.place ? (
                  <>
                    At <strong>{r.place.label}</strong>
                    {` for ${fmtMins(mins(r.place.since))}`} (since {etTime(r.place.since)})
                    {r.status === 'Idle' ? ' · engine running' : ''}
                  </>
                ) : (
                  <>
                    {r.status === 'Idle' ? 'Idling' : 'Parked'}
                    {r.address ? ` at ${r.address}` : ''}
                  </>
                )}
              </span>
              <span className="gps-status-age" style={stale ? { color: 'var(--admin-warn)' } : undefined}>
                {r.lastReported ? `reported ${etTime(r.lastReported)}` : 'no report'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
