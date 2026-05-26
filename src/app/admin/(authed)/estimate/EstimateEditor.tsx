'use client';

import { useState, useTransition } from 'react';
import type { EstimatePageContent } from '@/lib/supabase/content-types';
import { saveEstimatePageAction } from './actions';

type Toast = { kind: 'success' | 'error'; text: string } | null;

export default function EstimateEditor({
  initial,
}: {
  initial: EstimatePageContent;
}) {
  const [value, setValue] = useState<EstimatePageContent>(initial);
  const [benefitsText, setBenefitsText] = useState(
    (initial.benefits ?? []).join('\n')
  );
  const [toast, setToast] = useState<Toast>(null);
  const [pending, startTransition] = useTransition();

  function flash(t: Toast) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3000);
  }

  function save() {
    const benefits = benefitsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await saveEstimatePageAction({ ...value, benefits });
      flash(
        res.ok
          ? { kind: 'success', text: 'Estimate page saved' }
          : { kind: 'error', text: res.error }
      );
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
            rows={3}
            value={value.subtitle}
            onChange={(e) => setValue({ ...value, subtitle: e.target.value })}
          />
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Why choose us</h2>
        <p className="admin-card-desc">
          Bullet points in the sidebar of /estimate.
        </p>
        <div className="admin-field">
          <label className="admin-field-label">Benefits</label>
          <span className="admin-field-hint">One per line.</span>
          <textarea
            className="admin-textarea"
            rows={6}
            value={benefitsText}
            onChange={(e) => setBenefitsText(e.target.value)}
          />
        </div>
      </section>

      <button className="admin-btn" onClick={save} disabled={pending}>
        {pending ? 'Saving…' : 'Save estimate page'}
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
