'use client';

import { useState, useTransition } from 'react';
import { markReadAction, deleteMessageAction } from './actions';

export type MessageRow = {
  id: string;
  form_type: 'estimate' | 'careers' | 'contact';
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  service: string | null;
  position: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
};

type Filter = 'all' | 'unread';

export default function MessagesInbox({ messages }: { messages: MessageRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible =
    filter === 'unread' ? messages.filter((m) => !m.is_read) : messages;

  function toggle(id: string, isRead: boolean) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    // Auto-mark as read on first expand.
    if (!isRead) {
      startTransition(async () => {
        await markReadAction(id, true);
      });
    }
  }

  function handleToggleRead(e: React.MouseEvent, id: string, isRead: boolean) {
    e.stopPropagation();
    startTransition(async () => {
      await markReadAction(id, !isRead);
    });
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this message? This cannot be undone.')) return;
    startTransition(async () => {
      await deleteMessageAction(id);
      if (expanded === id) setExpanded(null);
    });
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <button
          className={`admin-btn ${
            filter === 'all' ? '' : 'admin-btn-secondary'
          }`}
          onClick={() => setFilter('all')}
          style={{ padding: '7px 14px', fontSize: '0.85rem' }}
        >
          All ({messages.length})
        </button>
        <button
          className={`admin-btn ${
            filter === 'unread' ? '' : 'admin-btn-secondary'
          }`}
          onClick={() => setFilter('unread')}
          style={{ padding: '7px 14px', fontSize: '0.85rem' }}
        >
          Unread ({messages.filter((m) => !m.is_read).length})
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="admin-card">
          <p className="admin-card-desc">
            {filter === 'unread'
              ? 'No unread messages.'
              : 'No messages yet — submissions from the estimate and careers forms will appear here.'}
          </p>
        </div>
      ) : (
        visible.map((m) => (
          <MessageCard
            key={m.id}
            msg={m}
            expanded={expanded === m.id}
            pending={pending}
            onToggle={() => toggle(m.id, m.is_read)}
            onToggleRead={(e) => handleToggleRead(e, m.id, m.is_read)}
            onDelete={(e) => handleDelete(e, m.id)}
          />
        ))
      )}
    </>
  );
}

function MessageCard({
  msg,
  expanded,
  pending,
  onToggle,
  onToggleRead,
  onDelete,
}: {
  msg: MessageRow;
  expanded: boolean;
  pending: boolean;
  onToggle: () => void;
  onToggleRead: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const subject =
    msg.form_type === 'estimate'
      ? `Estimate request from ${msg.name}`
      : msg.form_type === 'careers'
      ? `Job application from ${msg.name}`
      : `Message from ${msg.name}`;

  const mailtoBody =
    msg.message ?? '(They left the message field empty.)';

  const mailto = `mailto:${encodeURIComponent(msg.email)}?subject=${encodeURIComponent(
    'Re: ' + subject
  )}&body=${encodeURIComponent(`Hi ${msg.name},\n\n\n\n— sent in reply to your message:\n\n${mailtoBody}`)}`;

  return (
    <section
      className="admin-card"
      onClick={onToggle}
      style={{
        cursor: 'pointer',
        borderLeft: msg.is_read ? '4px solid #2a332d' : '4px solid #6abf69',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: '#5d6e62',
                background: '#0f1410',
                padding: '2px 6px',
                borderRadius: 3,
                fontWeight: 600,
              }}
            >
              {msg.form_type}
            </span>
            <strong style={{ fontSize: '1rem' }}>{msg.name}</strong>
            {!msg.is_read && (
              <span
                style={{
                  fontSize: '0.68rem',
                  color: '#6abf69',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                NEW
              </span>
            )}
          </div>
          <div
            style={{
              color: '#8aa093',
              fontSize: '0.82rem',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {msg.email}
            {msg.phone ? ` · ${msg.phone}` : ''}
          </div>
        </div>
        <div
          style={{
            color: '#5d6e62',
            fontSize: '0.78rem',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {new Date(msg.created_at).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      </div>

      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid #2a332d',
            fontSize: '0.9rem',
          }}
        >
          {msg.address && (
            <DetailRow label="Property address" value={msg.address} />
          )}
          {msg.service && <DetailRow label="Service" value={msg.service} />}
          {msg.position && <DetailRow label="Position" value={msg.position} />}
          {msg.message && (
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: '#5d6e62',
                  marginBottom: 4,
                }}
              >
                Message
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: '#e8efe9' }}>
                {msg.message}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <a href={mailto} className="admin-btn" style={{ textDecoration: 'none' }}>
              Reply by email
            </a>
            {msg.phone && (
              <a
                href={`tel:${msg.phone.replace(/\D+/g, '')}`}
                className="admin-btn admin-btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                Call
              </a>
            )}
            <button
              className="admin-btn admin-btn-secondary"
              onClick={onToggleRead}
              disabled={pending}
            >
              {msg.is_read ? 'Mark unread' : 'Mark read'}
            </button>
            <button
              className="admin-btn admin-btn-danger"
              onClick={onDelete}
              disabled={pending}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span
        style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          color: '#5d6e62',
          marginRight: 8,
        }}
      >
        {label}
      </span>
      <span style={{ color: '#e8efe9' }}>{value}</span>
    </div>
  );
}
