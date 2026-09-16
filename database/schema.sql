create extension if not exists pgcrypto;
create table if not exists admins(id uuid primary key default gen_random_uuid(),email text unique not null,password_hash text not null,created_at timestamptz not null default now());
create table if not exists admin_sessions(id uuid primary key default gen_random_uuid(),admin_id uuid not null references admins(id) on delete cascade,token_hash text unique not null,expires_at timestamptz not null,created_at timestamptz not null default now());
create table if not exists posts(id uuid primary key default gen_random_uuid(),title text not null,slug text unique not null,excerpt text not null,content text not null,cover_url text,cover_alt text not null default '',category text not null,tags jsonb not null default '[]',gallery jsonb not null default '[]',status text not null default 'draft' check(status in ('draft','published')),featured boolean not null default false,source_url text,seo_title text,seo_description text,published_at timestamptz,views_count integer not null default 0,created_by uuid references admins(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists post_images(id uuid primary key default gen_random_uuid(),mime_type text not null,data bytea not null,created_at timestamptz not null default now());
create index if not exists posts_public_idx on posts(status,published_at desc);create index if not exists posts_category_idx on posts(category);create index if not exists sessions_expiry_idx on admin_sessions(expires_at);

create table if not exists citizen_requests(
  id uuid primary key default gen_random_uuid(),
  submission_key uuid unique not null,
  protocol varchar(24) unique not null check(protocol ~ '^AS-[0-9]{8}-[A-Z2-9]{6}$'),
  name varchar(120) not null,
  phone_normalized varchar(13) not null check(phone_normalized ~ '^55[0-9]{10,11}$'),
  neighborhood varchar(100) not null,
  demand_location varchar(180) not null,
  instagram varchar(31),
  birthday_day smallint check(birthday_day between 1 and 31),
  birthday_month smallint check(birthday_month between 1 and 12),
  category varchar(80) not null check(category in ('Iluminação pública','Buracos e pavimentação','Limpeza urbana','Saúde','Educação','Transporte','Segurança','Esporte e lazer','Emprego e empreendedorismo','Sugestão','Outro')),
  category_other varchar(100),
  message varchar(3000) not null,
  privacy_consent_at timestamptz not null,
  marketing_consent boolean not null default false,
  status varchar(80) not null default 'Recebida' check(status in ('Recebida','Em triagem','Encaminhada ao órgão responsável','Em andamento','Aguardando informações do cidadão','Concluída','Arquivada')),
  forwarded_to varchar(160),
  public_response varchar(1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint citizen_birthday_pair check((birthday_day is null)=(birthday_month is null)),
  constraint citizen_category_other check(category='Outro' or category_other is null)
);

create table if not exists citizen_request_updates(
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references citizen_requests(id) on delete cascade,
  previous_status varchar(80),
  status varchar(80) not null check(status in ('Recebida','Em triagem','Encaminhada ao órgão responsável','Em andamento','Aguardando informações do cidadão','Concluída','Arquivada')),
  public_message varchar(1500),
  internal_note varchar(2000),
  forwarded_to varchar(160),
  is_public boolean not null default false,
  created_by uuid references admins(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists citizen_rate_limits(
  identifier_hash char(64) primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 1 check(hits > 0)
);

create index if not exists citizen_requests_created_idx on citizen_requests(created_at desc);
create index if not exists citizen_requests_status_idx on citizen_requests(status,created_at desc);
create index if not exists citizen_requests_category_idx on citizen_requests(category,created_at desc);
create index if not exists citizen_requests_phone_idx on citizen_requests(phone_normalized);
create index if not exists citizen_requests_neighborhood_idx on citizen_requests(lower(neighborhood));
create index if not exists citizen_updates_request_idx on citizen_request_updates(request_id,created_at);

revoke all on citizen_requests,citizen_request_updates,citizen_rate_limits from public;
alter table citizen_requests enable row level security;
alter table citizen_request_updates enable row level security;
alter table citizen_rate_limits enable row level security;
