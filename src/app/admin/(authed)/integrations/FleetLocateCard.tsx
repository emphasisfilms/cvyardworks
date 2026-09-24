'use client';

import { useState, useTransition } from 'react';
import type { ConnectionTest } from '@/lib/fleetlocate';
import { testFleetLocateAction } from './actions';

function Item({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`admin-pill${ok ? '' : ' admin-pill-warn'}`} style={{ marginRight: 6 }}>
      {label} {ok ? '✓' : '–'}
    </span>
  );
}

export default function FleetLocateCard({
  config,
}: {
  config: { username: boolean; password: boolean; appToken: boolean };
}) {
  const [result, setResult] = useState<ConnectionTest | null>(null);
  const [pending, start] = useTransition();
  const allSet = config.username && config.password && config.appToken;

  return (
    <div className="admin-stat">
      <div className="admin-stat-label">FleetLocate GPS (Spireon)</div>
      <div className="admin-stat-value" style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 8 }}>
        <Item ok={config.username} label="Username" />
        <Item ok={config.password} label="Password" />
        <Item ok={config.appToken} label="App token" />
      </div>
      <div className="admin-stat-hint" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="admin-btn admin-btn-secondary admin-btn-sm"
          disabled={pending || !allSet}
          onClick={() => start(async () => setResult(await testFleetLocateAction()))}
          title={allSet ? 'Try signing in to Spireon with the stored credentials' : 'Waiting on the application token from Spireon'}
        >
          {pending ? 'Testing…' : 'Test connection'}
        </button>
        {!allSet && !result && <span>Waiting on the application token from Spireon.</span>}
        {result && (
          <span style={{ color: result.ok ? 'var(--admin-ok)' : 'var(--admin-danger)' }}>{result.detail}</span>
        )}
      </div>
    </div>
  );
}
