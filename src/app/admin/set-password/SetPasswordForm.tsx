'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { parseAuthLink } from '@/lib/supabase/auth-link';
import styles from '../login/login.module.css';

type Stage = 'checking' | 'ready' | 'invalid' | 'done';

export default function SetPasswordForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('checking');
  const [email, setEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Turn the link in the URL into a signed-in session.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const params = parseAuthLink(window.location.hash, window.location.search);
    let cancelled = false;

    (async () => {
      if (params.error_description || params.error) {
        setLinkError(params.error_description?.replace(/\+/g, ' ') ?? params.error ?? 'Invalid link');
        setStage('invalid');
        return;
      }
      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) {
          setLinkError(error.message);
          setStage('invalid');
          return;
        }
      } else if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) {
          setLinkError(error.message);
          setStage('invalid');
          return;
        }
      }
      // Strip the tokens from the address bar.
      window.history.replaceState(null, '', window.location.pathname);

      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) {
        setEmail(data.user.email ?? null);
        setStage('ready');
      } else {
        setLinkError('This link is missing or has expired.');
        setStage('invalid');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStage('done');
    setTimeout(() => {
      router.push('/admin');
      router.refresh();
    }, 1200);
  }

  if (stage === 'checking') {
    return <p className={styles.subtitle}>Checking your link…</p>;
  }

  if (stage === 'invalid') {
    return (
      <div className={styles.form}>
        <p className={styles.error}>{linkError}</p>
        <p className={styles.subtitle} style={{ margin: 0 }}>
          Invite and reset links only work once and expire after a while. Ask for a new one from
          the <Link href="/admin/login?forgot=1">sign-in page</Link>.
        </p>
      </div>
    );
  }

  if (stage === 'done') {
    return <p className={styles.subtitle}>Password saved. Taking you to the admin…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {email && (
        <p className={styles.subtitle} style={{ margin: 0 }}>
          Signed in as <strong>{email}</strong>. Choose a password to use from now on.
        </p>
      )}
      <label className={styles.field}>
        <span>New password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={saving}
          autoFocus
        />
      </label>
      <label className={styles.field}>
        <span>Confirm password</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={saving}
        />
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" disabled={saving} className={styles.submit}>
        {saving ? 'Saving…' : 'Save password'}
      </button>
    </form>
  );
}
