import { createSupabaseServerClient } from '@/lib/supabase/server';
import MessagesInbox, { type MessageRow } from './MessagesInbox';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('cvy_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Messages</h1>
        </div>
        <div className="admin-card">
          <p className="admin-card-desc" style={{ color: '#d97070' }}>
            Couldn’t load messages: {error.message}
          </p>
        </div>
      </>
    );
  }

  const messages = (data ?? []) as MessageRow[];
  const unread = messages.filter((m) => !m.is_read).length;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Messages</h1>
          <p className="admin-page-subtitle">
            {messages.length} total
            {unread > 0 ? ` · ${unread} unread` : ''}
          </p>
        </div>
      </div>
      <MessagesInbox messages={messages} />
    </>
  );
}
