'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '../actions';

interface Tab {
  href: string;
  label: string;
}

const TABS: Tab[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/home', label: 'Home Page' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/contact', label: 'Contact Page' },
  { href: '/admin/careers', label: 'Careers Page' },
  { href: '/admin/estimate', label: 'Estimate Page' },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/settings', label: 'Site Settings' },
];

export default function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">CVY</span>
          <span className="admin-brand-text">Yard Works</span>
        </div>

        <nav className="admin-nav">
          {TABS.map((tab) => {
            const active =
              tab.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`admin-nav-link${active ? ' is-active' : ''}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-user-label">Signed in</div>
            <div className="admin-user-email" title={userEmail}>
              {userEmail}
            </div>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="admin-signout">
              Sign out
            </button>
          </form>
          <Link href="/" className="admin-view-site" target="_blank" rel="noopener">
            View site ↗
          </Link>
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
