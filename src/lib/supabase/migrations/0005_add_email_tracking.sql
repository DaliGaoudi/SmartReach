-- Create sent emails tracking table
create table sent_emails (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  message_id text unique not null,
  thread_id text,
  subject text,
  sent_at timestamp with time zone default now(),
  status text default 'sent',
  tracking_id text unique default uuid_generate_v4()
);

-- Create email responses tracking table
create table email_responses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  original_email_id uuid references sent_emails(id) on delete cascade,
  message_id text unique,
  thread_id text,
  response_subject text,
  response_body text,
  response_headers jsonb,
  received_at timestamp with time zone default now(),
  processed boolean default false,
  spam_score float default 0
);

-- Create email tracking events table
create table email_tracking_events (
  id uuid default uuid_generate_v4() primary key,
  email_id uuid references sent_emails(id) on delete cascade,
  event_type text not null,
  occurred_at timestamp with time zone default now(),
  metadata jsonb
);

-- Enable RLS
alter table sent_emails enable row level security;
alter table email_responses enable row level security;
alter table email_tracking_events enable row level security;

-- Create policies
create policy "Users can manage their sent emails"
  on sent_emails for all using (auth.uid() = user_id);

create policy "Users can view their email responses"
  on email_responses for all using (auth.uid() = user_id);

create policy "Users can view their email tracking events"
  on email_tracking_events for all
  using (auth.uid() = (
    select user_id from sent_emails where id = email_id
  ));

-- Create indexes for performance
create index sent_emails_user_id_idx on sent_emails(user_id);
create index sent_emails_contact_id_idx on sent_emails(contact_id);
create index sent_emails_message_id_idx on sent_emails(message_id);
create index email_responses_user_id_idx on email_responses(user_id);
create index email_responses_contact_id_idx on email_responses(contact_id);
create index email_responses_message_id_idx on email_responses(message_id);
create index email_tracking_events_email_id_idx on email_tracking_events(email_id);
