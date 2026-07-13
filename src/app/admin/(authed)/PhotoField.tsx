'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PHOTO_BUCKET, getPhotoUrl } from '@/lib/supabase/storage';

export type Toast = { kind: 'success' | 'error'; text: string } | null;

export default function PhotoField({
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
  // The path this field was mounted with — i.e. what the DB still references.
  // Uploads that replace an unsaved upload can be deleted immediately; the
  // saved one is cleaned up server-side after the section is saved.
  const initialPath = useRef(path);
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

      if (path && path !== initialPath.current) {
        // Replacing an upload that was never saved — safe to discard now.
        await supabase.storage.from(PHOTO_BUCKET).remove([path]);
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
          {uploading && <span className="admin-field-hint">Uploading…</span>}
        </div>
      </div>
    </div>
  );
}
