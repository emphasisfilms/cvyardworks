'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  CLIENT_DAYS,
  type ClientDay,
  type ClientRow,
  type ClientTeam,
  type TeamRow,
} from '@/lib/supabase/content-types';
import { deleteClientAction, saveClientsAction } from './actions';

type Toast = { kind: 'success' | 'error'; text: string } | null;

function newRow(sort: number): ClientRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    address: '',
    service_minutes: null,
    required_day: null,
    current_day: null,
    current_team: null,
    team_required: false,
    bagged: false,
    notes: null,
    sort_order: sort,
  };
}

function toDay(v: string): ClientDay | null {
  const s = v.trim().slice(0, 3).toLowerCase();
  const hit = CLIENT_DAYS.find((d) => d.toLowerCase() === s);
  return hit ?? null;
}

function toTeam(v: string): ClientTeam | null {
  const s = v.trim().replace(/^(team|crew)\s*/i, '');
  return /^\d{1,3}$/.test(s) ? String(parseInt(s, 10)) : null;
}

function teamLabel(t: TeamRow): string {
  const who = t.name || t.lead_name;
  return who ? `Team ${t.number} · ${who}` : `Team ${t.number}`;
}

function toBool(v: string): boolean {
  return /^(y|yes|true|x|1|required|req)$/i.test(v.trim());
}

