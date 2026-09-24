'use client';

import { useState, useTransition } from 'react';
import type { TeamRow } from '@/lib/supabase/content-types';
import { deleteTeamAction, saveTeamsAction } from './actions';

type Toast = { kind: 'success' | 'error'; text: string } | null;
type Load = Record<string, { n: number; mins: number; bagged: number }>;

function fmtMins(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r ? `${r}m` : ''}`.trim() : `${r}m`;
}

export default function TeamsTable({
  initial,
  load,
  disabled,
}: {
  initial: TeamRow[];
  load: Load;
  disabled: boolean;
}) {
  const [rows, setRows] = useState<TeamRow[]>(initial);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast>(null);
  const [pending, startTransition] = useTransition();

  function flash(t: Toast) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3500);
  }

  function update(id: string, patch: Partial<TeamRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((d) => new Set(d).add(id));
  }

  function addRow() {
    const next = rows.reduce((m, r) => Math.max(m, r.number), 0) + 1;
    const r: TeamRow = {
      id: crypto.randomUUID(),
      number: next,
      name: '',
      lead_name: '',
      lead_phone: '',
      has_bagger: false,
      active: true,
      notes: null,
    };
    setRows((rs) => [...rs, r]);
    setDirty((d) => new Set(d).add(r.id));
  }

  function remove(row: TeamRow) {
    const isNew = !initial.some((r) => r.id === row.id);
    if (!isNew && !confirm(`Delete Team ${row.number}?`)) return;
    startTransition(async () => {
      if (!isNew) {
        const res = await deleteTeamAction(row.id, row.number);
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
      if (!isNew) flash({ kind: 'success', text: `Team ${row.number} deleted` });
    });
  }

  function save() {
    const toSave = rows.filter((r) => dirty.has(r.id));
    startTransition(async () => {
      const res = await saveTeamsAction(toSave);
      if (res.ok) {
        setDirty(new Set());
        flash({ kind: 'success', text: `Saved ${toSave.length} team${toSave.length === 1 ? '' : 's'}` });
      } else {
        flash({ kind: 'error', text: res.error });
      }
    });
  }

  const active = rows.filter((r) => r.active).length;
  const baggers = rows.filter((r) => r.active && r.has_bagger).length;

  return (
    <>
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={addRow} disabled={disabled || pending}>
          + Add team
        </button>
        <span className="spacer" />
        <span className="admin-field-hint">
          {active} active · {baggers} with a bagger
          {dirty.size > 0 ? ` · ${dirty.size} unsaved` : ''}
        </span>
        <button className="admin-btn" onClick={save} disabled={disabled || pending || dirty.size === 0}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Team #</th>
              <th style={{ minWidth: 140 }}>Name (optional)</th>
              <th style={{ minWidth: 160 }}>Team lead</th>
              <th style={{ minWidth: 140 }}>Lead phone</th>
              <th title="Can take properties marked Bagged">Bagger</th>
              <th title="Inactive teams are hidden from the Clients dropdown">Active</th>
              <th>Assigned</th>
              <th aria-label="Actions" className="admin-table-actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="admin-table-empty">
                  No teams yet. Add one to get started.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const l = load[String(r.number)];
              return (
                <tr key={r.id} className={dirty.has(r.id) ? 'is-dirty' : undefined}>
                  <td>
                    <input
                      className="admin-input num"
                      type="number"
                      min={1}
                      step={1}
                      value={r.number}
                      onChange={(e) => update(r.id, { number: Number(e.target.value) })}
                      disabled={disabled}
                      style={{ width: 72, minWidth: 60, textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      value={r.name}
                      placeholder="e.g. North crew"
                      onChange={(e) => update(r.id, { name: e.target.value })}
                      disabled={disabled}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      value={r.lead_name}
                      placeholder="Lead's name"
                      onChange={(e) => update(r.id, { lead_name: e.target.value })}
                      disabled={disabled}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      type="tel"
                      value={r.lead_phone}
                      placeholder="(603) 555-0100"
                      onChange={(e) => update(r.id, { lead_phone: e.target.value })}
                      disabled={disabled}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="admin-check"
                      checked={r.has_bagger}
                      onChange={(e) => update(r.id, { has_bagger: e.target.checked })}
                      disabled={disabled}
                      title="This crew has a bagger"
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="admin-check"
                      checked={r.active}
                      onChange={(e) => update(r.id, { active: e.target.checked })}
                      disabled={disabled}
                      title="Show this team in the Clients dropdown"
                    />
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                    {l ? (
                      <>
                        {l.n} stop{l.n === 1 ? '' : 's'} · {fmtMins(l.mins)}
                        {l.bagged > 0 && (
                          <span
                            className={`admin-pill ${r.has_bagger ? '' : 'admin-pill-warn'}`}
                            style={{ marginLeft: 6 }}
                            title={r.has_bagger ? 'Bagged properties' : 'Bagged properties, but this team has no bagger'}
                          >
                            {l.bagged} bagged
                          </span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="admin-table-actions">
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() => remove(r)}
                      disabled={disabled || pending}
                      title={`Delete Team ${r.number}`}
                      aria-label={`Delete Team ${r.number}`}
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="admin-field-hint" style={{ marginTop: 12 }}>
        A team with clients assigned can’t be deleted. Untick Active instead to hide it while
        keeping its history.
      </p>

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
