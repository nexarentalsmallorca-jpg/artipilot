-- Private dashboard schema additions for Artipilot
-- Existing tables: artipilot_workspaces, artipilot_contacts, artipilot_messages

alter table if exists public.artipilot_messages
  add column if not exists deleted_for_everyone boolean default false,
  add column if not exists hidden_for_user_ids text[] default '{}';

create table if not exists public.training_knowledge (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  title text not null,
  content text not null,
  category text default 'General',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists training_knowledge_workspace_idx
  on public.training_knowledge (workspace_id, is_active, updated_at desc);

create table if not exists public.ai_settings (
  workspace_id uuid primary key,
  ai_name text,
  tone text,
  main_job text,
  business_rules text,
  handoff_rules text,
  same_language_reply boolean default true,
  short_human_reply boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  title text not null,
  message text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists quick_replies_workspace_idx
  on public.quick_replies (workspace_id, created_at desc);

create table if not exists public.message_status_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid,
  workspace_id uuid,
  whatsapp_message_id text,
  status text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists message_status_events_message_idx
  on public.message_status_events (message_id, created_at desc);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid,
  workspace_id uuid,
  storage_path text not null,
  mime_type text,
  filename text,
  size_bytes bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists attachments_message_idx
  on public.attachments (message_id);

-- Optional aliases (views) for cleaner naming in SQL clients
create or replace view public.contacts as
  select * from public.artipilot_contacts;

create or replace view public.messages as
  select * from public.artipilot_messages;
