import { Resend } from 'resend';

// Owner notification for new form submissions. Sending is best-effort:
// a missing key or a Resend outage must never block the message insert.

export interface MessageNotification {
  form_type: 'estimate' | 'careers';
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  service: string | null;
  position: string | null;
  message: string | null;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cvyardworks.com';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string | null): string {
  if (!value) return '';
  return `<tr>
    <td style="padding:6px 14px 6px 0;color:#5d6e62;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${esc(value)}</td>
  </tr>`;
}

export async function sendMessageNotification(
  msg: MessageNotification
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;

  if (!apiKey || !to) {
    console.warn(
      'notify: RESEND_API_KEY / NOTIFY_EMAIL_TO not set — skipping owner notification email'
    );
    return;
  }

  const from =
    process.env.NOTIFY_EMAIL_FROM ?? 'CV Yard Works <onboarding@resend.dev>';

  const isEstimate = msg.form_type === 'estimate';
  const subject = isEstimate
    ? `New estimate request from ${msg.name}`
    : `New job application from ${msg.name}`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
    <div style="background:#2f7a3e;border-radius:10px 10px 0 0;padding:18px 24px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;">
        ${isEstimate ? 'New Estimate Request' : 'New Job Application'}
      </h1>
    </div>
    <div style="border:1px solid #e2e8e3;border-top:none;border-radius:0 0 10px 10px;padding:20px 24px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${row('Name', msg.name)}
        ${row('Email', msg.email)}
        ${row('Phone', msg.phone)}
        ${row('Address', msg.address)}
        ${row('Service', msg.service)}
        ${row('Position', msg.position)}
        ${row('Message', msg.message)}
      </table>
      <p style="margin:18px 0 0;">
        <a href="${SITE_URL}/admin/messages"
           style="display:inline-block;background:#2f7a3e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:10px 18px;border-radius:6px;">
          View in admin inbox
        </a>
      </p>
      ${
        !isEstimate
          ? '<p style="margin:14px 0 0;color:#5d6e62;font-size:12px;">The full application (references, employment history, etc.) is attached to this message in the admin inbox.</p>'
          : ''
      }
    </div>
  </div>`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: msg.email,
    subject,
    html,
  });

  if (error) {
    console.error('notify: failed to send owner notification email', error);
  }
}
