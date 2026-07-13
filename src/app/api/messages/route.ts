import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendMessageNotification } from '@/lib/notify';

// Public form submissions (estimate + hire application). Inserting here
// instead of from the browser lets us notify the owner by email after
// the message lands in cvy_messages.

const MAX_FIELD = 500;
const MAX_MESSAGE = 5000;

function cleanString(v: unknown, max = MAX_FIELD): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const form_type =
    body.form_type === 'estimate' || body.form_type === 'careers'
      ? (body.form_type as 'estimate' | 'careers')
      : null;
  if (!form_type) {
    return NextResponse.json({ ok: false, error: 'Invalid form type' }, { status: 400 });
  }

  const name = cleanString(body.name);
  const email = cleanString(body.email);
  if (!name || !email) {
    return NextResponse.json(
      { ok: false, error: 'Name and email are required' },
      { status: 400 }
    );
  }

  const payload = {
    form_type,
    name,
    email,
    phone: cleanString(body.phone),
    address: cleanString(body.address),
    service: cleanString(body.service),
    position: cleanString(body.position),
    message: cleanString(body.message, MAX_MESSAGE),
    application_data:
      form_type === 'careers' && body.application_data
        ? body.application_data
        : null,
  };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('cvy_messages').insert(payload);

  if (error) {
    console.error('messages: insert failed', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to save message' },
      { status: 500 }
    );
  }

  // Best-effort — never fail the submission over a notification problem.
  try {
    await sendMessageNotification(payload);
  } catch (e) {
    console.error('messages: notification email failed', e);
  }

  return NextResponse.json({ ok: true });
}
