-- Clean private NEXA Rentals WhatsApp dashboard schema

create table if not exists artipilot_contacts (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  profile_name text,
  ai_enabled boolean default true,
  archived boolean default false,
  notes text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists artipilot_messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references artipilot_contacts(id) on delete cascade,
  phone text not null,
  whatsapp_message_id text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_type text not null check (sender_type in ('customer', 'admin', 'ai', 'system')),
  message_type text default 'text',
  body text,
  status text default 'received',
  status_error text,
  media_url text,
  media_mime_type text,
  media_filename text,
  latitude double precision,
  longitude double precision,
  location_name text,
  location_address text,
  deleted_for_me boolean default false,
  deleted_for_everyone boolean default false,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create index if not exists artipilot_messages_contact_id_idx
  on artipilot_messages (contact_id, created_at desc);

create table if not exists artipilot_quick_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists artipilot_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
