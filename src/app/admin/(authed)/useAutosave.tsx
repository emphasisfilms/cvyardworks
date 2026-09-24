'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Debounced autosave for editable tables. Call `touch(row)` after every edit;
// dirty rows are batched and saved shortly after typing stops. A row stays
// dirty if it changes again while a save is in flight.

type Result = { ok: true } | { ok: false; error: string };
export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export function useAutosave<T extends { id: string }>(
  save: (rows: T[]) => Promise<Result>,
  { delay = 800, canSave = () => true }: { delay?: number; canSave?: (row: T) => boolean } = {}
) {
  const dirty = useRef(new Map<string, { row: T; version: number }>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState(0); // dirty rows that can't be saved yet (e.g. no name)

  // Latest callbacks live in refs so timers never call a stale closure.
  const saveRef = useRef(save);
  const canSaveRef = useRef(canSave);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const syncDirty = useCallback(() => {
    setDirtyIds(new Set(dirty.current.keys()));
    setBlocked(Array.from(dirty.current.values()).filter((e) => !canSaveRef.current(e.row)).length);
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), delay);
  }, [delay]);

  const flush = useCallback(async () => {
    if (inFlight.current) return;
    const batch = Array.from(dirty.current.entries()).filter(([, e]) => canSaveRef.current(e.row));
    if (batch.length === 0) {
      setStatus(dirty.current.size ? 'pending' : 'saved');
      return;
    }
    inFlight.current = true;
    setStatus('saving');
    const res = await saveRef.current(batch.map(([, e]) => e.row));
    inFlight.current = false;
    if (res.ok) {
      for (const [id, e] of batch) {
        const cur = dirty.current.get(id);
        if (cur && cur.version === e.version) dirty.current.delete(id);
      }
      setError(null);
      syncDirty();
      if (dirty.current.size) {
        // Something changed while saving — go again.
        setStatus('pending');
        schedule();
      } else {
        setStatus('saved');
      }
    } else {
      setError(res.error);
      setStatus('error');
    }
  }, [schedule, syncDirty]);

  // Refs are updated after render (never during), which is what the compiler rules require.
  useEffect(() => {
    saveRef.current = save;
    canSaveRef.current = canSave;
    flushRef.current = flush;
  });

  const touch = useCallback(
    (row: T) => {
      const prev = dirty.current.get(row.id);
      dirty.current.set(row.id, { row, version: (prev?.version ?? 0) + 1 });
      syncDirty();
      setStatus('pending');
      schedule();
    },
    [schedule, syncDirty]
  );

  const forget = useCallback(
    (id: string) => {
      dirty.current.delete(id);
      syncDirty();
      if (dirty.current.size === 0 && !inFlight.current) setStatus('saved');
    },
    [syncDirty]
  );

  const retry = useCallback(() => {
    setError(null);
    flushRef.current();
  }, []);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0 || inFlight.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const t = timer;
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, []);

  return { touch, forget, retry, flush, status, error, dirtyIds, blocked };
}

export function AutosaveStatusLine({
  status,
  error,
  blocked,
  blockedHint,
  onRetry,
}: {
  status: AutosaveStatus;
  error: string | null;
  blocked: number;
  blockedHint: string;
  onRetry: () => void;
}) {
  if (status === 'error') {
    return (
      <span className="admin-save-status is-error">
        Couldn’t save: {error}{' '}
        <button type="button" className="admin-link-btn" onClick={onRetry}>
          Retry
        </button>
      </span>
    );
  }
  if (blocked > 0) {
    return (
      <span className="admin-save-status is-pending">
        {blocked} row{blocked === 1 ? '' : 's'} {blockedHint}
      </span>
    );
  }
  if (status === 'saving') return <span className="admin-save-status">Saving…</span>;
  if (status === 'pending') return <span className="admin-save-status is-pending">Unsaved changes…</span>;
  if (status === 'saved') return <span className="admin-save-status is-saved">All changes saved</span>;
  return <span className="admin-save-status">Changes save automatically</span>;
}
