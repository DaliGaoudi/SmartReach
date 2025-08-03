-- Create a table for storing user OAuth tokens (Gmail, etc.)
create table user_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) not null unique,
  access_token text not null,
  refresh_token text,
  expires_at timestamp with time zone,
  provider text default 'google',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
comment on table user_tokens is 'OAuth tokens for external service connections';

-- Set up Row Level Security (RLS)
alter table public.user_tokens enable row level security;

-- Create policies for accessing user_tokens data
drop policy if exists "Can view own tokens." on public.user_tokens;
create policy "Can view own tokens." on public.user_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "Can insert own tokens." on public.user_tokens;
create policy "Can insert own tokens." on public.user_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "Can update own tokens." on public.user_tokens;
create policy "Can update own tokens." on public.user_tokens
  for update using (auth.uid() = user_id);

drop policy if exists "Can delete own tokens." on public.user_tokens;
create policy "Can delete own tokens." on public.user_tokens
  for delete using (auth.uid() = user_id);

-- Create an index for faster lookups
create index if not exists idx_user_tokens_user_id on user_tokens(user_id);
create index if not exists idx_user_tokens_provider on user_tokens(provider); 