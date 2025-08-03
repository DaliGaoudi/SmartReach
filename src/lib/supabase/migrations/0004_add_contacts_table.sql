-- Create contacts table
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  email text not null,
  company text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sent_at timestamp with time zone
);

-- Create index for better performance
create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contacts_created_at_idx on public.contacts(created_at);

-- Enable Row Level Security
alter table public.contacts enable row level security;

-- Create policies for contacts table
drop policy if exists "Users can view own contacts" on public.contacts;
create policy "Users can view own contacts" on public.contacts
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own contacts" on public.contacts;
create policy "Users can insert own contacts" on public.contacts
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own contacts" on public.contacts;
create policy "Users can update own contacts" on public.contacts
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own contacts" on public.contacts;
create policy "Users can delete own contacts" on public.contacts
  for delete using (auth.uid() = user_id);

-- Add comment
comment on table public.contacts is 'User contacts for email outreach'; 