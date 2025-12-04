# Asset Manager (Next.js + Supabase)

A minimal Asset Manager web app with Admin and User roles.

- Next.js App Router (TypeScript, Tailwind)
- Supabase Auth + Postgres (RLS)
- Admin: manage categories/departments, view/delete assets
- User: create assets, view only own assets

## Setup

1. Prereqs
   - Node.js 18+
   - macOS with `zsh` (commands below use zsh)
   - A Supabase project (free tier works)

2. Environment Variables
   - Create `.env.local` in the repo root and populate the following:

   ```zsh
   # Public client vars (safe in browser)
   NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key>"

   # Server-only vars (DO NOT expose to client)
   SUPABASE_SERVICE_ROLE_KEY="<service role key>"
   SUPABASE_DB_URL="postgresql://<user>:<password>@<host>:<port>/<db>?sslmode=require"

   # Optional for CLI workflows
   SUPABASE_PROJECT_REF="<project ref>" # e.g. nubxnxmahowkxaayqwaj
   SUPABASE_ACCESS_TOKEN="<personal access token>" # for supabase CLI login
   ```

   - Find these in Supabase: Project Settings → API (URL/keys) and Database (connection string).

3. Database Migrations
   - Migrations run automatically via GitHub Actions on push to `main`.
   - The schema is defined in `supabase/combined_migration.sql`.
   - For manual setup, copy the contents of that file and run in Supabase SQL Editor.

4. Initial Admin Setup
   - After your first signup via `/admin-signup`, run this SQL in Supabase SQL Editor to promote yourself to admin:

   ```sql
   SELECT set_first_admin_by_id('YOUR-USER-ID-HERE');
   ```

   - Replace `YOUR-USER-ID-HERE` with your user ID from `auth.users` table.
   - You can find your user ID by running: `SELECT id, email FROM auth.users;`
   - After this, sign in on `/login` and you'll be redirected to `/dashboard/admin`.

5. Install and Run the App

   ```zsh
   npm install
   npm run dev
   ```

   - Open `http://localhost:3000`.
   - Use the OTP/magic link flow to sign in.
   - For subsequent admins, use the Admin Dashboard invite flow.

## Development

- Scripts:
   - `npm run dev`: start local dev server.
- Env:
   - Use `.env.local` for local development; see variables in Setup above.
- Testing changes:
   - After editing server actions or migrations, refresh the page where the action runs; server actions are executed on submit.

## Docker

- Build and run locally:

```zsh
docker build -t eport-web:local .
docker run --rm -p 3000:3000 \
   -e NEXT_PUBLIC_SUPABASE_URL \
   -e NEXT_PUBLIC_SUPABASE_ANON_KEY \
   -e SUPABASE_SERVICE_ROLE_KEY \
   -e SUPABASE_DB_URL \
   eport-web:local
```

- Compose (if you use `docker-compose.yml`):

```zsh
docker compose up --build
```

- Notes:
   - Ensure env vars are provided to the container. Without `NEXT_PUBLIC_SUPABASE_*` the client cannot connect; without `SUPABASE_SERVICE_ROLE_KEY` admin invites are disabled.

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
- This scaffold favors Server Actions; adjust to Route Handlers if preferred
