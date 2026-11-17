# Savitribai Phule Mahila Mandal, Wardha — Supabase website project

This is the existing React + Vite + TypeScript + Supabase GitHub Pages project, updated with a category-based member records view and category-linked manual/Excel finance workflows. The original `NGO_V113.html` supplied by the user is preserved in `reference/` as the visual/functional reference.

## Important before deployment
- This package has **not been verified against the live Supabase project or tested on a real Android device**. Do not treat it as a production-certified release until the checks below pass.
- The original standalone HTML is preserved as a reference; this build still uses the existing React/Vite UI. It is **not yet a pixel-perfect restoration of every old HTML screen/function**.
- Do not run the original schema creation SQL again on the existing project. Do not drop/recreate tables, reset users, or change existing accounts.
- Never put a Supabase `service_role` key in frontend code or GitHub. Only Project URL and anon/publishable key belong in the Vite build secrets.

## Existing backend assumptions
The app expects the existing tables/columns and enums described in the project database: `profiles`, `programmes`, `financial_records`, `excel_import_jobs`, `documents`, plus the existing homepage/content tables. Finance records use `source='manual'` or `source='excel_import'`; Excel jobs are linked to the uploaded file's `documents.id`.

The additive policy migration is at `supabase/migrations/20261117_member_finance_read.sql`. In the user's current Supabase project, the two policies in this file were already added manually and verified. The `programmes`, `documents`, and Storage read policies were also verified in the conversation. Do not run duplicate SQL unless checking policy names first.

## GitHub Pages deployment
The repository is configured for `https://wasetejas90-source.github.io/spmm-wardha-website/`.

GitHub repository → Settings → Secrets and variables → Actions should contain:
- `VITE_SUPABASE_URL` = existing Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` = existing anon/public publishable key

The GitHub Actions workflow builds with these secrets. The `main` branch workflow deploys `dist/` to GitHub Pages.

## Local development (requires a computer)
1. Install Node.js 20.
2. Copy `.env.example` to `.env` and fill the two public frontend values.
3. Run `npm install`, then `npm run dev`.
4. Run `npm run build` before deployment.

## Android/member/admin acceptance checks
1. Login as the existing approved Admin account.
2. Finance → create categories such as Health and Education.
3. Add a manual record to Health and confirm it appears in Admin Finance.
4. Upload a small test `.xlsx` into Health. Confirm it creates a file in `financial-files`, a published `documents` row (`visibility='members'`), an `excel_import_jobs` row, and `financial_records` rows with `source='excel_import'` and the correct `programme_id`.
5. Login as an approved member. Confirm category buttons appear and the selected category shows separate Manual and Excel sections. Confirm member cannot see Admin controls.
6. Download/open the published Excel file as a member.
7. Confirm pending/rejected/suspended users cannot access member routes or data.
8. Confirm homepage editor, member approval, news/documents, and all existing content functions still work.

## Known scope / limitations
- Original standalone HTML is included as a reference but has not yet been fully ported screen-for-screen into this React app.
- The current spreadsheet importer expects a simple header row with Date, Type, Amount, and optional Description/Category/Remarks/Payment Method; category is selected in the UI. It does not provide a flexible column-mapping wizard.
- Test on a staging copy or with a small test file first. The 25 MB document size constraint remains in effect.
