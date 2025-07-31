-- Create a table for public user profiles
create table profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  resume_path text, -- From the existing code
  billing_address jsonb,
  payment_method jsonb,
  email_count integer default 0
);
comment on table profiles is 'Public user profiles';

-- Add missing columns for usage tracking and payments to the existing profiles table
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists billing_address jsonb,
  add column if not exists payment_method jsonb,
  add column if not exists email_count integer default 0;

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create or replace policies for accessing profiles data
drop policy if exists "Can view own user data." on public.profiles;
create policy "Can view own user data." on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Can update own user data." on public.profiles;
create policy "Can update own user data." on public.profiles
  for update using (auth.uid() = id);

-- Create or replace the function to handle new user creation and populate profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set
    full_name = new.raw_user_meta_data->>'full_name',
    avatar_url = new.raw_user_meta_data->>'avatar_url';
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger on the auth.users table to fire the function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 