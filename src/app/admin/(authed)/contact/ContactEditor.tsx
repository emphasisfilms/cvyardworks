'use client';

import { useState, useTransition } from 'react';
import type { ContactPageContent } from '@/lib/supabase/content-types';
import { saveContactPageAction } from './actions';

type Toast = { kind: 'success' | 'error'; text: string } | null;

export default function ContactEditor({
  initial,
}: {
  initial: ContactPageContent;
}) {
  const [value, setValue] = useState<ContactPageContent>(initial);
  const [toast, setToast] = useState<Toast>(null);
  const [pending, startTransition] = useTransition();

  function flash(t: Toast) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3000);
  }

  function save() {
    startTransition(async () => {
      const res = await saveContactPageAction(value);
      flash(
        res.ok
          ? { kind: 'success', text: 'Contact page saved' }
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
            rows={2}
            value={value.subtitle}
            onChange={(e) => setValue({ ...value, subtitle: e.target.value })}
          />
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Info cards</h2>
        <p className="admin-card-desc">
          Phone, location, and hours cards. The phone number itself lives in Site
          Settings; these are the descriptive lines underneath.
        </p>
        <div className="admin-field">
          <label className="admin-field-label">Phone card note</label>
          <input
            className="admin-input"
            value={value.phoneNote}
            onChange={(e) => setValue({ ...value, phoneNote: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Location card note</label>
          <input
            className="admin-input"
            value={value.locationNote}
            onChange={(e) =>
              setValue({ ...value, locationNote: e.target.value })
            }
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="admin-field">
            <label className="admin-field-label">Hours: days</label>
            <input
              className="admin-input"
              value={value.hoursValue}
              onChange={(e) =>
                setValue({ ...value, hoursValue: e.target.value })
              }
            />
          </div>
          <div className="admin-field">
            <label className="admin-field-label">Hours: times</label>
            <input
              className="admin-input"
              value={value.hoursNote}
              onChange={(e) => setValue({ ...value, hoursNote: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">“Need an estimate?” CTA</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="admin-field">
            <label className="admin-field-label">CTA heading</label>
            <input
              className="admin-input"
              value={value.ctaHeading}
              onChange={(e) =>
                setValue({ ...value, ctaHeading: e.target.value })
              }
            />
          </div>
          <div className="admin-field">
            <label className="admin-field-label">CTA heading accent</label>
            <input
              className="admin-input"
              value={value.ctaHeadingAccent}
              onChange={(e) =>
                setValue({ ...value, ctaHeadingAccent: e.target.value })
              }
            />
          </div>
        </div>
        <div className="admin-field">
          <label className="admin-field-label">CTA body text</label>
          <textarea
            className="admin-textarea"
            rows={3}
            value={value.ctaBody}
            onChange={(e) => setValue({ ...value, ctaBody: e.target.value })}
          />
        </div>
      </section>

      <button className="admin-btn" onClick={save} disabled={pending}>
        {pending ? 'Saving…' : 'Save contact page'}
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
