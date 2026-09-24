import { createSupabaseServerClient } from '@/lib/supabase/server';
import ChangePasswordForm from './ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function AdminAccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Your Account</h1>
          <p className="admin-page-subtitle">
            Signed in as {user?.email}. This login also works on the Snowplow Sales admin.
          </p>
        </div>
      </div>
      <ChangePasswordForm />
    </>
  );
}
