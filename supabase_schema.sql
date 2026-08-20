-- SUPABASE DATABASE AND STORAGE SCHEMA SETUP
-- Run these statements in the Supabase SQL Editor (https://supabase.com -> Project -> SQL Editor)

-- ==========================================
-- 1. Create Admins Table
-- ==========================================
create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table public.admins enable row level security;

-- Policy: Admins can read the admin list
create policy "Allow admins to read admin list"
  on public.admins
  for select
  to authenticated
  using (exists (select 1 from public.admins where id = auth.uid()));

-- Policy: Admins can manage other admins
create policy "Allow admins to manage admins"
  on public.admins
  for all
  to authenticated
  using (exists (select 1 from public.admins where id = auth.uid()));

-- NOTE FOR THE FIRST ADMIN ACCOUNT:
-- After inviting the client via Supabase Auth (Authentication -> Users -> Invite User),
-- copy the client's User UUID and insert it into this table directly using the Supabase SQL Editor:
--
-- INSERT INTO public.admins (id) VALUES ('client-user-uuid');
--
-- Running this inside the Supabase Console bypasses RLS, successfully seeding your first administrator.

-- ==========================================
-- 2. Create Tattoos Table
-- ==========================================
create table public.tattoos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  src text not null,
  alt text not null,
  categories text[] not null,
  image_path text not null
);

-- Enable Row Level Security (RLS)
alter table public.tattoos enable row level security;

-- Policy: Allow public read access to tattoo gallery records
create policy "Allow public read access to tattoos"
  on public.tattoos
  for select
  to public
  using (true);

-- Policy: Allow only authenticated admins to create, modify, or delete tattoo gallery records
create policy "Allow admin write access to tattoos"
  on public.tattoos
  for all
  to authenticated
  using (exists (select 1 from public.admins where id = auth.uid()))
  with check (exists (select 1 from public.admins where id = auth.uid()));

-- ==========================================
-- 3. Configure Storage Bucket Policies
-- ==========================================
-- First, create a public bucket named 'tattoos' in Supabase Storage.
-- Once the bucket is created, you can run the policies below.

-- Policy: Allow public read of storage objects in the 'tattoos' bucket
create policy "Allow public read access to tattoo images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'tattoos');

-- Policy: Allow only authenticated admins to write, update, or delete files in the 'tattoos' bucket
create policy "Allow admin write access to tattoo images"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'tattoos' 
    and exists (select 1 from public.admins where id = auth.uid())
  )
  with check (
    bucket_id = 'tattoos' 
    and exists (select 1 from public.admins where id = auth.uid())
  );
