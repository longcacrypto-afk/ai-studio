-- Lát 1 (spec §5): định danh, khách, báo giá, đơn, thanh toán (định danh), sự kiện append-only.
-- Quy ước: PK uuid, tiền bigint VND, mã hiển thị ngắn riêng, updated_at bằng trigger.

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- A. Định danh & khách hàng
create table if not exists users (
  id uuid primary key,                       -- = auth.users.id (Supabase Auth)
  email text unique not null,
  full_name text,
  app_role text not null default 'client' check (app_role in ('client','owner','operator','provider')),
  locale text not null default 'vi-VN',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger users_updated before update on users for each row execute function set_updated_at();

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  display_name text not null,
  legal_name text,
  tax_code text,
  billing_address text,
  status text not null default 'active' check (status in ('active','suspended')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger customers_updated before update on customers for each row execute function set_updated_at();

create table if not exists customer_members (
  customer_id uuid not null references customers(id),
  user_id uuid not null references users(id),
  role text not null default 'owner' check (role in ('owner','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (customer_id, user_id)
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  customer_id uuid references customers(id),
  type text not null check (type in ('privacy','cross_border','marketing','ai_terms')),
  policy_version text not null,
  granted boolean not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- B. Catalog, báo giá, đơn
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  category text not null check (category in ('design','video','web')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger services_updated before update on services for each row execute function set_updated_at();

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_id uuid references customers(id),
  status text not null default 'draft' check (status in ('draft','sent','accepted','expired','superseded','rejected')),
  subtotal bigint not null check (subtotal >= 0),
  discount bigint not null default 0 check (discount >= 0),
  total bigint not null check (total >= 0),
  deposit_pct int not null check (deposit_pct between 0 and 100),
  deposit_amount bigint not null check (deposit_amount >= 0),
  valid_until timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references users(id),
  parent_quote_id uuid references quotes(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger quotes_updated before update on quotes for each row execute function set_updated_at();

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  service_code text not null,
  label text not null,
  qty int not null check (qty >= 1),
  unit_price bigint not null check (unit_price >= 0),
  amount bigint not null check (amount >= 0)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_id uuid not null references customers(id),
  quote_id uuid references quotes(id),
  status text not null default 'awaiting_deposit'
    check (status in ('draft','awaiting_deposit','confirmed','in_production','completed','expired','canceled')),
  total bigint not null check (total >= 0),
  amount_paid bigint not null default 0 check (amount_paid >= 0),
  confirmed_at timestamptz,
  completed_at timestamptz,
  canceled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paid <= total)
);
create trigger orders_updated before update on orders for each row execute function set_updated_at();

-- C. Thanh toán (định danh; webhook & đối soát ở lát sau)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_id uuid references customers(id),
  order_id uuid references orders(id),
  kind text not null check (kind in ('deposit','final','full','extra_revision','plan','topup','donation','refund')),
  provider text not null default 'payos' check (provider in ('payos','sepay','manual')),
  provider_order_code bigint unique,
  transfer_content text unique,
  amount_expected bigint not null check (amount_expected > 0),
  amount_received bigint,
  status text not null default 'pending' check (status in ('pending','paid','expired','needs_review','failed','refunded')),
  paid_at timestamptz,
  expires_at timestamptz,
  verified_via text check (verified_via in ('webhook','status_api','owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payments_updated before update on payments for each row execute function set_updated_at();

-- E/G. Sự kiện & kiểm toán: append-only
create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  from_status text,
  to_status text not null,
  actor_type text not null check (actor_type in ('client','owner','system','provider')),
  actor_id uuid,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

-- Append-only: chặn UPDATE/DELETE ở tầng DB (spec §5.1).
create or replace function forbid_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'bảng % là append-only', tg_table_name;
end $$;
create trigger order_events_append_only before update or delete on order_events for each row execute function forbid_mutation();
create trigger audit_logs_append_only before update or delete on audit_logs for each row execute function forbid_mutation();
create trigger consents_append_only before update or delete on consents for each row execute function forbid_mutation();
