create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(), title text not null check (char_length(title) between 3 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'), excerpt text not null check (char_length(excerpt) <= 360),
  content text not null, cover_url text, cover_alt text not null default '', category text not null,
  tags text[] not null default '{}', gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery)='array'),
  status text not null default 'draft' check (status in ('draft','published')), featured boolean not null default false,
  source_url text, seo_title text check (char_length(seo_title) <= 70), seo_description text check (char_length(seo_description) <= 170),
  published_at timestamptz, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists posts_public_feed_idx on public.posts(status, published_at desc);
create index if not exists posts_category_idx on public.posts(category);
alter table public.posts add column if not exists views_count bigint not null default 0 check (views_count >= 0);
alter table public.posts add column if not exists reading_time integer not null default 1 check (reading_time >= 1);

create table if not exists public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_id uuid not null,
  viewed_at timestamptz not null default now(),
  primary key(post_id, visitor_id)
);
alter table public.post_views enable row level security;

create or replace function public.calculate_reading_time() returns trigger language plpgsql set search_path=public as $$
begin new.reading_time=greatest(1,ceil(array_length(regexp_split_to_array(trim(new.content),'\s+'),1)/220.0)); return new; end $$;
drop trigger if exists posts_calculate_reading_time on public.posts;
create trigger posts_calculate_reading_time before insert or update of content on public.posts for each row execute function public.calculate_reading_time();

create or replace function public.record_post_view(p_slug text,p_visitor_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare target_id uuid; inserted_count integer;
begin
  select id into target_id from public.posts where slug=p_slug and status='published' and published_at<=now();
  if target_id is null then return; end if;
  insert into public.post_views(post_id,visitor_id) values(target_id,p_visitor_id) on conflict do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=1 then update public.posts set views_count=views_count+1 where id=target_id; end if;
end $$;
revoke all on function public.record_post_view(text,uuid) from public;
grant execute on function public.record_post_view(text,uuid) to anon,authenticated;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admins where user_id=auth.uid());
$$;
revoke all on function public.is_admin() from public; grant execute on function public.is_admin() to anon, authenticated;
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at before update on public.posts for each row execute function public.touch_updated_at();

alter table public.admins enable row level security; alter table public.posts enable row level security;
create policy "admins read own role" on public.admins for select to authenticated using (user_id=auth.uid());
create policy "public reads published posts" on public.posts for select to anon,authenticated using (status='published' and published_at is not null and published_at<=now() or public.is_admin());
create policy "admins insert posts" on public.posts for insert to authenticated with check (public.is_admin() and created_by=auth.uid());
create policy "admins update posts" on public.posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete posts" on public.posts for delete to authenticated using (public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('post-images','post-images',true,8388608,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "public reads post images" on storage.objects for select to public using (bucket_id='post-images');
create policy "admins upload post images" on storage.objects for insert to authenticated with check (bucket_id='post-images' and public.is_admin() and (storage.foldername(name))[1]=auth.uid()::text);
create policy "admins update post images" on storage.objects for update to authenticated using (bucket_id='post-images' and public.is_admin()) with check (bucket_id='post-images' and public.is_admin());
create policy "admins delete post images" on storage.objects for delete to authenticated using (bucket_id='post-images' and public.is_admin());

-- Execute depois de criar o primeiro usuario pelo painel Auth do Supabase:
-- insert into public.admins(user_id) select id from auth.users where email='email-do-admin@dominio.com';
