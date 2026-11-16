-- SPMM Wardha: Phase 1 database setup
-- Run once in Supabase Dashboard > SQL Editor > New query > paste > Run.
-- After your first signup, make yourself Super Admin (see bottom of file).

create extension if not exists pgcrypto;

-- ===== Types =====
create type app_role   as enum ('super_admin','admin','member','pending');
create type app_status as enum ('pending','approved','rejected','suspended');
create type doc_visibility as enum ('public','members','admins');
create type txn_type   as enum ('income','expense');
create type txn_source as enum ('manual','excel_import');

-- ===== Profiles (trusted roles live here, never in the browser) =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  mobile text,
  designation text,
  role app_role not null default 'pending',
  status app_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on profiles(status);

-- ===== Helper functions =====
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
    where id = auth.uid() and role in ('admin','super_admin') and status = 'approved');
$$;
create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
    where id = auth.uid() and role = 'super_admin' and status = 'approved');
$$;
create or replace function is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
    where id = auth.uid() and status = 'approved' and role in ('member','admin','super_admin'));
$$;

-- New signup => always Pending Member
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, mobile, designation)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    new.raw_user_meta_data->>'mobile',
    new.raw_user_meta_data->>'designation');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Block users from changing their own role/status; only super admin sets admin roles
create or replace function guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  if auth.uid() is null then return new; end if; -- SQL editor / service role
  if (new.role is distinct from old.role) or (new.status is distinct from old.status) then
    if not is_admin() then raise exception 'Not allowed'; end if;
    if new.role in ('admin','super_admin') and not is_super_admin() then
      raise exception 'Only Super Admin can assign admin roles'; end if;
    if new.id = auth.uid() then raise exception 'Cannot change own role/status'; end if;
    new.reviewed_by = auth.uid(); new.reviewed_at = now();
  end if;
  return new;
end $$;
create trigger trg_guard_profile before update on profiles
  for each row execute function guard_profile_update();

alter table profiles enable row level security;
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_admin());
create policy profiles_update on profiles for update
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
create policy profiles_delete on profiles for delete using (is_admin());

-- ===== Public website content (bilingual) =====
create table homepage_content (
  key text primary key,               -- e.g. 'hero_title'
  value_en text, value_mr text,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);
