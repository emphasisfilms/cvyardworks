'use client';

import { useState, useTransition, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PHOTO_BUCKET, getPhotoUrl } from '@/lib/supabase/storage';
import type {
  HeroContent,
  HomeAboutContent,
  HomeCtaContent,
} from '@/lib/supabase/content-types';
import {
  saveHeroAction,
  saveHomeAboutAction,
  saveHomeCtaAction,
} from './actions';

type Toast = { kind: 'success' | 'error'; text: string } | null;

export default function HomeEditor({
  hero,
  homeAbout,
  homeCta,
}: {
  hero: HeroContent;
  homeAbout: HomeAboutContent;
  homeCta: HomeCtaContent;
}) {
  const [toast, setToast] = useState<Toast>(null);

  function flash(t: Toast) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      <HeroCard initial={hero} onToast={flash} />
      <AboutCard initial={homeAbout} onToast={flash} />
      <CtaCard initial={homeCta} onToast={flash} />

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

// ---------- HERO ----------

function HeroCard({
  initial,
  onToast,
}: {
  initial: HeroContent;
  onToast: (t: Toast) => void;
}) {
  const [value, setValue] = useState<HeroContent>(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveHeroAction(value);
      onToast(
        res.ok
          ? { kind: 'success', text: 'Hero saved' }
          : { kind: 'error', text: res.error }
      );
    });
  }

  return (
    <section className="admin-card">
      <h2 className="admin-card-title">Hero (top of homepage)</h2>
      <p className="admin-card-desc">
        The banner with the big title and tagline visitors see first.
      </p>

      <div className="admin-field">
        <label className="admin-field-label">Tagline (above the title)</label>
        <input
          className="admin-input"
          value={value.tagline}
          onChange={(e) => setValue({ ...value, tagline: e.target.value })}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="admin-field">
          <label className="admin-field-label">Title line 1</label>
          <input
            className="admin-input"
            value={value.titleLine1}
            onChange={(e) => setValue({ ...value, titleLine1: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Title line 2 (accent color)</label>
          <input
            className="admin-input"
            value={value.titleLine2}
            onChange={(e) => setValue({ ...value, titleLine2: e.target.value })}
          />
        </div>
      </div>

      <div className="admin-field">
        <label className="admin-field-label">Subtitle</label>
        <input
          className="admin-input"
          value={value.subtitle}
          onChange={(e) => setValue({ ...value, subtitle: e.target.value })}
        />
      </div>

      <PhotoField
        label="Background image"
        hint="Used as the hero background. Wide landscape photos work best (~1920×1080)."
        pathPrefix="hero"
        path={value.backgroundPath}
        onChange={(backgroundPath) => setValue({ ...value, backgroundPath })}
        onToast={onToast}
      />

      <div style={{ marginTop: 16 }}>
        <button className="admin-btn" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save hero'}
        </button>
      </div>
    </section>
  );
}

// ---------- ABOUT ----------

function AboutCard({
  initial,
  onToast,
}: {
  initial: HomeAboutContent;
  onToast: (t: Toast) => void;
}) {
  const [value, setValue] = useState<HomeAboutContent>(initial);
  const [paragraphsText, setParagraphsText] = useState(
    (initial.paragraphs ?? []).join('\n\n')
  );
  const [pending, startTransition] = useTransition();

  function save() {
    const paragraphs = paragraphsText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    const payload: HomeAboutContent = { ...value, paragraphs };

    startTransition(async () => {
      const res = await saveHomeAboutAction(payload);
      onToast(
        res.ok
          ? { kind: 'success', text: 'About section saved' }
          : { kind: 'error', text: res.error }
      );
    });
  }

  return (
    <section className="admin-card">
      <h2 className="admin-card-title">About section</h2>
      <p className="admin-card-desc">
        The “Yard Work: Solved” section with the company description and property
        photo.
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
          <label className="admin-field-label">Heading accent (colored part)</label>
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
        <label className="admin-field-label">Paragraphs</label>
        <span className="admin-field-hint">
          Separate paragraphs with a blank line. Empty lines are ignored.
        </span>
        <textarea
          className="admin-textarea"
          rows={10}
          value={paragraphsText}
          onChange={(e) => setParagraphsText(e.target.value)}
        />
      </div>

      <PhotoField
        label="Property image (next to the text)"
        hint="A photo of your work / a property. Roughly square or landscape."
        pathPrefix="home-about"
        path={value.imagePath}
        onChange={(imagePath) => setValue({ ...value, imagePath })}
        onToast={onToast}
      />

      <div style={{ marginTop: 16 }}>
        <button className="admin-btn" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save about section'}
        </button>
      </div>
    </section>
  );
}

// ---------- CTA ----------

function CtaCard({
  initial,
  onToast,
}: {
  initial: HomeCtaContent;
  onToast: (t: Toast) => void;
}) {
  const [value, setValue] = useState<HomeCtaContent>(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveHomeCtaAction(value);
      onToast(
        res.ok
          ? { kind: 'success', text: 'CTA saved' }
          : { kind: 'error', text: res.error }
      );
    });
  }

  return (
    <section className="admin-card">
      <h2 className="admin-card-title">Bottom call-to-action</h2>
      <p className="admin-card-desc">
        The dark banner near the bottom of the homepage with the “Get a Free
        Estimate” / phone buttons.
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
        <label className="admin-field-label">Body text</label>
        <textarea
          className="admin-textarea"
          rows={3}
          value={value.subtitle}
          onChange={(e) => setValue({ ...value, subtitle: e.target.value })}
        />
      </div>

      <div style={{ marginTop: 4 }}>
        <button className="admin-btn" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save CTA'}
        </button>
      </div>
    </section>
  );
}

// ---------- Shared photo field ----------

function PhotoField({
  label,
  hint,
  pathPrefix,
  path,
  onChange,
  onToast,
}: {
  label: string;
  hint: string;
  pathPrefix: string;
  path: string | null;
  onChange: (path: string | null) => void;
  onToast: (t: Toast) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const url = getPhotoUrl(path);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast({ kind: 'error', text: 'Pick an image file' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onToast({ kind: 'error', text: 'Image must be under 10 MB' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newPath = `${pathPrefix}/${stamp}.${ext}`;

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(newPath, file, { cacheControl: '3600', upsert: false });

      if (error) {
        onToast({ kind: 'error', text: error.message });
        return;
      }

      onChange(newPath);
      onToast({ kind: 'success', text: 'Image uploaded — save section to apply' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="admin-field">
      <label className="admin-field-label">{label}</label>
      <span className="admin-field-hint">{hint}</span>

      <div
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          marginTop: 6,
        }}
      >
        <div
          style={{
            width: 180,
            height: 110,
            borderRadius: 6,
            background: '#0f1410',
            border: '1px solid #2a332d',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#5d6e62',
            fontSize: '0.75rem',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {url ? (
            <Image
              src={url}
              alt=""
              fill
              sizes="180px"
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          ) : (
            <span>No image</span>
          )}
        </div>

        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            style={{ fontSize: '0.85rem', color: '#b6c5b9' }}
          />
          {path && (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => onChange(null)}
              style={{ alignSelf: 'flex-start', padding: '6px 12px' }}
            >
              Remove image
            </button>
          )}
          {uploading && (
            <span className="admin-field-hint">Uploading…</span>
          )}
        </div>
      </div>
    </div>
  );
}
