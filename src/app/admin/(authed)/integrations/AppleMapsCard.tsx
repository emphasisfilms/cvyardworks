'use client';

import { useState, useTransition } from 'react';
import type { AppleMapsConfig, AppleMapsTest } from '@/lib/apple-maps';
import { testAppleMapsAction } from './actions';

function Item({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`admin-pill${ok ? '' : ' admin-pill-warn'}`} style={{ marginRight: 6 }}>
      {label} {ok ? '✓' : '–'}
    </span>
  );
}

// Dashboard card: which Apple Maps values the deployment can see, plus a test
// that says exactly which link in the chain fails.
export default function AppleMapsCard({ config }: { config: AppleMapsConfig }) {
  const [result, setResult] = useState<AppleMapsTest | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="admin-stat">
      <div className="admin-stat-label">Apple Maps</div>
      <div className="admin-stat-value" style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 8 }}>
        <Item ok={config.teamId} label="Team ID" />
        <Item ok={config.keyId} label="Key ID" />
        <Item ok={config.privateKey} label="Private key" />
      </div>
      <div className="admin-stat-hint" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="admin-btn admin-btn-secondary admin-btn-sm"
          disabled={pending}
          onClick={() => start(async () => setResult(await testAppleMapsAction()))}
        >
          {pending ? 'Testing…' : 'Test Apple Maps'}
        </button>
        {result && (
          <span style={{ color: result.ok ? 'var(--admin-ok)' : 'var(--admin-danger)' }}>{result.detail}</span>
        )}
      </div>
    </div>
  );
}
