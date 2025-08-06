-- Create notifications table
create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default now(),
  metadata jsonb default '{}'::jsonb,
  email_id text,
  thread_id text
);

-- Enable RLS
alter table notifications enable row level security;

-- Create policy for users to read their own notifications
create policy "Users can read their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

-- Create policy for system to create notifications
create policy "System can create notifications"
  on notifications for insert
  with check (true);

-- Index for faster queries
create index notifications_user_id_idx on notifications(user_id);
create index notifications_created_at_idx on notifications(created_at);
