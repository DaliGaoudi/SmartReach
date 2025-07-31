-- Create a table for public products
create table products (
  id text primary key,
  active boolean,
  name text,
  description text,
  image text,
  metadata jsonb
);
comment on table products is 'Products table';

-- Create a table for public prices
create table prices (
  id text primary key,
  product_id text,
  active boolean,
  description text,
  unit_amount bigint,
  currency text,
  type text,
  interval text,
  interval_count integer,
  trial_period_days integer,
  metadata jsonb,
  constraint prices_product_id_fkey foreign key (product_id) references products(id)
);
comment on table prices is 'Prices table';

-- Create a table for customers
create table customers (
  id uuid primary key references auth.users (id) not null,
  stripe_customer_id text
);
comment on table customers is 'Stripe customer mapping';

-- Create a table for subscriptions
create table subscriptions (
  id text primary key,
  user_id uuid references auth.users (id) not null,
  status text,
  metadata jsonb,
  price_id text,
  quantity integer,
  cancel_at_period_end boolean,
  created timestamp with time zone not null default timezone('utc'::text, now()),
  current_period_start timestamp with time zone not null default timezone('utc'::text, now()),
  current_period_end timestamp with time zone not null default timezone('utc'::text, now()),
  ended_at timestamp with time zone,
  cancel_at timestamp with time zone,
  canceled_at timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  constraint subscriptions_price_id_fkey foreign key (price_id) references prices(id)
);
comment on table subscriptions is 'Subscriptions table'; 