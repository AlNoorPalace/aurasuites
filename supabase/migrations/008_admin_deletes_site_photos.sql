-- Admin: delete bookings, delete hotels that have bookings, and editable homepage photos.

create table if not exists site_settings (
  key text primary key,
  value jsonb not null
);
alter table site_settings enable row level security;

create or replace function admin_delete_booking(p jsonb) returns jsonb
language plpgsql as $$
declare r text := upper(btrim(coalesce(p->>'reference','')));
begin
  delete from bookings where reference = r;
  if not found then return jsonb_build_object('error','not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- With "force": true the hotel's bookings are deleted too.
create or replace function admin_delete_hotel(p jsonb) returns jsonb
language plpgsql as $$
declare s text := p->>'slug'; force boolean := coalesce((p->>'force')::boolean, false);
begin
  if not exists (select 1 from hotels where slug = s) then return jsonb_build_object('error','not_found'); end if;
  if exists (select 1 from bookings where hotel_slug = s) then
    if not force then return jsonb_build_object('error','has_bookings'); end if;
    delete from bookings where hotel_slug = s;
  end if;
  delete from room_types where hotel_slug = s;
  delete from hotels where slug = s;
  return jsonb_build_object('ok', true);
end $$;

create or replace function site_photos(p jsonb default '{}'::jsonb) returns jsonb
language sql stable as $$
  select coalesce((select value from site_settings where key = 'photos'), '{}'::jsonb)
$$;

create or replace function admin_save_site_photos(p jsonb) returns jsonb
language plpgsql as $$
begin
  insert into site_settings (key, value) values ('photos', p)
    on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_image_in_use(p jsonb) returns jsonb
language sql stable as $$
  select jsonb_build_object('in_use',
    exists (select 1 from hotels where (p->>'url') = any(images) or image = p->>'url')
    or exists (select 1 from room_types where (p->>'url') = any(images))
    or exists (select 1 from site_settings where value::text like '%' || replace(replace(p->>'url','\','\\'),'%','\%') || '%'))
$$;

do $$
declare f text;
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    foreach f in array array['admin_delete_booking(jsonb)','admin_delete_hotel(jsonb)','site_photos(jsonb)','admin_save_site_photos(jsonb)','admin_image_in_use(jsonb)'] loop
      execute format('revoke all on function %s from public', f);
      if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
      if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
      execute format('grant execute on function %s to service_role', f);
    end loop;
  end if;
end $$;
