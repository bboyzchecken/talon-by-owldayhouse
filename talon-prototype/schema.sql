-- ============================================================
--  Talon · Supabase schema
--  รันใน Supabase > SQL Editor ครั้งเดียว
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  place_id    text unique,                 -- Google Place ID — กันดึงลีดซ้ำ
  name        text not null,
  category    text,
  niche       text,
  area        text,
  rating      numeric default 0,
  reviews     int default 0,
  phone       text,
  email       text,
  address     text,
  has_website boolean default false,
  website_uri text,
  status      text default 'new'
              check (status in ('new','queued','built','pitched','won','rejected','noreply')),
  flagged     boolean default false,
  note        text default '',
  preview_url text,                         -- ลิงก์เว็บตัวอย่างหลัง build
  pitched_at  timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists leads_status_idx on leads(status);
create index if not exists leads_niche_idx  on leads(niche);

-- log การส่งเมล (กันส่งซ้ำ / audit)
create table if not exists outreach_log (
  id       uuid primary key default gen_random_uuid(),
  lead_id  uuid references leads(id) on delete cascade,
  channel  text default 'email',
  to_addr  text,
  subject  text,
  sent_at  timestamptz default now()
);

-- อัปเดต updated_at อัตโนมัติ
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_touch on leads;
create trigger trg_touch before update on leads
  for each row execute function touch_updated_at();

-- หมายเหตุ: เปิด RLS แล้วเขียน policy ตามระบบ auth ของคุณก่อนขึ้น production
-- alter table leads enable row level security;
