-- Admin functions. Called only from the server with the service-role key.
-- Saves keep the stored images / description when the key is absent from p.

create or replace function admin_list_bookings(p jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable as $$
declare q text := lower(btrim(coalesce(p->>'q',''))); qd text := regexp_replace(coalesce(p->>'q',''), '\D', '', 'g'); res jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into res from (
    select k.reference, k.hotel_slug, h.name as hotel_name, r.name as room_name, k.check_in, k.check_out,
           k.nights, k.rooms, k.adults, k.children, k.guest_name, k.guest_phone, k.guest_email,
           k.subtotal, k.discount, k.total, k.status, k.payment_method, k.created_at, k.cancelled_by
    from bookings k join hotels h on h.slug = k.hotel_slug join room_types r on r.id = k.room_type_id
    where (q = '' or lower(k.guest_name) like '%' || q || '%' or lower(k.reference) like '%' || q || '%'
           or (qd <> '' and k.guest_phone like '%' || qd || '%'))
      and (coalesce(p->>'status','') = '' or k.status = p->>'status')
      and (coalesce(p->>'hotel','') = '' or k.hotel_slug = p->>'hotel')
      and (coalesce(p->>'from','') = '' or k.check_out > (p->>'from')::date)
      and (coalesce(p->>'to','') = '' or k.check_in <= (p->>'to')::date)
    limit 500
  ) x;
  return jsonb_build_object('bookings', res, 'summary', jsonb_build_object(
    'count', jsonb_array_length(res),
    'confirmed', (select count(*) from jsonb_array_elements(res) e where e->>'status' = 'confirmed'),
    'cancelled', (select count(*) from jsonb_array_elements(res) e where e->>'status' = 'cancelled'),
    'revenue', coalesce((select sum((e->>'total')::int) from jsonb_array_elements(res) e where e->>'status' = 'confirmed'), 0)));
end $$;

create or replace function admin_list_hotels(p jsonb default '{}'::jsonb) returns jsonb
language sql stable as $$
  select jsonb_build_object('hotels', coalesce(jsonb_agg(to_jsonb(h) || jsonb_build_object(
      'has_bookings', exists (select 1 from bookings b where b.hotel_slug = h.slug),
      'room_count', (select count(*) from room_types r where r.hotel_slug = h.slug))
    order by h.sort_order, h.name), '[]'::jsonb))
  from hotels h
$$;

create or replace function admin_save_hotel(p jsonb) returns jsonb
language plpgsql as $$
declare
  s text := lower(btrim(coalesce(p->>'slug','')));
  imgs text[]; h hotels%rowtype; existing boolean;
begin
  if s !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then return jsonb_build_object('error','invalid_slug'); end if;
  if btrim(coalesce(p->>'name','')) = '' then return jsonb_build_object('error','invalid_input'); end if;
  existing := exists (select 1 from hotels where slug = s);
  if existing and coalesce((p->>'create')::boolean, false) then return jsonb_build_object('error','slug_taken'); end if;
  if p ? 'images' then
    select coalesce(array_agg(v), '{}') into imgs from jsonb_array_elements_text(p->'images') v;
    if coalesce(array_length(imgs, 1), 0) > 12 then return jsonb_build_object('error','too_many_images'); end if;
  end if;
  if not existing then
    insert into hotels (slug, name) values (s, btrim(p->>'name'));
  end if;
  update hotels set
    name = btrim(p->>'name'),
    city = coalesce(p->>'city', city), state = coalesce(p->>'state', state),
    tagline = coalesce(p->>'tagline', tagline), description = coalesce(p->>'description', description),
    phone = coalesce(p->>'phone', phone),
    lat = case when p ? 'lat' then nullif(p->>'lat','')::double precision else lat end,
    lng = case when p ? 'lng' then nullif(p->>'lng','')::double precision else lng end,
    images = case when p ? 'images' then imgs else images end,
    image = case when p ? 'images' then imgs[1] else image end,
    amenities = case when p ? 'amenities' then (select coalesce(array_agg(v), '{}') from jsonb_array_elements_text(p->'amenities') v) else amenities end,
    active = coalesce((p->>'active')::boolean, active),
    sort_order = coalesce((p->>'sort_order')::int, sort_order)
  where slug = s returning * into h;
  return jsonb_build_object('hotel', to_jsonb(h));
end $$;

create or replace function admin_delete_hotel(p jsonb) returns jsonb
language plpgsql as $$
declare s text := p->>'slug';
begin
  if not exists (select 1 from hotels where slug = s) then return jsonb_build_object('error','not_found'); end if;
  if exists (select 1 from bookings where hotel_slug = s) then return jsonb_build_object('error','has_bookings'); end if;
  delete from room_types where hotel_slug = s;
  delete from hotels where slug = s;
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_list_room_types(p jsonb default '{}'::jsonb) returns jsonb
language sql stable as $$
  select jsonb_build_object('room_types', coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object(
      'has_bookings', exists (select 1 from bookings b where b.room_type_id = r.id)) order by r.base_rate, r.name), '[]'::jsonb))
  from room_types r where coalesce(p->>'hotel_slug','') = '' or r.hotel_slug = p->>'hotel_slug'
$$;

