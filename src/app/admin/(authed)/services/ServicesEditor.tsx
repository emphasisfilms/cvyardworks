'use client';

import { useState, useTransition } from 'react';
import type {
  Service,
  HomeServicesIntroContent,
} from '@/lib/supabase/content-types';
import PhotoField, { type Toast } from '../PhotoField';
import { saveServiceAction, saveServicesIntroAction } from './actions';

export default function ServicesEditor({
  intro,
  services,
}: {
  intro: HomeServicesIntroContent;
  services: Service[];
}) {
  const [toast, setToast] = useState<Toast>(null);

  function flash(t: Toast) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      <IntroCard initial={intro} onToast={flash} />
      {services.map((s) => (
        <ServiceCardEditor key={s.id} initial={s} onToast={flash} />
      ))}

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

// ---------- Intro / heading ----------

function IntroCard({
  initial,
  onToast,
}: {
  initial: HomeServicesIntroContent;
  onToast: (t: Toast) => void;
}) {
  const [value, setValue] = useState<HomeServicesIntroContent>(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveServicesIntroAction(value);
      onToast(
        res.ok
          ? { kind: 'success', text: 'Section heading saved' }
          : { kind: 'error', text: res.error }
      );
    });
  }

  return (
    <section className="admin-card">
      <h2 className="admin-card-title">Section heading (above the cards)</h2>
      <p className="admin-card-desc">
        The “Year-Round Services” heading and tagline on the homepage.
      </p>

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

      <div style={{ marginTop: 4 }}>
        <button className="admin-btn" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save heading'}
        </button>
      </div>
    </section>
  );
}

// ---------- One service card ----------

function ServiceCardEditor({
  initial,
  onToast,
}: {
  initial: Service;
  onToast: (t: Toast) => void;
}) {
  const [value, setValue] = useState<Service>(initial);
  const [itemsText, setItemsText] = useState((initial.items ?? []).join('\n'));
  const [pending, startTransition] = useTransition();

  function save() {
    const items = itemsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await saveServiceAction({ ...value, items });
      onToast(
        res.ok
          ? { kind: 'success', text: `${value.season} saved` }
          : { kind: 'error', text: res.error }
      );
    });
  }

  return (
    <section
      className="admin-card"
      style={{ borderLeft: `4px solid ${value.color}` }}
    >
      <h2 className="admin-card-title">
        <span style={{ marginRight: 8 }}>{value.icon}</span>
        {value.season}{' '}
        <span style={{ color: '#5d6e62', fontWeight: 400, fontSize: '0.85rem' }}>
          ({value.id})
        </span>
      </h2>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 14 }}
      >
        <div className="admin-field">
          <label className="admin-field-label">Season label</label>
          <input
            className="admin-input"
            value={value.season}
            onChange={(e) => setValue({ ...value, season: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Card title</label>
          <input
            className="admin-input"
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Icon (emoji)</label>
          <input
            className="admin-input"
            value={value.icon}
            onChange={(e) => setValue({ ...value, icon: e.target.value })}
            style={{ textAlign: 'center', fontSize: '1.25rem' }}
          />
        </div>
      </div>

      <div className="admin-field">
        <label className="admin-field-label">Accent color</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="color"
            value={value.color}
            onChange={(e) => setValue({ ...value, color: e.target.value })}
            style={{
              width: 44,
              height: 36,
              padding: 2,
              border: '1px solid #2a332d',
              borderRadius: 6,
              background: '#0f1410',
              cursor: 'pointer',
            }}
          />
          <input
            className="admin-input"
            value={value.color}
            onChange={(e) => setValue({ ...value, color: e.target.value })}
            style={{ maxWidth: 130 }}
          />
        </div>
      </div>

      <div className="admin-field">
        <label className="admin-field-label">Description</label>
        <textarea
          className="admin-textarea"
          rows={2}
          value={value.description}
          onChange={(e) => setValue({ ...value, description: e.target.value })}
        />
      </div>

      <div className="admin-field">
        <label className="admin-field-label">Service items</label>
        <span className="admin-field-hint">One per line.</span>
        <textarea
          className="admin-textarea"
          rows={6}
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
        />
      </div>

      <PhotoField
        label="Photo (optional)"
        hint="Shown at the top of this service's card on the homepage. Landscape photos (~800×400) work best."
        pathPrefix={`services/${value.id}`}
        path={value.photo_path}
        onChange={(photo_path) => setValue({ ...value, photo_path })}
        onToast={onToast}
      />

      <div style={{ marginTop: 16 }}>
        <button className="admin-btn" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : `Save ${value.season.toLowerCase()}`}
        </button>
      </div>
    </section>
  );
}

