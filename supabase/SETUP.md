# Supabase Setup — CV Yard Works

CV Yard Works shares the existing **snowplowsales** Supabase project (both are sister companies). All CV Yard Works tables use a `cvy_` prefix and a separate storage bucket (`cvy-site-photos`) so there's no chance of collision with snowplowsales's data.

No new account or project needed.

## 1. Run the schema

1. Open the **snowplowsales** Supabase dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. You should see "Success. No rows returned." This creates 3 tables (`cvy_site_content`, `cvy_services`, `cvy_messages`), RLS policies, and seeds the current site copy.

This script is **safe to re-run** — it uses `IF NOT EXISTS` and `ON CONFLICT DO NOTHING` everywhere, so it won't disturb snowplowsales tables or wipe any existing CV Yard Works content.

## 2. Create the storage bucket

1. In the same Supabase project, go to **Storage** → **New bucket**.
2. Name: `cvy-site-photos`
3. Public bucket: **on**.
4. Click **Create bucket**.

Then add a write policy so logged-in admins can upload:

1. Click into the bucket → **Policies** tab → **New policy** → **For full customization**.
2. Policy name: `cvy auth can write site-photos`
3. Allowed operations: **INSERT**, **UPDATE**, **DELETE**
4. Target roles: `authenticated`
5. USING / WITH CHECK expression: `bucket_id = 'cvy-site-photos'`
6. Save.

## 3. Admin user

You can reuse your existing snowplowsales admin login — Supabase Auth users are project-wide, so the same email/password works on both `/admin` panels. Nothing to do here.

If you'd rather have a separate login for cvyardworks: **Authentication → Users → Add user**, set a different email, enable Auto Confirm, save.

## 4. Send me the API keys

I need the snowplowsales Supabase keys so I can wire them into the cvyardworks `.env.local`:

1. In the Supabase dashboard, go to **Project Settings** (gear icon) → **API**.
2. Copy and send back:
   - **Project URL** (`https://mmkzpssjmkwrevgfebua.supabase.co` — already in memory, but confirm)
   - **anon public** key (long JWT starting `eyJ...`)
   - **service_role** key (also `eyJ...`) — **keep this secret, never paste it in client code**

These are the same keys snowplowsales already uses, so if you have them in 1Password from that setup, those work.
