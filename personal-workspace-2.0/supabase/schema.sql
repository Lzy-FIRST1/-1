-- Personal Workspace · Supabase 初始化 SQL
-- 在 Supabase 的 SQL Editor 中整体执行一次即可。

-- 通用记录表：所有模块的数据都存这里（文档式设计，同步最简单）
create table if not exists public.records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_id, kind, id)
);

create index if not exists records_kind_updated_idx on public.records (owner_id, kind, updated_at);

alter table public.records enable row level security;

create policy "records_select_own" on public.records
  for select using (auth.uid() = owner_id);

create policy "records_insert_own" on public.records
  for insert with check (auth.uid() = owner_id);

create policy "records_update_own" on public.records
  for update using (auth.uid() = owner_id);

create policy "records_delete_own" on public.records
  for delete using (auth.uid() = owner_id);

-- 照片存储桶（公开读，私密性要求不高；如需更严格可改为 private 并用签名 URL）
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos_read" on storage.objects
  for select using (bucket_id = 'photos');

create policy "photos_insert_own" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.uid() = owner);

create policy "photos_update_own" on storage.objects
  for update using (bucket_id = 'photos' and auth.uid() = owner);

create policy "photos_delete_own" on storage.objects
  for delete using (bucket_id = 'photos' and auth.uid() = owner);

-- 使用说明：
-- 1. 在 Supabase 创建项目后，打开 SQL Editor 执行以上内容；
-- 2. Authentication → Providers 确认 Email 已启用；
-- 3. 把 Project Settings → API 里的 Project URL 和 anon public key
--    填入应用设置页（或 .env 的 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）。