create table slider_images (
  id uuid primary key default gen_random_uuid(),
  image_path text not null, caption_en text, caption_mr text,
  sort_order int not null default 0, is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create table leadership (
  id uuid primary key default gen_random_uuid(),
  name_en text not null, name_mr text, title_en text, title_mr text,
  bio_en text, bio_mr text, photo_path text,
  sort_order int not null default 0, is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create table activities (
  id uuid primary key default gen_random_uuid(),
  title_en text not null, title_mr text, description_en text, description_mr text,
  category text, activity_date date, image_path text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create table news (
  id uuid primary key default gen_random_uuid(),
  title_en text not null, title_mr text, body_en text, body_mr text,
  image_path text, published_on date not null default current_date,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create table gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title_en text not null, title_mr text, category text, album_date date,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create table gallery_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references gallery_albums(id) on delete cascade,
  image_path text not null, caption_en text, caption_mr text, taken_on date,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index on gallery_images(album_id);
create table site_settings (
  key text primary key, value jsonb not null default '{}',  -- contact info, section visibility
  updated_at timestamptz not null default now()
);

-- Public-read-if-published, admin-write policies
do $$
declare t text;
begin
  foreach t in array array['homepage_content','slider_images','leadership','activities',
                           'news','gallery_albums','gallery_images'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_published or is_admin())', t||'_sel', t);
    execute format('create policy %I on %I for all using (is_admin()) with check (is_admin())', t||'_adm', t);
  end loop;
end $$;
alter table site_settings enable row level security;
create policy site_settings_sel on site_settings for select using (true);
create policy site_settings_adm on site_settings for all using (is_admin()) with check (is_admin());

-- ===== Documents =====
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, category text,
  bucket text not null default 'private-documents' check (bucket in ('private-documents','financial-files')),
  file_path text not null, original_filename text not null,
  mime_type text, size_bytes bigint check (size_bytes <= 26214400),
  visibility doc_visibility not null default 'admins',
  is_published boolean not null default false,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index on documents(visibility, is_published);
alter table documents enable row level security;
create policy documents_sel on documents for select using (
  is_admin()
  or (is_published and visibility = 'public')
  or (is_published and visibility = 'members' and is_approved()));
create policy documents_adm on documents for all using (is_admin()) with check (is_admin());

-- ===== Finance (admin only; members get approved reports via documents) =====
create table programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, description text,
  created_at timestamptz not null default now()
);
create table excel_import_jobs (
  id uuid primary key default gen_random_uuid(),
  filename text not null, sheet_name text,
  document_id uuid references documents(id) on delete set null,
  total_rows int, imported_rows int, rejected_rows int, duplicate_rows int,
  report jsonb,                       -- per-row accepted/rejected reasons
  imported_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create table financial_records (
  id uuid primary key default gen_random_uuid(),
  txn_date date not null,
  programme_id uuid references programmes(id) on delete set null,
  programme_name text,
  category text not null,
  description text,
  txn_type txn_type not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text, remarks text,
  attachment_path text,               -- in financial-files bucket
  source txn_source not null default 'manual',
  import_job_id uuid references excel_import_jobs(id) on delete set null,
  dedupe_hash text,                   -- md5(date|type|amount|category|description)
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on financial_records(txn_date);
create index on financial_records(programme_id);
create index on financial_records(category);
create unique index financial_records_dedupe on financial_records(dedupe_hash) where dedupe_hash is not null;
do $$
declare t text;
begin
  foreach t in array array['programmes','excel_import_jobs','financial_records'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (is_admin()) with check (is_admin())', t||'_adm', t);
  end loop;
end $$;
-- Members may read programme names only
create policy programmes_member_sel on programmes for select using (is_approved());

-- ===== Audit logs =====
create table audit_logs (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, table_name text, record_id text,
  details jsonb, created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
create policy audit_sel on audit_logs for select using (is_admin());
-- no insert/update/delete policies: written only by the trigger below

create or replace function log_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs(actor, action, table_name, record_id, details)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
          case tg_op when 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['profiles','documents','financial_records','news','activities',
                           'slider_images','gallery_images','excel_import_jobs'] loop
    execute format('create trigger %I after insert or update or delete on %I
                    for each row execute function log_change()', 'audit_'||t, t);
  end loop;
end $$;

-- ===== Storage =====
insert into storage.buckets (id, name, public, file_size_limit) values
  ('site-media','site-media', true,  10485760),
  ('private-documents','private-documents', false, 26214400),
  ('financial-files','financial-files', false, 26214400)
on conflict (id) do nothing;

create policy site_media_read on storage.objects for select using (bucket_id = 'site-media');
create policy site_media_admin on storage.objects for all
  using (bucket_id = 'site-media' and is_admin())
  with check (bucket_id = 'site-media' and is_admin());

create policy private_docs_admin on storage.objects for all
  using (bucket_id = 'private-documents' and is_admin())
  with check (bucket_id = 'private-documents' and is_admin());
create policy private_docs_member_read on storage.objects for select using (
  bucket_id = 'private-documents' and exists (
    select 1 from documents d
    where d.bucket = 'private-documents' and d.file_path = storage.objects.name
      and d.is_published and d.visibility = 'members' and is_approved()));

create policy financial_files_admin on storage.objects for all
  using (bucket_id = 'financial-files' and is_admin())
  with check (bucket_id = 'financial-files' and is_admin());
-- Members reading a published Excel/report stored in financial-files:
create policy financial_files_member_read on storage.objects for select using (
  bucket_id = 'financial-files' and exists (
    select 1 from documents d
    where d.bucket = 'financial-files' and d.file_path = storage.objects.name
      and d.is_published and d.visibility = 'members' and is_approved()));

-- ===== BOOTSTRAP: run AFTER you register on the site with your own email =====
-- update profiles set role='super_admin', status='approved' where email='YOUR_EMAIL_HERE';
