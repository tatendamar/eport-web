# Asset Manager (Next.js + Supabase)

A minimal Asset Manager web app with Admin and User roles.

- Next.js App Router (TypeScript, Tailwind)
- Supabase Auth + Postgres (RLS)
- Admin: manage categories/departments, view/delete assets
- User: create assets, view only own assets

## Setup 

1. Prereqs
   - Node 18+
   - A Supabase project (free tier is fine)

2. Configure Supabase
   - In the Supabase SQL editor, run the SQL files in order:
     - `supabase/schema.sql`
     - `supabase/policies.sql`
   - Create at least one department and category (insert rows via SQL or Table Editor).
   - In the `profiles` table, set your user to role `admin` to access the admin dashboard.

3. Environment Variables
   - Copy `.env.local.example` to `.env.local` and fill in from Supabase project settings:

   ```bash
   cp .env.local.example .env.local
   # Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. Initial Admin Signup (Optional)

   If you want to restrict admin creation to a single controlled invite flow:

   1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (never expose this client-side).
   2. Start the app and visit `/admin-signup` while no admin exists.
   3. Enter the admin's email to send an invite; they must verify the email.
   4. After verification, they can login via OTP on `/login`.

5. Install and Run

   ```bash
   npm install
   npm run dev
   ```

   Open <http://localhost:3000> and sign in with your email. Use the OTP or magic link sent by Supabase.

## Deploy (Vercel + GitHub)

1. Push this repo to GitHub.
2. Import the repo in Vercel, set the two Supabase env vars in Vercel Project Settings.
3. Each push to `main` will trigger an automatic deployment.

## Notes

- Pages:
   - `/admin-signup` – one-time admin invite (visible only if no admin exists)
   - `/login` – passwordless sign-in
   - `/dashboard` – redirects by role to `/dashboard/admin` or `/dashboard/user`
   - `/assets/new` – create asset
- RLS policies enforce access: users see/manage only their own assets; admins get elevated privileges.
- This scaffold favors Server Actions; adjust to Route Handlers if preferred.
