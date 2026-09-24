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

      <div className="admin-photo">
        <div className="admin-photo-thumb">
          {url ? (
            <Image
              src={url}
              alt=""
              fill
              sizes="150px"
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          ) : (
            <span>No image</span>
          )}
        </div>

        <div className="admin-photo-actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : path ? 'Replace photo' : 'Upload photo'}
          </button>
          {path && (
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={() => onChange(null)}
              disabled={uploading}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
