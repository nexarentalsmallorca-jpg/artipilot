-- Safe upgrades for existing artipilot_* tables (run in Supabase SQL editor)

alter table artipilot_contacts add column if not exists profile_name text;
alter table artipilot_contacts add column if not exists ai_enabled boolean default true;
alter table artipilot_contacts add column if not exists archived boolean default false;
alter table artipilot_contacts add column if not exists notes text;
alter table artipilot_contacts add column if not exists last_message text;
alter table artipilot_contacts add column if not exists last_message_at timestamptz;
alter table artipilot_contacts add column if not exists unread_count integer default 0;
alter table artipilot_contacts add column if not exists updated_at timestamptz default now();

alter table artipilot_messages add column if not exists contact_phone text;
alter table artipilot_messages add column if not exists content text;
alter table artipilot_messages add column if not exists role text;
alter table artipilot_messages add column if not exists delivery_status text;
alter table artipilot_messages add column if not exists status_error text;
alter table artipilot_messages add column if not exists deleted_for_me boolean default false;
alter table artipilot_messages add column if not exists deleted_for_everyone boolean default false;
alter table artipilot_messages add column if not exists raw_payload jsonb;
