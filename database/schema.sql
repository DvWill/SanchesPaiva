create extension if not exists pgcrypto;

create table if not exists admins(
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions(
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists posts(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text not null,
  content text not null,
  cover_url text,
  cover_alt text not null default '',
  category text not null,
  tags jsonb not null default '[]',
  gallery jsonb not null default '[]',
  status text not null default 'draft' check(status in ('draft','published')),
  featured boolean not null default false,
  source_url text,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  views_count integer not null default 0,
  created_by uuid references admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists post_images(
  id uuid primary key default gen_random_uuid(),
  mime_type text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists citizen_requests(
  id uuid primary key default gen_random_uuid(),
  submission_key uuid unique not null,
  protocol varchar(24) unique not null check(protocol ~ '^AS-[0-9]{8}-[A-Z0-9]{6}$'),
  name varchar(120) not null,
  phone_normalized varchar(11) not null check(phone_normalized ~ '^[0-9]{10,11}$'),
  email varchar(160),
  neighborhood varchar(100) not null,
  demand_location varchar(180) not null,
  subject varchar(160) not null,
  instagram varchar(31),
  birthday_day smallint check(birthday_day between 1 and 31),
  birthday_month smallint check(birthday_month between 1 and 12),
  category varchar(80) not null check(category in ('Iluminação pública','Buracos e pavimentação','Limpeza urbana','Saúde','Educação','Transporte','Segurança','Esporte e lazer','Emprego e empreendedorismo','Sugestão','Outro')),
  category_other varchar(100),
  message varchar(3000) not null,
  privacy_consent_at timestamptz not null,
  marketing_consent boolean not null default false,
  status varchar(24) not null default 'RECEBIDO' check(status in ('RECEBIDO','EM_ANALISE','EM_ANDAMENTO','AGUARDANDO_CLIENTE','CONCLUIDO','CANCELADO')),
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
  previous_status varchar(24),
  status varchar(24) not null check(status in ('RECEBIDO','EM_ANALISE','EM_ANDAMENTO','AGUARDANDO_CLIENTE','CONCLUIDO','CANCELADO')),
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

-- Migração idempotente para bancos que já possuíam a primeira versão do Alô, Sanches.
alter table citizen_requests add column if not exists email varchar(160);
alter table citizen_requests add column if not exists subject varchar(160);
alter table citizen_requests drop constraint if exists citizen_requests_protocol_check;
alter table citizen_requests drop constraint if exists citizen_requests_phone_normalized_check;
alter table citizen_requests drop constraint if exists citizen_requests_status_check;
alter table citizen_request_updates drop constraint if exists citizen_request_updates_status_check;
alter table citizen_request_updates drop constraint if exists citizen_request_updates_previous_status_check;

update citizen_requests
set phone_normalized=substring(phone_normalized from 3)
where phone_normalized ~ '^55[0-9]{10,11}$';

update citizen_requests
set subject=case when category='Outro' and category_other is not null then category_other else category end
where subject is null or btrim(subject)='';

update citizen_requests set status=case status
  when 'Recebida' then 'RECEBIDO'
  when 'ENVIADO' then 'RECEBIDO'
  when 'Em triagem' then 'EM_ANALISE'
  when 'ACEITO' then 'EM_ANALISE'
  when 'Encaminhada ao órgão responsável' then 'EM_ANDAMENTO'
  when 'PROTOCOLADO' then 'EM_ANDAMENTO'
  when 'Em andamento' then 'EM_ANDAMENTO'
  when 'EM_EXECUCAO' then 'EM_ANDAMENTO'
  when 'Aguardando informações do cidadão' then 'AGUARDANDO_CLIENTE'
  when 'Concluída' then 'CONCLUIDO'
  when 'CONCLUIDO' then 'CONCLUIDO'
  when 'Arquivada' then 'CONCLUIDO'
  else status end
where status not in ('RECEBIDO','EM_ANALISE','EM_ANDAMENTO','AGUARDANDO_CLIENTE','CONCLUIDO','CANCELADO');

update citizen_request_updates set previous_status=case previous_status
  when 'Recebida' then 'RECEBIDO'
  when 'ENVIADO' then 'RECEBIDO'
  when 'Em triagem' then 'EM_ANALISE'
  when 'ACEITO' then 'EM_ANALISE'
  when 'Encaminhada ao órgão responsável' then 'EM_ANDAMENTO'
  when 'PROTOCOLADO' then 'EM_ANDAMENTO'
  when 'Em andamento' then 'EM_ANDAMENTO'
  when 'EM_EXECUCAO' then 'EM_ANDAMENTO'
  when 'Aguardando informações do cidadão' then 'AGUARDANDO_CLIENTE'
  when 'Concluída' then 'CONCLUIDO'
  when 'CONCLUIDO' then 'CONCLUIDO'
  when 'Arquivada' then 'CONCLUIDO'
  else previous_status end
where previous_status is not null
  and previous_status not in ('RECEBIDO','EM_ANALISE','EM_ANDAMENTO','AGUARDANDO_CLIENTE','CONCLUIDO','CANCELADO');

update citizen_request_updates set status=case status
  when 'Recebida' then 'RECEBIDO'
  when 'ENVIADO' then 'RECEBIDO'
  when 'Em triagem' then 'EM_ANALISE'
  when 'ACEITO' then 'EM_ANALISE'
  when 'Encaminhada ao órgão responsável' then 'EM_ANDAMENTO'
  when 'PROTOCOLADO' then 'EM_ANDAMENTO'
  when 'Em andamento' then 'EM_ANDAMENTO'
  when 'EM_EXECUCAO' then 'EM_ANDAMENTO'
  when 'Aguardando informações do cidadão' then 'AGUARDANDO_CLIENTE'
  when 'Concluída' then 'CONCLUIDO'
  when 'CONCLUIDO' then 'CONCLUIDO'
  when 'Arquivada' then 'CONCLUIDO'
  else status end
where status not in ('RECEBIDO','EM_ANALISE','EM_ANDAMENTO','AGUARDANDO_CLIENTE','CONCLUIDO','CANCELADO');

alter table citizen_requests alter column phone_normalized type varchar(11);
alter table citizen_requests alter column subject set not null;
alter table citizen_requests alter column status type varchar(24);
alter table citizen_requests alter column status set default 'RECEBIDO';
alter table citizen_requests add constraint citizen_requests_protocol_check
  check(protocol ~ '^AS-[0-9]{8}-[A-Z0-9]{6}$');
alter table citizen_requests add constraint citizen_requests_phone_normalized_check
  check(phone_normalized ~ '^[0-9]{10,11}$');
alter table citizen_request_updates alter column status type varchar(24);
alter table citizen_request_updates alter column previous_status type varchar(24);
alter table citizen_requests add constraint citizen_requests_status_check
  check(status in ('RECEBIDO','EM_ANALISE','EM_ANDAMENTO','AGUARDANDO_CLIENTE','CONCLUIDO','CANCELADO'));
alter table citizen_request_updates add constraint citizen_request_updates_status_check
  check(status in ('RECEBIDO','EM_ANALISE','EM_ANDAMENTO','AGUARDANDO_CLIENTE','CONCLUIDO','CANCELADO'));
alter table citizen_request_updates add constraint citizen_request_updates_previous_status_check
  check(previous_status is null or previous_status in ('RECEBIDO','EM_ANALISE','EM_ANDAMENTO','AGUARDANDO_CLIENTE','CONCLUIDO','CANCELADO')) not valid;

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists citizen_requests_set_updated_at on citizen_requests;
create trigger citizen_requests_set_updated_at
before update on citizen_requests
for each row execute function set_updated_at();

create index if not exists posts_public_idx on posts(status,published_at desc);
create index if not exists posts_category_idx on posts(category);
create index if not exists sessions_expiry_idx on admin_sessions(expires_at);
create index if not exists citizen_requests_protocol_idx on citizen_requests(protocol);
create index if not exists citizen_requests_created_idx on citizen_requests(created_at desc);
create index if not exists citizen_requests_status_idx on citizen_requests(status,created_at desc);
create index if not exists citizen_requests_category_idx on citizen_requests(category,created_at desc);
create index if not exists citizen_requests_phone_idx on citizen_requests(phone_normalized);
create index if not exists citizen_requests_subject_idx on citizen_requests(lower(subject));
create index if not exists citizen_requests_neighborhood_idx on citizen_requests(lower(neighborhood));
create index if not exists citizen_updates_request_idx on citizen_request_updates(request_id,created_at);

revoke all on citizen_requests,citizen_request_updates,citizen_rate_limits from public;
alter table citizen_requests enable row level security;
alter table citizen_request_updates enable row level security;
alter table citizen_rate_limits enable row level security;
