'use client';

// FEATURE: suggested-clients — collapsible panel above the clients table.
// Lists places trucks keep stopping that are not clients yet; one click adds
// the client with address, usual day, service time and map pin filled in.

import { useState } from 'react';
import type { ClientRow } from '@/lib/supabase/content-types';
import { etDate, fmtMins } from '../shared';
import { addSuggestedClientAction, dismissSuggestionAction, getSuggestionsAction } from './actions';
import type { Suggestion } from './types';

export default function SuggestedClients({ onAdded }: { onAdded: (row: ClientRow) => void }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Suggestion[] | null>(null);
  const [total, setTotal] = useState(0);
  const [showOther, setShowOther] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    const res = await getSuggestionsAction();
    if (!res.ok) return setMsg(res.error);
    setList(res.suggestions);
    setTotal(res.likelyTotal);
    // Default each name to the street part of the address; staff rename as needed.
    setNames(Object.fromEntries(res.suggestions.map((s) => [s.key, s.address.split(',')[0]])));
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && list === null) load();
  }

  async function add(s: Suggestion) {
    setBusy(s.key);
    setMsg(null);
    const res = await addSuggestedClientAction({ name: names[s.key] ?? '', suggestion: s });
    setBusy(null);
    if (!res.ok) return setMsg(res.error);
    onAdded(res.row);
    setList((l) => (l ?? []).filter((x) => x.key !== s.key));
    if (s.likely) setTotal((t) => Math.max(0, t - 1));
  }

  async function dismiss(s: Suggestion) {
    setBusy(s.key);
    const res = await dismissSuggestionAction({ lat: s.lat, lng: s.lng, label: s.address });
    setBusy(null);
    if (!res.ok) return setMsg(res.error ?? 'Could not dismiss');
    setList((l) => (l ?? []).filter((x) => x.key !== s.key));
    if (s.likely) setTotal((t) => Math.max(0, t - 1));
  }

  const likely = (list ?? []).filter((s) => s.likely);
  const other = (list ?? []).filter((s) => !s.likely);
  const shown = showOther ? [...likely, ...other] : likely;

  return (
    <section className="admin-card gps-suggest">
      <button type="button" className="gps-suggest-head" onClick={toggle} aria-expanded={open}>
        <span>
          <strong>Suggested clients from GPS</strong>
          <span className="admin-field-hint" style={{ marginLeft: 10 }}>
            Places the trucks keep stopping that aren’t in the table yet
          </span>
        </span>
        <span className="admin-pill">{open ? 'Hide' : list ? `${total} to review` : 'Show'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {msg && <p className="admin-field-hint" style={{ color: 'var(--admin-danger)', marginBottom: 8 }}>{msg}</p>}
          {list === null && !msg && <p className="admin-field-hint">Looking through the truck history…</p>}
          {list && list.length === 0 && (
            <p className="admin-field-hint">Nothing to suggest right now. Every regular stop is already a client or has been dismissed.</p>
          )}
          {list && shown.length > 0 && (
            <ul className="gps-suggest-list">
              {shown.map((s) => (
                <li key={s.key} style={s.likely ? undefined : { opacity: 0.75 }}>
                  <input
                    className="admin-input"
                    value={names[s.key] ?? ''}
                    onChange={(e) => setNames((n) => ({ ...n, [s.key]: e.target.value }))}
                    placeholder="Client name"
                    aria-label="Client name"
                  />
                  <div className="gps-suggest-info">
                    <div>{s.address}</div>
                    <div className="admin-field-hint">
                      {!s.likely && <span className="admin-pill admin-pill-warn" style={{ marginRight: 6 }}>short, frequent</span>}
                      {s.stops} stops on {s.days} days
                      {s.weekday ? ` · usually ${s.weekday}` : ''} · about {fmtMins(s.minutes)} · {s.trucks.join(', ')} · last {etDate(s.lastAt)}
                    </div>
                  </div>
                  <button className="admin-btn admin-btn-sm" onClick={() => add(s)} disabled={busy !== null}>
                    {busy === s.key ? 'Adding…' : 'Add as client'}
                  </button>
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => dismiss(s)} disabled={busy !== null} title="Gas station, lunch spot, dump… never suggest this place again">
                    Not a client
                  </button>
                </li>
              ))}
            </ul>
          )}
          {list && total > likely.length && (
            <p className="admin-field-hint" style={{ marginTop: 8 }}>
              Showing the {likely.length} most regular of {total} likely clients. Reload the page for the next batch.
            </p>
          )}
          {other.length > 0 && (
            <p className="admin-field-hint" style={{ marginTop: 8 }}>
              <button type="button" className="admin-link-btn" onClick={() => setShowOther((v) => !v)}>
                {showOther ? 'Hide' : 'Show'} {other.length} short, frequent stops
              </button>{' '}
              (most are fuel, coffee or supply runs: use “Not a client” to clear them for good)
            </p>
          )}
        </div>
      )}
    </section>
  );
}
