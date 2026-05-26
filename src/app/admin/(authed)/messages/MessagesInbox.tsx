'use client';

import { useState, useTransition } from 'react';
import { markReadAction, deleteMessageAction } from './actions';
import type { CareersApplication } from '@/lib/supabase/content-types';

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
  application_data: CareersApplication | null;
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
          {msg.address && !msg.application_data && (
            <DetailRow label="Property address" value={msg.address} />
          )}
          {msg.service && <DetailRow label="Service" value={msg.service} />}
          {msg.position && !msg.application_data && (
            <DetailRow label="Position" value={msg.position} />
          )}
          {msg.message && !msg.application_data && (
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

          {msg.application_data && (
            <ApplicationView app={msg.application_data} />
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

// ============= Hire application rendering =============

const sectionBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  background: '#0f1410',
  border: '1px solid #2a332d',
  borderRadius: 6,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  color: '#8aa093',
  marginBottom: 10,
  fontWeight: 700,
};

function ApplicationView({ app }: { app: CareersApplication }) {
  return (
    <div style={{ marginTop: 6 }}>
      <Section title="Applicant">
        <Kv label="Name" value={app.applicant.name} />
        <Kv label="Address" value={app.applicant.address} />
        <Kv label="Phone" value={app.applicant.phone} />
        <Kv label="Email" value={app.applicant.email} />
        <Kv label="Age" value={app.applicant.age} />
        <Kv label="Date available" value={app.applicant.dateAvailable} />
        <Kv label="Desired position" value={app.applicant.desiredPosition} />
        <Kv label="US citizen" value={fmtBool(app.applicant.usCitizen)} />
        <Kv label="Convicted of a crime" value={fmtBool(app.applicant.convictedCrime)} />
        {app.applicant.convictedCrime && app.applicant.crimeDetails && (
          <Kv label="Crime details" value={app.applicant.crimeDetails} multiline />
        )}
      </Section>

      <Section title="Driver's license">
        <Kv label="Has driver's license" value={fmtBool(app.driversLicense.hasLicense)} />
        <Kv label="Has CDL" value={fmtBool(app.driversLicense.hasCdl)} />
        <Kv label="License state" value={app.driversLicense.licenseState} />
        <Kv label="Primary transportation" value={app.driversLicense.primaryTransportation} />
        <Kv label="Accidents (last 3 yr)" value={app.driversLicense.accidents3yr} />
        <Kv label="Violations (last 3 yr)" value={app.driversLicense.violations3yr} />
      </Section>

      <Section title="Education">
        <EducationDetail label="High School" entry={app.education.highSchool} />
        <EducationDetail label="College" entry={app.education.college} />
        {app.education.other && (
          <Kv label="Other education" value={app.education.other} multiline />
        )}
      </Section>

      {app.references.some((r) => r.name || r.company || r.phone || r.address) && (
        <Section title="References">
          {app.references.map((r, i) =>
            r.name || r.company || r.phone || r.address ? (
              <div
                key={i}
                style={{
                  paddingTop: i > 0 ? 10 : 0,
                  marginTop: i > 0 ? 10 : 0,
                  borderTop: i > 0 ? '1px dashed #2a332d' : 'none',
                }}
              >
                <Kv label="Name" value={r.name} />
                <Kv label="Company" value={r.company} />
                <Kv label="Phone" value={r.phone} />
                <Kv label="Address" value={r.address} />
              </div>
            ) : null
          )}
        </Section>
      )}

      {app.previousEmployment.some(
        (j) => j.company || j.jobTitle || j.startDate || j.endDate
      ) && (
        <Section title="Previous employment">
          {app.previousEmployment.map((j, i) =>
            j.company || j.jobTitle || j.startDate || j.endDate ? (
              <div
                key={i}
                style={{
                  paddingTop: i > 0 ? 10 : 0,
                  marginTop: i > 0 ? 10 : 0,
                  borderTop: i > 0 ? '1px dashed #2a332d' : 'none',
                }}
              >
                <Kv label="Company" value={j.company} />
                <Kv label="Job title" value={j.jobTitle} />
                <Kv label="Phone" value={j.phone} />
                <Kv label="Address" value={j.address} />
                <Kv label="Starting salary" value={j.startingSalary} />
                <Kv label="Ending salary" value={j.endingSalary} />
                <Kv label="Start date" value={j.startDate} />
                <Kv label="End date" value={j.endDate} />
                <Kv label="Reason for leaving" value={j.reasonForLeaving} />
              </div>
            ) : null
          )}
        </Section>
      )}

      <Section title="Military service">
        <Kv label="Served" value={fmtBool(app.military.served)} />
        {app.military.served && (
          <>
            <Kv label="Start" value={app.military.startDate} />
            <Kv label="End" value={app.military.endDate} />
            <Kv label="Branch" value={app.military.branch} />
            <Kv label="Rank" value={app.military.rank} />
            <Kv label="Discharge" value={app.military.dischargeType} />
          </>
        )}
      </Section>

      <Section title="Certification">
        <Kv label="Certified" value={fmtBool(app.certification.certified)} />
        <Kv label="Signature" value={app.certification.signature} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionBoxStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      {children}
    </div>
  );
}

function Kv({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div
      style={{
        display: multiline ? 'block' : 'grid',
        gridTemplateColumns: multiline ? undefined : '180px 1fr',
        gap: multiline ? 0 : 12,
        padding: '3px 0',
        fontSize: '0.85rem',
      }}
    >
      <div style={{ color: '#5d6e62', fontSize: '0.78rem' }}>{label}</div>
      <div
        style={{
          color: '#e8efe9',
          whiteSpace: multiline ? 'pre-wrap' : 'normal',
          marginTop: multiline ? 4 : 0,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EducationDetail({
  label,
  entry,
}: {
  label: string;
  entry: { name: string; start: string; finish: string; graduated: boolean };
}) {
  if (!entry.name && !entry.start && !entry.finish && !entry.graduated) {
    return null;
  }
  return (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ color: '#e8efe9', fontWeight: 600, marginBottom: 2 }}>
        {label}: {entry.name || '—'}
      </div>
      <div style={{ color: '#8aa093', fontSize: '0.82rem' }}>
        {entry.start || '?'} – {entry.finish || '?'}{' '}
        {entry.graduated ? '· Graduated' : ''}
      </div>
    </div>
  );
}

function fmtBool(b: boolean): string {
  return b ? 'Yes' : 'No';
}
