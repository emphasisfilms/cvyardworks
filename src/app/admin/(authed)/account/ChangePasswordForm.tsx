'use client';

import { useState, FormEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ChangePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) return setMsg({ kind: 'err', text: 'Use at least 8 characters.' });
    if (password !== confirm) return setMsg({ kind: 'err', text: 'The two passwords don’t match.' });
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setMsg({ kind: 'err', text: error.message });
    setPassword('');
    setConfirm('');
    setMsg({ kind: 'ok', text: 'Password changed.' });
  }

  return (
    <section className="admin-card" style={{ maxWidth: 480 }}>
      <h2 className="admin-card-title">Change password</h2>
      <p className="admin-card-desc">At least 8 characters. You stay signed in after changing it.</p>
      <form onSubmit={submit}>
        <div className="admin-field">
          <label className="admin-field-label">New password</label>
          <input
            className="admin-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={saving}
          />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Confirm new password</label>
          <input
            className="admin-input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={saving}
          />
        </div>
        {msg && (
          <p
            className="admin-field-hint"
            style={{ color: msg.kind === 'ok' ? 'var(--admin-ok)' : 'var(--admin-danger)', marginBottom: 12 }}
          >
            {msg.text}
          </p>
        )}
        <button type="submit" className="admin-btn" disabled={saving}>
          {saving ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </section>
  );
}