create or replace function admin_save_room_type(p jsonb) returns jsonb
language plpgsql as $$
declare
  rid bigint := nullif(p->>'id','')::bigint;
  imgs text[]; r room_types%rowtype;
begin
  if p ? 'images' then
    select coalesce(array_agg(v), '{}') into imgs from jsonb_array_elements_text(p->'images') v;
    if coalesce(array_length(imgs, 1), 0) > 8 then return jsonb_build_object('error','too_many_images'); end if;
  end if;
  if p ? 'description' and char_length(coalesce(p->>'description','')) > 600 then
    return jsonb_build_object('error','description_too_long');
  end if;
  if rid is null then
    if btrim(coalesce(p->>'name','')) = '' or not exists (select 1 from hotels where slug = p->>'hotel_slug') then
      return jsonb_build_object('error','invalid_input');
    end if;
    if exists (select 1 from room_types where hotel_slug = p->>'hotel_slug' and name = btrim(p->>'name')) then
      return jsonb_build_object('error','name_taken');
    end if;
    insert into room_types (hotel_slug, name) values (p->>'hotel_slug', btrim(p->>'name')) returning id into rid;
  elsif not exists (select 1 from room_types where id = rid) then
    return jsonb_build_object('error','not_found');
  end if;
  begin
    update room_types set
      name = coalesce(nullif(btrim(p->>'name'),''), name),
      total_rooms = coalesce((p->>'total_rooms')::int, total_rooms),
      base_rate = coalesce((p->>'base_rate')::int, base_rate),
      max_guests = coalesce((p->>'max_guests')::int, max_guests),
      beds = coalesce((p->>'beds')::int, beds),
      baths = coalesce((p->>'baths')::int, baths),
      active = coalesce((p->>'active')::boolean, active),
      images = case when p ? 'images' then imgs else images end,
      description = case when p ? 'description' then p->>'description' else description end
    where id = rid returning * into r;
  exception when unique_violation then return jsonb_build_object('error','name_taken');
  end;
  return jsonb_build_object('room_type', to_jsonb(r));
end $$;

create or replace function admin_delete_room_type(p jsonb) returns jsonb
language plpgsql as $$
declare rid bigint := (p->>'id')::bigint;
begin
  if not exists (select 1 from room_types where id = rid) then return jsonb_build_object('error','not_found'); end if;
  if exists (select 1 from bookings where room_type_id = rid) then return jsonb_build_object('error','has_bookings'); end if;
  delete from room_types where id = rid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_calendar(p jsonb) returns jsonb
language plpgsql stable as $$
declare rid bigint := (p->>'room_type_id')::bigint; m date := (coalesce(p->>'month', to_char(now(),'YYYY-MM')) || '-01')::date;
        total int; days jsonb;
begin
  select total_rooms into total from room_types where id = rid;
  if total is null then return jsonb_build_object('error','not_found'); end if;
  select jsonb_agg(jsonb_build_object('date', d::date, 'booked', bk, 'blocked', bl, 'free', greatest(total - bk - bl, 0)) order by d) into days
  from (
    select d,
      coalesce((select sum(b.rooms) from bookings b where b.room_type_id = rid and b.status = 'confirmed'
                and b.check_in <= d::date and b.check_out > d::date), 0)::int as bk,
      coalesce((select sum(k.rooms) from room_blocks k where k.room_type_id = rid
                and k.from_date <= d::date and k.to_date >= d::date), 0)::int as bl
    from generate_series(m::timestamp, (m + interval '1 month - 1 day')::timestamp, interval '1 day') d
  ) z;
  return jsonb_build_object('total_rooms', total, 'days', days);
end $$;

create or replace function admin_list_blocks(p jsonb) returns jsonb
language sql stable as $$
  select jsonb_build_object('blocks', coalesce(jsonb_agg(to_jsonb(k) order by k.from_date), '[]'::jsonb))
  from room_blocks k where k.room_type_id = (p->>'room_type_id')::bigint
$$;

create or replace function admin_add_block(p jsonb) returns jsonb
language plpgsql as $$
declare f date; t date; rms int; k room_blocks%rowtype;
begin
  begin f := (p->>'from')::date; t := (p->>'to')::date; rms := coalesce((p->>'rooms')::int, 1);
  exception when others then return jsonb_build_object('error','invalid_dates'); end;
  if f is null or t is null or t < f or rms < 1 then return jsonb_build_object('error','invalid_dates'); end if;
  if not exists (select 1 from room_types where id = (p->>'room_type_id')::bigint) then return jsonb_build_object('error','not_found'); end if;
  insert into room_blocks (room_type_id, from_date, to_date, rooms, reason)
  values ((p->>'room_type_id')::bigint, f, t, rms, coalesce(p->>'reason','')) returning * into k;
  return jsonb_build_object('block', to_jsonb(k));
end $$;

create or replace function admin_delete_block(p jsonb) returns jsonb
language plpgsql as $$
begin
  delete from room_blocks where id = (p->>'id')::bigint;
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_image_in_use(p jsonb) returns jsonb
language sql stable as $$
  select jsonb_build_object('in_use',
    exists (select 1 from hotels where (p->>'url') = any(images) or image = p->>'url')
    or exists (select 1 from room_types where (p->>'url') = any(images)))
$$;
