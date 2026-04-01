-- 在 Supabase 控制台 → SQL Editor 中执行。
-- 需在 Authentication → Providers 中启用「Anonymous」匿名登录。

create table if not exists public.covers (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  image_url text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  model_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_model_id_idx on public.comments (model_id);
create index if not exists covers_created_at_idx on public.covers (created_at desc);

alter table public.covers enable row level security;
alter table public.comments enable row level security;

drop policy if exists "covers_read_all" on public.covers;
create policy "covers_read_all" on public.covers for select using (true);

drop policy if exists "covers_insert_own" on public.covers;
create policy "covers_insert_own" on public.covers for insert with check (auth.uid() = user_id);

drop policy if exists "comments_read_all" on public.comments;
create policy "comments_read_all" on public.comments for select using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);

-- ========== Storage：应用内「分享到社区」上传封面 ==========
-- 桶名须与 src/services/communityApi.js 中 COMMUNITY_COVERS_BUCKET 一致

insert into storage.buckets (id, name, public)
values ('gunpla-covers', 'gunpla-covers', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "gunpla_covers_public_read" on storage.objects;
create policy "gunpla_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'gunpla-covers');

drop policy if exists "gunpla_covers_auth_upload" on storage.objects;
create policy "gunpla_covers_auth_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'gunpla-covers'
    and auth.role() = 'authenticated'
  );
