import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run a few counts and recent-messages query in parallel.
  const [
    totalMessages,
    unreadMessages,
    estimatesLast30d,
    careersLast30d,
    recent,
  ] = await Promise.all([
    supabase.from('cvy_messages').select('*', { count: 'exact', head: true }),
    supabase
      .from('cvy_messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false),
    supabase
      .from('cvy_messages')
      .select('*', { count: 'exact', head: true })
      .eq('form_type', 'estimate')
      .gte('created_at', since30d),
    supabase
      .from('cvy_messages')
      .select('*', { count: 'exact', head: true })
      .eq('form_type', 'careers')
      .gte('created_at', since30d),
    supabase
      .from('cvy_messages')
      .select('id, form_type, name, email, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const stats: { label: string; value: number; hint?: string }[] = [
    {
      label: 'Total messages',
      value: totalMessages.count ?? 0,
      hint: 'All time',
    },
    {
      label: 'Unread',
      value: unreadMessages.count ?? 0,
      hint: 'Needs attention',
    },
    {
      label: 'Estimates (30 days)',
      value: estimatesLast30d.count ?? 0,
      hint: 'Recent quote requests',
    },
    {
      label: 'Careers (30 days)',
      value: careersLast30d.count ?? 0,
      hint: 'Recent applications',
    },
  ];

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">
            Overview of activity and quick links to common edits.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="admin-card"
            style={{ marginBottom: 0, padding: '16px 18px' }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: '#5d6e62',
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 700,
                lineHeight: 1.1,
                marginTop: 4,
                color: s.label === 'Unread' && s.value > 0 ? '#6abf69' : '#e8efe9',
              }}
            >
              {s.value}
            </div>
            {s.hint && (
              <div style={{ fontSize: '0.75rem', color: '#5d6e62', marginTop: 2 }}>
                {s.hint}
              </div>
            )}
          </div>
        ))}
      </div>

      <section className="admin-card">
        <h2 className="admin-card-title">Recent messages</h2>
        <p className="admin-card-desc">The five most recent form submissions.</p>

        {(recent.data ?? []).length === 0 ? (
          <p
            style={{
              fontSize: '0.88rem',
              color: '#8aa093',
              margin: '8px 0 0',
            }}
          >
            No submissions yet. They’ll show up here as soon as someone fills out
            the estimate or careers form.
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {(recent.data ?? []).map((m) => (
              <li
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: '#0f1410',
                  border: '1px solid #2a332d',
                }}
              >
                <span
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    color: '#5d6e62',
                    flexShrink: 0,
                  }}
                >
                  {m.form_type}
                </span>
                <span
                  style={{
                    fontWeight: m.is_read ? 400 : 600,
                    color: '#e8efe9',
                  }}
                >
                  {m.name}
                </span>
                <span
                  style={{
                    color: '#8aa093',
                    fontSize: '0.85rem',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {m.email}
                </span>
                {!m.is_read && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: '#6abf69',
                      fontWeight: 700,
                    }}
                  >
                    NEW
                  </span>
                )}
                <span
                  style={{
                    color: '#5d6e62',
                    fontSize: '0.78rem',
                    flexShrink: 0,
                  }}
                >
                  {new Date(m.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 14 }}>
          <Link
            href="/admin/messages"
            className="admin-btn admin-btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            View all messages →
          </Link>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Quick edits</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <QuickLink href="/admin/home" label="Home page" hint="Hero, About, CTA" />
          <QuickLink href="/admin/services" label="Services" hint="The 4 seasonal cards" />
          <QuickLink href="/admin/contact" label="Contact page" hint="Headings + cards" />
          <QuickLink href="/admin/careers" label="Careers page" hint="Perks + positions" />
          <QuickLink href="/admin/estimate" label="Estimate page" hint="Benefits + heading" />
          <QuickLink href="/admin/settings" label="Site settings" hint="Phone, name, hours" />
        </div>
      </section>
    </>
  );
}

function QuickLink({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '12px 14px',
        background: '#0f1410',
        border: '1px solid #2a332d',
        borderRadius: 6,
        textDecoration: 'none',
        color: '#e8efe9',
        transition: 'border-color 0.12s ease',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{label}</div>
      <div style={{ color: '#5d6e62', fontSize: '0.78rem', marginTop: 2 }}>
        {hint}
      </div>
    </Link>
  );
}
