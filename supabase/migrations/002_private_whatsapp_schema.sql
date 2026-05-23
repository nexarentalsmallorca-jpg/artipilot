-- Private WhatsApp dashboard schema (single-tenant)

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  whatsapp_id text unique,
  phone text not null,
  name text,
  profile_name text,
  ai_enabled boolean default true,
  ai_paused_until timestamptz,
  archived boolean default false,
  blocked boolean default false,
  notes text,
  last_message_at timestamptz,
  unread_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists contacts_last_message_idx on public.contacts (last_message_at desc nulls last);
create index if not exists contacts_phone_idx on public.contacts (phone);
create index if not exists contacts_archived_idx on public.contacts (archived, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  whatsapp_message_id text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_type text not null check (sender_type in ('customer', 'admin', 'ai', 'system')),
  message_type text not null default 'text',
  body text,
  status text default 'received',
  status_error text,
  deleted_for_me boolean default false,
  deleted_for_everyone boolean default false,
  raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists messages_contact_created_idx on public.messages (contact_id, created_at);
create index if not exists messages_whatsapp_id_idx on public.messages (whatsapp_message_id);

create table if not exists public.training_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  content text not null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.message_status_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  whatsapp_message_id text,
  status text,
  timestamp timestamptz,
  raw_payload jsonb,
  created_at timestamptz default now()
);
