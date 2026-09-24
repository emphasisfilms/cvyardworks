'use client';

import { useCallback, useMemo, useState, useTransition, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import {
  CLIENT_DAYS,
  type ClientDay,
  type ClientRow,
  type ClientTeam,
  type TeamRow,
} from '@/lib/supabase/content-types';
import { AutosaveStatusLine, useAutosave } from '../useAutosave';
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
    active: true,
    mow: true,
    plow: false,
    notes: null,
    sort_order: sort,
    lat: null,
    lng: null,
    geocode_status: null,
  };
}

function toDay(v: string): ClientDay | null {
  const s = v.trim().slice(0, 3).toLowerCase();
  return CLIENT_DAYS.find((d) => d.toLowerCase() === s) ?? null;
}

function toTeam(v: string): ClientTeam | null {
  const s = v.trim().replace(/^(team|crew)\s*/i, '');
  return /^\d{1,3}$/.test(s) ? String(parseInt(s, 10)) : null;
}

function toBool(v: string): boolean {
  return /^(y|yes|true|x|1|required|req)$/i.test(v.trim());
}

function teamLabel(t: TeamRow): string {
  const who = t.name || t.lead_name;
  return who ? `${t.number} · ${who}` : `Team ${t.number}`;
}

function fmtMins(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r ? `${r}m` : ''}`.trim() : `${r}m`;
}

const hasName = (r: ClientRow) => r.name.trim().length > 0;

export default function ClientsTable({
  initial,
  rows,
  setRows,
  teams,
  disabled,
}: {
  initial: ClientRow[];
  rows: ClientRow[];
  setRows: Dispatch<SetStateAction<ClientRow[]>>;
  teams: TeamRow[];
  disabled: boolean;
}) {
  const [toast, setToast] = useState<Toast>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [filter, setFilter] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [service, setService] = useState<'' | 'mow' | 'plow'>('');
  const [pending, startTransition] = useTransition();

  const save = useCallback((batch: ClientRow[]) => saveClientsAction(batch), []);
  const auto = useAutosave<ClientRow>(save, { canSave: hasName });

  const teamByNumber = useMemo(
    () => new Map(teams.map((t) => [String(t.number), t] as const)),
    [teams]
  );
  const activeTeams = teams.filter((t) => t.active);
  const baggerConflict = (r: ClientRow) =>
    r.bagged && r.current_team != null && teamByNumber.get(r.current_team)?.has_bagger === false;

  function flash(t: Toast) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3000);
  }

  function update(id: string, patch: Partial<ClientRow>) {
    const cur = rows.find((r) => r.id === id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    setRows((rs) => rs.map((r) => (r.id === id ? next : r)));
    auto.touch(next);
  }

  function addRow() {
    const r = newRow(rows.length);
    setRows((rs) => [...rs, r]);
    auto.touch(r); // saves once it has a name
  }

  function remove(row: ClientRow) {
    const isNew = !initial.some((r) => r.id === row.id) && !hasName(row);
    if (!isNew && !confirm(`Delete ${row.name || 'this client'}?`)) return;
    startTransition(async () => {
      auto.forget(row.id);
      const res = await deleteClientAction(row.id); // harmless if never saved
      if (!res.ok) {
        flash({ kind: 'error', text: res.error });
        return;
      }
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      if (!isNew) flash({ kind: 'success', text: 'Client deleted' });
    });
  }

  // Paste rows from a spreadsheet, in the same column order as the table.
  function importPaste() {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const added: ClientRow[] = [];
    lines.forEach((line, i) => {
      const cells = line.includes('\t') ? line.split('\t') : line.split(',');
      const [name = '', address = '', mins = '', req = '', cur = '', team = '', teamReq = '', bag = '', act = '', mow = '', plow = ''] =
        cells.map((c) => c.trim());
      if (!name || /^name$/i.test(name)) return;
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
        active: act ? !/^(n|no|false|inactive|0)$/i.test(act) : true,
        mow: mow ? toBool(mow) : true,
        plow: plow ? toBool(plow) : false,
      });
    });
    if (!added.length) {
      flash({ kind: 'error', text: 'Nothing to import' });
      return;
    }
    setRows((rs) => [...rs, ...added]);
    added.forEach((r) => auto.touch(r));
    setPasteText('');
    setPasteOpen(false);
    flash({ kind: 'success', text: `Added ${added.length} row${added.length === 1 ? '' : 's'}` });
  }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showInactive && !r.active) return false;
      if (service === 'mow' && !r.mow) return false;
      if (service === 'plow' && !r.plow) return false;
      if (!q) return true;
      return [r.name, r.address, r.current_team, r.current_day, r.required_day]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [rows, filter, showInactive, service]);

  // Only active clients count toward routes and totals.
  const activeRows = useMemo(() => rows.filter((r) => r.active), [rows]);
  const inactiveCount = rows.length - activeRows.length;

  const byDay = useMemo(() => {
    const m = new Map<string, { n: number; mins: number }>();
    for (const r of activeRows) {
      const k = r.current_day ?? 'Unassigned';
      const e = m.get(k) ?? { n: 0, mins: 0 };
      e.n += 1;
      e.mins += r.service_minutes ?? 0;
      m.set(k, e);
    }
    const order = [...CLIENT_DAYS, 'Unassigned'];
    return order.filter((d) => m.has(d)).map((d) => [d, m.get(d)!] as const);
  }, [activeRows]);

  const byTeam = useMemo(() => {
    const m = new Map<string, { n: number; mins: number }>();
    for (const r of activeRows) {
      const k = r.current_team ? `Team ${r.current_team}` : 'Unassigned';
      const e = m.get(k) ?? { n: 0, mins: 0 };
      e.n += 1;
      e.mins += r.service_minutes ?? 0;
      m.set(k, e);
    }
    return Array.from(m.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true })
    );
  }, [activeRows]);

  const totalMins = activeRows.reduce((s, r) => s + (r.service_minutes ?? 0), 0);

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
          style={{ maxWidth: 200 }}
        />
        <select
          className="admin-select"
          value={service}
          onChange={(e) => setService(e.target.value as '' | 'mow' | 'plow')}
          style={{ width: 150 }}
          title="Show only clients with this service"
        >
          <option value="">All services</option>
          <option value="mow">Mow (summer)</option>
          <option value="plow">Plow (winter)</option>
        </select>
        {inactiveCount > 0 && (
          <label className="admin-field-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="admin-check"
              style={{ width: 15, height: 15 }}
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive ({inactiveCount})
          </label>
        )}
        <span className="spacer" />
        <span className="admin-field-hint">
          {activeRows.length} active client{activeRows.length === 1 ? '' : 's'} · {fmtMins(totalMins)}
        </span>
        <AutosaveStatusLine
          status={auto.status}
          error={auto.error}
          blocked={auto.blocked}
          blockedHint="need a name before they save"
          onRetry={auto.retry}
        />
      </div>

      {pasteOpen && (
        <section className="admin-card">
          <h2 className="admin-card-title">Paste from a spreadsheet</h2>
          <p className="admin-card-desc">
            One client per line, columns in this order: Name, Address, Service time (minutes),
            Required day, Current day, Current team (number), Team required (yes/no), Bagged
            (yes/no), Active (yes/no, blank = yes), Mow (yes/no, blank = yes), Plow (yes/no). Copy
            the cells straight out of Excel or Google Sheets. A header row is skipped automatically.
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
        <table className="admin-table admin-table-fit">
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: 50 }} />
            <col style={{ width: 50 }} />
            <col style={{ width: 74 }} />
            <col style={{ width: 86 }} />
            <col style={{ width: 86 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 54 }} />
            <col style={{ width: 50 }} />
            <col style={{ width: 54 }} />
            <col style={{ width: 36 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th className="center" title="Summer service: on the mowing routes">
                Mow
              </th>
              <th className="center" title="Winter service: on the plow routes">
                Plow
              </th>
              <th>Time (min)</th>
              <th>Required day</th>
              <th>Current day</th>
              <th>Current team</th>
              <th className="center" title="This property must keep its current team">
                Team req.
              </th>
              <th className="center" title="Clippings must be bagged">
                Bag
              </th>
              <th className="center" title="Inactive clients are left out of routes and totals">
                Active
              </th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={12} className="admin-table-empty">
                  {rows.length === 0
                    ? 'No clients yet. Add one, or paste a list from a spreadsheet.'
                    : 'No clients match that filter.'}
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr
                key={r.id}
                className={`${auto.dirtyIds.has(r.id) ? 'is-dirty' : ''}${r.active ? '' : ' is-inactive'}`.trim() || undefined}
              >
                <td>
                  <input
                    className="admin-input"
                    value={r.name}
                    placeholder="Client or property"
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
                    title={
                      r.geocode_status === 'failed'
                        ? 'Address not found on the map — check the spelling, or drop a pin on the Map tab'
                        : undefined
                    }
                    style={r.geocode_status === 'failed' ? { borderColor: 'var(--admin-warn)' } : undefined}
                  />
                </td>
                <td className="center">
                  <input
                    type="checkbox"
                    className="admin-check"
                    checked={r.mow}
                    onChange={(e) => update(r.id, { mow: e.target.checked })}
                    disabled={disabled}
                    title="Summer service (mowing)"
                  />
                </td>
                <td className="center">
                  <input
                    type="checkbox"
                    className="admin-check"
                    checked={r.plow}
                    onChange={(e) => update(r.id, { plow: e.target.checked })}
                    disabled={disabled}
                    title="Winter service (plowing)"
                  />
                </td>
                <td>
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
                        ...(e.target.value ? {} : { team_required: false }),
                      })
                    }
                    disabled={disabled}
                    title={baggerConflict(r) ? 'This team has no bagger' : undefined}
                    style={baggerConflict(r) ? { borderColor: 'var(--admin-warn)' } : undefined}
                  >
                    <option value="">—</option>
                    {activeTeams.map((t) => (
                      <option key={t.id} value={String(t.number)}>
                        {teamLabel(t)}
                        {t.has_bagger ? '' : ' (no bagger)'}
                      </option>
                    ))}
                    {r.current_team &&
                      !activeTeams.some((t) => String(t.number) === r.current_team) && (
                        <option value={r.current_team}>Team {r.current_team} (inactive)</option>
                      )}
                  </select>
                </td>
                <td className="center">
                  <input
                    type="checkbox"
                    className="admin-check"
                    checked={r.team_required}
                    onChange={(e) => update(r.id, { team_required: e.target.checked })}
                    disabled={disabled || !r.current_team}
                    title={r.current_team ? 'Must keep its current team' : 'Pick a team first'}
                  />
                </td>
                <td className="center">
                  <input
                    type="checkbox"
                    className="admin-check"
                    checked={r.bagged}
                    onChange={(e) => update(r.id, { bagged: e.target.checked })}
                    disabled={disabled}
                    title={baggerConflict(r) ? 'Bagged, but this team has no bagger' : 'Clippings must be bagged'}
                    style={baggerConflict(r) ? { outline: '2px solid var(--admin-warn)', outlineOffset: 1, borderRadius: 3 } : undefined}
                  />
                </td>
                <td className="center">
                  <input
                    type="checkbox"
                    className="admin-check"
                    checked={r.active}
                    onChange={(e) => update(r.id, { active: e.target.checked })}
                    disabled={disabled}
                    title={r.active ? 'Active — included in routes' : 'Inactive — left out of routes'}
                  />
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
