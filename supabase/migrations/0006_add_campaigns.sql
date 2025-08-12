-- Create campaigns table
create table campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  resume_url text,
  status text not null default 'active', -- active, paused, completed
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create campaign_contacts junction table
create table campaign_contacts (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  status text not null default 'pending', -- pending, sent, replied
  sent_at timestamp with time zone,
  replied_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(campaign_id, contact_id)
);

-- Enable RLS
alter table campaigns enable row level security;
alter table campaign_contacts enable row level security;

-- Create policies
create policy "Users can manage their own campaigns"
  on campaigns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their campaign contacts"
  on campaign_contacts for all
  using (
    exists (
      select 1 from campaigns
      where campaigns.id = campaign_contacts.campaign_id
      and campaigns.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns
      where campaigns.id = campaign_contacts.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

-- Create indexes
create index campaigns_user_id_idx on campaigns(user_id);
create index campaign_contacts_campaign_id_idx on campaign_contacts(campaign_id);
create index campaign_contacts_contact_id_idx on campaign_contacts(contact_id);