function fmtMins(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r ? `${r}m` : ''}`.trim() : `${r}m`;
}

export default function ClientsTable({
  initial,
  teams,
  disabled,
}: {
  initial: ClientRow[];
  teams: TeamRow[];
  disabled: boolean;
}) {
  const teamByNumber = useMemo(
    () => new Map(teams.map((t) => [String(t.number), t] as const)),
    [teams]
  );
  const activeTeams = teams.filter((t) => t.active);
  // A bagged property assigned to a team without a bagger is a scheduling problem.
  const baggerConflicts = (r: ClientRow) =>
    r.bagged && r.current_team != null && teamByNumber.get(r.current_team)?.has_bagger === false;
  const [rows, setRows] = useState<ClientRow[]>(initial);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [filter, setFilter] = useState('');
  const [pending, startTransition] = useTransition();

  function flash(t: Toast) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3000);
  }

  function update(id: string, patch: Partial<ClientRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((d) => new Set(d).add(id));
  }

  function addRow() {
    const r = newRow(rows.length);
    setRows((rs) => [...rs, r]);
    setDirty((d) => new Set(d).add(r.id));
  }

  function remove(row: ClientRow) {
    const isNew = !initial.some((r) => r.id === row.id) && dirty.has(row.id);
    if (!isNew && !confirm(`Delete ${row.name || 'this client'}?`)) return;
    startTransition(async () => {
      if (!isNew) {
        const res = await deleteClientAction(row.id);
        if (!res.ok) {
          flash({ kind: 'error', text: res.error });
          return;
        }
      }
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      setDirty((d) => {
        const n = new Set(d);
        n.delete(row.id);
        return n;
      });
      if (!isNew) flash({ kind: 'success', text: 'Client deleted' });
    });
  }

  function save() {
    const toSave = rows.filter((r) => dirty.has(r.id));
    const blank = toSave.filter((r) => !r.name.trim());
    if (blank.length) {
      flash({ kind: 'error', text: 'Every client needs a name before saving' });
      return;
    }
    startTransition(async () => {
      const res = await saveClientsAction(toSave);
      if (res.ok) {
        setDirty(new Set());
        flash({ kind: 'success', text: `Saved ${toSave.length} client${toSave.length === 1 ? '' : 's'}` });
      } else {
        flash({ kind: 'error', text: res.error });
      }
    });
  }

  // Paste rows from a spreadsheet: Name, Address, Service time, Required day, Current day, Team.
  function importPaste() {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const added: ClientRow[] = [];
    lines.forEach((line, i) => {
      const cells = line.includes('\t') ? line.split('\t') : line.split(',');
      const [name = '', address = '', mins = '', req = '', cur = '', team = '', teamReq = '', bag = ''] =
        cells.map((c) => c.trim());
      if (!name || /^name$/i.test(name)) return; // skip header row
      const n = parseInt(mins, 10);
      added.push({
        ...newRow(rows.length + i),
        name,
        address,
        service_minutes: Number.isFinite(n) ? n : null,
        required_day: toDay(req),
        current_day: toDay(cur),
        current_team: toTeam(team),
        team_required: toBool(teamReq),
        bagged: toBool(bag),
      });
    });
    if (!added.length) {
      flash({ kind: 'error', text: 'Nothing to import' });
      return;
    }
    setRows((rs) => [...rs, ...added]);
    setDirty((d) => {
      const n = new Set(d);
      added.forEach((r) => n.add(r.id));
      return n;
    });
    setPasteText('');
    setPasteOpen(false);
    flash({ kind: 'success', text: `Added ${added.length} rows — click Save to keep them` });
  }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.address, r.current_team, r.current_day, r.required_day]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [rows, filter]);

  // Workload per day and per team, for a quick sanity check before optimizing.
  const byDay = useMemo(() => {
    const m = new Map<string, { n: number; mins: number }>();
    for (const r of rows) {
      const k = r.current_day ?? 'Unassigned';
      const e = m.get(k) ?? { n: 0, mins: 0 };
      e.n += 1;
      e.mins += r.service_minutes ?? 0;
      m.set(k, e);
    }
    const order = [...CLIENT_DAYS, 'Unassigned'];
    return order.filter((d) => m.has(d)).map((d) => [d, m.get(d)!] as const);
  }, [rows]);

  const byTeam = useMemo(() => {
    const m = new Map<string, { n: number; mins: number }>();
    for (const r of rows) {
      const k = r.current_team ? `Team ${r.current_team}` : 'Unassigned';
      const e = m.get(k) ?? { n: 0, mins: 0 };
      e.n += 1;
      e.mins += r.service_minutes ?? 0;
      m.set(k, e);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const totalMins = rows.reduce((s, r) => s + (r.service_minutes ?? 0), 0);

  return (
    <>
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={addRow} disabled={disabled || pending}>
          + Add client
        </button>
        <button
          className="admin-btn admin-btn-secondary"
          onClick={() => setPasteOpen((o) => !o)}
          disabled={disabled || pending}
        >
          Paste from spreadsheet
        </button>
        <input
          className="admin-input"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 220 }}
        />
        <span className="spacer" />
        <span className="admin-field-hint">
          {rows.length} client{rows.length === 1 ? '' : 's'} · {fmtMins(totalMins)} total
          {dirty.size > 0 ? ` · ${dirty.size} unsaved` : ''}
        </span>
        <button className="admin-btn" onClick={save} disabled={disabled || pending || dirty.size === 0}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {pasteOpen && (
        <section className="admin-card">
          <h2 className="admin-card-title">Paste from a spreadsheet</h2>
          <p className="admin-card-desc">
            One client per line, columns in this order: Name, Address, Service time (minutes),
            Required day, Current day, Current team (1–6), Team required (yes/no), Bagged (yes/no).
            Copy the cells straight out of Excel or Google Sheets. A header row is skipped
            automatically.
          </p>
          <textarea
            className="admin-textarea"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'Smith Residence\t12 Main St, Walpole NH\t45\tAny\tTue\t3\tyes\tno'}
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', minHeight: 140 }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="admin-btn" onClick={importPaste}>
              Add rows
            </button>
            <button className="admin-btn admin-btn-secondary" onClick={() => setPasteOpen(false)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ minWidth: 150 }}>Name</th>
              <th style={{ minWidth: 200, width: '30%' }}>Address</th>
              <th>Service time</th>
              <th>Required day</th>
              <th>Current day</th>
              <th>Current team</th>
              <th title="Check if this property must keep its current team">Team required</th>
              <th title="Check if clippings must be bagged">Bagged</th>
              <th aria-label="Actions" className="admin-table-actions" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="admin-table-empty">
                  {rows.length === 0
                    ? 'No clients yet. Add one, or paste a list from a spreadsheet.'
                    : 'No clients match that filter.'}
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id} className={dirty.has(r.id) ? 'is-dirty' : undefined}>
                <td>
                  <input
                    className="admin-input"
                    value={r.name}
                    placeholder="Client or property name"
                    onChange={(e) => update(r.id, { name: e.target.value })}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <input
                    className="admin-input"
                    value={r.address}
                    placeholder="Street, Town, State"
                    onChange={(e) => update(r.id, { address: e.target.value })}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      className="admin-input num"
                      type="number"
                      min={0}
                      step={5}
                      value={r.service_minutes ?? ''}
                      onChange={(e) =>
                        update(r.id, {
                          service_minutes: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      disabled={disabled}
                    />
                    <span className="admin-field-hint">min</span>
                  </div>
                </td>
                <td>
                  <DaySelect
                    value={r.required_day}
                    anyLabel="Any"
                    onChange={(v) => update(r.id, { required_day: v })}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <DaySelect
                    value={r.current_day}
                    anyLabel="—"
                    onChange={(v) => update(r.id, { current_day: v })}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <select
                    className="admin-select"
                    value={r.current_team ?? ''}
                    onChange={(e) =>
                      update(r.id, {
                        current_team: (e.target.value || null) as ClientTeam | null,
                        // no team means nothing to require
                        ...(e.target.value ? {} : { team_required: false }),
                      })
                    }
                    disabled={disabled}
                  >
                    <option value="">—</option>
                    {activeTeams.map((t) => (
                      <option key={t.id} value={String(t.number)}>
                        {teamLabel(t)}
                        {t.has_bagger ? '' : ' (no bagger)'}
                      </option>
                    ))}
                    {/* keep a value visible even if its team was deactivated or removed */}
                    {r.current_team && !activeTeams.some((t) => String(t.number) === r.current_team) && (
                      <option value={r.current_team}>Team {r.current_team} (inactive)</option>
                    )}
                  </select>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="admin-check"
                    checked={r.team_required}
                    onChange={(e) => update(r.id, { team_required: e.target.checked })}
                    disabled={disabled || !r.current_team}
                    title={
                      r.current_team
                        ? 'This property must keep its current team'
                        : 'Pick a team first'
                    }
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="admin-check"
                    checked={r.bagged}
                    onChange={(e) => update(r.id, { bagged: e.target.checked })}
                    disabled={disabled}
                    title="Clippings must be bagged"
                  />
                  {baggerConflicts(r) && (
                    <span
                      className="admin-pill admin-pill-warn"
                      style={{ marginLeft: 6, verticalAlign: 'middle' }}
                      title="This team has no bagger"
                    >
                      no bagger
                    </span>
                  )}
                </td>
                <td className="admin-table-actions">
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => remove(r)}
                    disabled={disabled || pending}
                    title={`Delete ${r.name || 'client'}`}
                    aria-label={`Delete ${r.name || 'client'}`}
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="admin-summary">
          <section className="admin-card" style={{ marginBottom: 0 }}>
            <h2 className="admin-card-title">Load by day</h2>
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th className="num">Stops</th>
                  <th className="num">Time</th>
                </tr>
              </thead>
              <tbody>
                {byDay.map(([d, e]) => (
                  <tr key={d}>
                    <td>{d}</td>
                    <td className="num">{e.n}</td>
                    <td className="num">{fmtMins(e.mins)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="admin-card" style={{ marginBottom: 0 }}>
            <h2 className="admin-card-title">Load by team</h2>
            <p className="admin-card-desc" style={{ marginBottom: 8 }}>
              Manage crews on <Link href="/admin/teams">Crews &amp; Teams</Link>.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th className="num">Stops</th>
                  <th className="num">Time</th>
                </tr>
              </thead>
              <tbody>
                {byTeam.map(([t, e]) => (
                  <tr key={t}>
                    <td>{t}</td>
                    <td className="num">{e.n}</td>
                    <td className="num">{fmtMins(e.mins)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {toast && (
        <div
          className={`admin-toast ${
            toast.kind === 'success' ? 'admin-toast-success' : 'admin-toast-error'
          }`}
        >
          {toast.text}
        </div>
      )}
    </>
  );
}

function DaySelect({
  value,
  anyLabel,
  onChange,
  disabled,
}: {
  value: ClientDay | null;
  anyLabel: string;
  onChange: (v: ClientDay | null) => void;
  disabled: boolean;
}) {
  return (
    <select
      className="admin-select"
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || null) as ClientDay | null)}
      disabled={disabled}
    >
      <option value="">{anyLabel}</option>
      {CLIENT_DAYS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
