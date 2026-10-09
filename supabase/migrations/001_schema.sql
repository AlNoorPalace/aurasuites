-- Aura Suites: tables. Safe to run more than once.
create table if not exists hotels (
  slug text primary key,
  name text not null,
  city text not null default '',
  state text not null default '',
  tagline text not null default '',
  description text not null default '',
  phone text not null default '',
  lat double precision,
  lng double precision,
  image text,
  images text[] not null default '{}',
  amenities text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists room_types (
  id bigint generated always as identity primary key,
  hotel_slug text not null references hotels(slug) on update cascade,
  name text not null,
  total_rooms integer not null default 1 check (total_rooms >= 0),
  base_rate integer not null default 0 check (base_rate >= 0),
  max_guests integer not null default 2 check (max_guests >= 1),
  beds integer not null default 1,
  baths integer not null default 1,
  active boolean not null default true,
  images text[] not null default '{}',
  description text not null default '' check (char_length(description) <= 600),
  unique (hotel_slug, name)
);

create table if not exists bookings (
  reference text primary key,
  hotel_slug text not null references hotels(slug) on update cascade,
  room_type_id bigint not null references room_types(id),
  check_in date not null,
  check_out date not null,
  nights integer not null,
  rooms integer not null,
  adults integer not null,
  children integer not null default 0,
  guest_name text not null,
  guest_phone text not null,
  guest_email text,
  subtotal integer not null,
  discount integer not null default 0,
  total integer not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  payment_method text not null default 'pay_at_hotel',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by text
);
create index if not exists bookings_room_dates on bookings (room_type_id, check_in, check_out);

create table if not exists room_blocks (
  id bigint generated always as identity primary key,
  room_type_id bigint not null references room_types(id) on delete cascade,
  from_date date not null,
  to_date date not null check (to_date >= from_date),
  rooms integer not null check (rooms >= 1),
  reason text not null default ''
);
create index if not exists room_blocks_room on room_blocks (room_type_id, from_date, to_date);

alter table hotels enable row level security;
alter table room_types enable row level security;
alter table bookings enable row level security;
alter table room_blocks enable row level security;
