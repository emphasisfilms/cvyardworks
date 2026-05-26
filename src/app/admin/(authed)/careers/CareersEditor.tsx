'use client';

import { useState, useTransition } from 'react';
import type {
  CareersPageContent,
  CareersPerk,
  CareersPosition,
} from '@/lib/supabase/content-types';
import { saveCareersPageAction } from './actions';

type Toast = { kind: 'success' | 'error'; text: string } | null;

export default function CareersEditor({
  initial,
}: {
  initial: CareersPageContent;
}) {
  const [value, setValue] = useState<CareersPageContent>(initial);
  const [toast, setToast] = useState<Toast>(null);
  const [pending, startTransition] = useTransition();

  function flash(t: Toast) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3000);
  }

  function save() {
    startTransition(async () => {
      const res = await saveCareersPageAction(value);
      flash(
        res.ok
          ? { kind: 'success', text: 'Careers page saved' }
          : { kind: 'error', text: res.error }
      );
    });
  }

  function updatePerk(i: number, p: Partial<CareersPerk>) {
    const next = value.perks.slice();
    next[i] = { ...next[i], ...p };
    setValue({ ...value, perks: next });
  }

  function addPerk() {
    setValue({ ...value, perks: [...value.perks, { title: '', body: '' }] });
  }

  function removePerk(i: number) {
    setValue({ ...value, perks: value.perks.filter((_, idx) => idx !== i) });
  }

  function updatePosition(i: number, p: Partial<CareersPosition>) {
    const next = value.positions.slice();
    next[i] = { ...next[i], ...p };
    setValue({ ...value, positions: next });
  }

  function addPosition() {
    setValue({
      ...value,
      positions: [...value.positions, { title: '', detail: '' }],
    });
  }

  function removePosition(i: number) {
    setValue({
      ...value,
      positions: value.positions.filter((_, idx) => idx !== i),
    });
  }

  return (
    <>
      <section className="admin-card">
        <h2 className="admin-card-title">Page heading</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="admin-field">
            <label className="admin-field-label">Heading</label>
            <input
              className="admin-input"
              value={value.heading}
              onChange={(e) => setValue({ ...value, heading: e.target.value })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-field-label">Heading accent</label>
            <input
              className="admin-input"
              value={value.headingAccent}
              onChange={(e) =>
                setValue({ ...value, headingAccent: e.target.value })
              }
            />
          </div>
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Subtitle</label>
          <textarea
            className="admin-textarea"
            rows={2}
            value={value.subtitle}
            onChange={(e) => setValue({ ...value, subtitle: e.target.value })}
          />
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Why work with us</h2>
        <p className="admin-card-desc">
          Each perk shows as a list item with a bold title and a short
          description.
        </p>

        {value.perks.map((perk, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #2a332d',
              borderRadius: 6,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div className="admin-field">
              <label className="admin-field-label">Title</label>
              <input
                className="admin-input"
                value={perk.title}
                onChange={(e) => updatePerk(i, { title: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">Description</label>
              <textarea
                className="admin-textarea"
                rows={2}
                value={perk.body}
                onChange={(e) => updatePerk(i, { body: e.target.value })}
              />
            </div>
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => removePerk(i)}
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              Remove perk
            </button>
          </div>
        ))}

        <button
          className="admin-btn admin-btn-secondary"
          onClick={addPerk}
          style={{ marginTop: 4 }}
        >
          + Add perk
        </button>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Open positions</h2>

        {value.positions.map((pos, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #2a332d',
              borderRadius: 6,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div className="admin-field">
              <label className="admin-field-label">Position title</label>
              <input
                className="admin-input"
                value={pos.title}
                onChange={(e) => updatePosition(i, { title: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">Detail (e.g. Full-time · Seasonal)</label>
              <input
                className="admin-input"
                value={pos.detail}
                onChange={(e) => updatePosition(i, { detail: e.target.value })}
              />
            </div>
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => removePosition(i)}
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              Remove position
            </button>
          </div>
        ))}

        <button
          className="admin-btn admin-btn-secondary"
          onClick={addPosition}
          style={{ marginTop: 4 }}
        >
          + Add position
        </button>
      </section>

      <button className="admin-btn" onClick={save} disabled={pending}>
        {pending ? 'Saving…' : 'Save careers page'}
      </button>

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
