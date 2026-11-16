# SPMM Wardha – NGO Website (Phase 1 build)
Stack: React + Vite + TypeScript + Tailwind + Supabase. **Not yet tested against a live Supabase project.**

## Setup
**Do not double-click index.html.** It only works through `npm run dev` (or a built+hosted `dist/`). Install Node.js 18+ first from nodejs.org.
1. Create a project at https://supabase.com (free tier OK).
2. SQL Editor → paste `supabase/01_schema_rls_storage.sql` → Run.
3. Authentication → Providers → Email enabled. Authentication → URL Configuration: set Site URL (and `http://localhost:5173`).
4. Copy `.env.example` to `.env`; paste Project URL and **anon** key (Settings → API). Never use the service_role key.
5. `npm install` then `npm run dev`.
6. Register on the site with your email, then in SQL Editor run:
   `update profiles set role='super_admin', status='approved' where email='YOU@EXAMPLE.COM';`
7. Log in → Admin Dashboard. Add a logo file at `public/logo.png` (not included).

## Deploy
`npm run build`; upload `dist/` to Netlify/Vercel/Cloudflare Pages; set the two VITE_ env vars there and add the live URL to Supabase Site URL. Add a rewrite of all paths to `/index.html`.

## Test checklist (do after setup)
Register → shows Pending → admin approves → member sees only published member docs → member cannot open /admin → upload xlsx in Documents → Open full screen → manual finance record → Excel import with a bad row and a duplicate → Export.

## Not yet built
Slider/gallery/activities/leadership/settings admin screens (tables + RLS exist), image upload UI, section visibility, column-mapping UI, PDF in-app viewer, virtualized grid for huge files, financial attachments, Android/real-device testing.
