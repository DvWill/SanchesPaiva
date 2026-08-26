-- Execute esta migração em projetos que já aplicaram migration.sql anteriormente.
alter table public.posts add column if not exists views_count bigint not null default 0 check (views_count >= 0);
alter table public.posts add column if not exists reading_time integer not null default 1 check (reading_time >= 1);
create table if not exists public.post_views (post_id uuid not null references public.posts(id) on delete cascade,visitor_id uuid not null,viewed_at timestamptz not null default now(),primary key(post_id,visitor_id));
alter table public.post_views enable row level security;
create or replace function public.calculate_reading_time() returns trigger language plpgsql set search_path=public as $$ begin new.reading_time=greatest(1,ceil(array_length(regexp_split_to_array(trim(new.content),'\s+'),1)/220.0)); return new; end $$;
drop trigger if exists posts_calculate_reading_time on public.posts;
create trigger posts_calculate_reading_time before insert or update of content on public.posts for each row execute function public.calculate_reading_time();
create or replace function public.record_post_view(p_slug text,p_visitor_id uuid) returns void language plpgsql security definer set search_path=public as $$ declare target_id uuid; inserted_count integer; begin select id into target_id from public.posts where slug=p_slug and status='published' and published_at<=now(); if target_id is null then return; end if; insert into public.post_views(post_id,visitor_id) values(target_id,p_visitor_id) on conflict do nothing; get diagnostics inserted_count=row_count; if inserted_count=1 then update public.posts set views_count=views_count+1 where id=target_id; end if; end $$;
revoke all on function public.record_post_view(text,uuid) from public;
grant execute on function public.record_post_view(text,uuid) to anon,authenticated;
update public.posts set content=content where true;
