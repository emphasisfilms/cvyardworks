'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './login.module.css';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';

  const [mode, setMode] = useState<'signin' | 'forgot'>(
    searchParams.get('forgot') ? 'forgot' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Implicit flow puts the tokens in the link itself, so the email works on
    // any device — not just the browser that asked for it.
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'implicit' } }
    );
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/set-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (mode === 'forgot') {
    return (
      <form onSubmit={handleForgot} className={styles.form}>
        {sent ? (
          <>
            <p className={styles.subtitle} style={{ margin: 0 }}>
              If <strong>{email}</strong> has an admin account, a reset link is on its way. Open it
              on any device and choose a new password.
            </p>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setSent(false);
                setMode('signin');
              }}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <p className={styles.subtitle} style={{ margin: 0 }}>
              Enter your email and we’ll send a link to set a new password.
            </p>
            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
                autoFocus
              />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" disabled={loading} className={styles.submit}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setError(null);
                setMode('signin');
              }}
            >
              Back to sign in
            </button>
          </>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label className={styles.field}>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={loading}
        />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={loading}
        />
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" disabled={loading} className={styles.submit}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <button
        type="button"
        className={styles.linkBtn}
        onClick={() => {
          setError(null);
          setMode('forgot');
        }}
      >
        Forgot password?
      </button>
    </form>
  );
}
