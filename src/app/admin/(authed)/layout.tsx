import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminShell from './AdminShell';
import './admin.css';

export const metadata = {
  title: 'Admin | CV Yard Works',
  robots: { index: false, follow: false },
};

export default async function AdminAuthedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Defense in depth — middleware already redirects unauthenticated users.
  if (!user) {
    redirect('/admin/login');
  }

  return <AdminShell userEmail={user.email ?? ''}>{children}</AdminShell>;
}
