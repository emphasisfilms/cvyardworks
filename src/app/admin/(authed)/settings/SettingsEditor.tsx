'use client';

import { useState, useTransition } from 'react';
import type { SiteSettingsContent } from '@/lib/supabase/content-types';
import { saveSiteSettingsAction } from './actions';

type Toast = { kind: 'success' | 'error'; text: string } | null;

export default function SettingsEditor({
  initial,
}: {
  initial: SiteSettingsContent;
}) {
  const [value, setValue] = useState<SiteSettingsContent>(initial);
  const [toast, setToast] = useState<Toast>(null);
  const [pending, startTransition] = useTransition();

  function flash(t: Toast) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3000);
  }

  function save() {
    startTransition(async () => {
      const res = await saveSiteSettingsAction(value);
      flash(
        res.ok
          ? { kind: 'success', text: 'Site settings saved' }
          : { kind: 'error', text: res.error }
      );
    });
  }

  return (
    <>
      <section className="admin-card">
        <h2 className="admin-card-title">Business info</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="admin-field">
            <label className="admin-field-label">Business name (full)</label>
            <input
              className="admin-input"
              value={value.businessName}
              onChange={(e) =>
                setValue({ ...value, businessName: e.target.value })
              }
            />
          </div>
          <div className="admin-field">
            <label className="admin-field-label">Short name</label>
            <input
              className="admin-input"
              value={value.shortName}
              onChange={(e) => setValue({ ...value, shortName: e.target.value })}
            />
          </div>
        </div>

        <div className="admin-field">
          <label className="admin-field-label">Phone</label>
          <span className="admin-field-hint">
            Click-to-call link uses the digits, e.g. (603) 499-6799.
          </span>
          <input
            className="admin-input"
            value={value.phone}
            onChange={(e) => setValue({ ...value, phone: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="admin-field">
            <label className="admin-field-label">Location</label>
            <input
              className="admin-input"
              value={value.location}
              onChange={(e) => setValue({ ...value, location: e.target.value })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-field-label">Service area</label>
            <input
              className="admin-input"
              value={value.serviceArea}
              onChange={(e) =>
                setValue({ ...value, serviceArea: e.target.value })
              }
            />
          </div>
        </div>

        <div className="admin-field">
          <label className="admin-field-label">Hours (footer line)</label>
          <input
            className="admin-input"
            value={value.hoursLine}
            onChange={(e) => setValue({ ...value, hoursLine: e.target.value })}
          />
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Social links</h2>
        <p className="admin-card-desc">Leave blank to hide a social icon.</p>
        <div className="admin-field">
          <label className="admin-field-label">Facebook URL</label>
          <input
            className="admin-input"
            placeholder="https://facebook.com/…"
            value={value.social.facebook ?? ''}
            onChange={(e) =>
              setValue({
                ...value,
                social: { ...value.social, facebook: e.target.value || null },
              })
            }
          />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Instagram URL</label>
          <input
            className="admin-input"
            placeholder="https://instagram.com/…"
            value={value.social.instagram ?? ''}
            onChange={(e) =>
              setValue({
                ...value,
                social: { ...value.social, instagram: e.target.value || null },
              })
            }
          />
        </div>
      </section>

      <button className="admin-btn" onClick={save} disabled={pending}>
        {pending ? 'Saving…' : 'Save site settings'}
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
