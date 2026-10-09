-- Public booking functions. Each takes one jsonb argument and returns jsonb.

-- Rooms free on every night of [ci, co) for a room type.
create or replace function _rooms_free(rt bigint, ci date, co date) returns integer
language sql stable as $$
  select coalesce(
    (select r.total_rooms from room_types r where r.id = rt)
    - max(
      coalesce((select sum(b.rooms) from bookings b
                where b.room_type_id = rt and b.status = 'confirmed'
                  and b.check_in <= d::date and b.check_out > d::date), 0)
      + coalesce((select sum(k.rooms) from room_blocks k
                  where k.room_type_id = rt and k.from_date <= d::date and k.to_date >= d::date), 0)
    ), 0)
  from generate_series(ci::timestamp, (co - 1)::timestamp, interval '1 day') d
$$;

create or replace function public_hotels(p jsonb default '{}'::jsonb) returns jsonb
language sql stable as $$
  select jsonb_build_object('hotels', coalesce(jsonb_agg(h order by (h->>'sort_order')::int, h->>'name'), '[]'::jsonb))
  from (
    select jsonb_build_object(
      'slug', t.slug, 'name', t.name, 'city', t.city, 'state', t.state, 'tagline', t.tagline,
      'description', t.description, 'phone', t.phone, 'lat', t.lat, 'lng', t.lng,
      'image', t.image, 'images', t.images, 'amenities', t.amenities, 'sort_order', t.sort_order,
      'rooms', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id, 'name', r.name, 'total_rooms', r.total_rooms, 'base_rate', r.base_rate,
          'max_guests', r.max_guests, 'beds', r.beds, 'baths', r.baths,
          'images', r.images, 'description', r.description) order by r.base_rate, r.name)
        from room_types r where r.hotel_slug = t.slug and r.active), '[]'::jsonb)
    ) as h
    from hotels t where t.active
  ) x
$$;

create or replace function room_availability(p jsonb) returns jsonb
language plpgsql stable as $$
declare
  ci date; co date; n int; rms int; guests int; out jsonb;
begin
  begin
    ci := (p->>'check_in')::date; co := (p->>'check_out')::date;
  exception when others then return jsonb_build_object('error','invalid_dates'); end;
  if ci is null or co is null or co <= ci or co - ci > 365 or ci < (now() at time zone 'Asia/Kolkata')::date then
    return jsonb_build_object('error','invalid_dates');
  end if;
  n := co - ci;
  rms := coalesce((p->>'rooms')::int, 1);
  guests := coalesce((p->>'adults')::int, 1) + coalesce((p->>'children')::int, 0);
  if rms < 1 or rms > 6 then return jsonb_build_object('error','invalid_rooms'); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'name', r.name, 'base_rate', r.base_rate, 'max_guests', r.max_guests,
      'beds', r.beds, 'baths', r.baths, 'images', r.images, 'description', r.description,
      'available', _rooms_free(r.id, ci, co),
      'fits', guests <= r.max_guests * rms,
      'nights', n, 'subtotal', r.base_rate * n * rms
    ) order by r.base_rate, r.name), '[]'::jsonb) into out
  from room_types r join hotels h on h.slug = r.hotel_slug
  where r.hotel_slug = p->>'hotel_slug' and r.active and h.active;
  return jsonb_build_object('rooms', out);
end $$;

create or replace function create_booking(p jsonb) returns jsonb
language plpgsql as $$
declare
  rt room_types%rowtype;
  ci date; co date; n int; rms int; ad int; ch int;
  sub int; disc int; ref text; tries int := 0; phone text; nm text;
begin
  begin
    ci := (p->>'check_in')::date; co := (p->>'check_out')::date;
    rms := (p->>'rooms')::int; ad := (p->>'adults')::int; ch := coalesce((p->>'children')::int, 0);
  exception when others then return jsonb_build_object('error','invalid_input'); end;
  if ci is null or co is null or rms is null or ad is null then return jsonb_build_object('error','invalid_input'); end if;
  n := co - ci;
  if n < 1 or n > 365 or ci < (now() at time zone 'Asia/Kolkata')::date then return jsonb_build_object('error','invalid_dates'); end if;
  if rms < 1 or rms > 6 then return jsonb_build_object('error','invalid_rooms'); end if;
  if ad < 1 or ch < 0 then return jsonb_build_object('error','invalid_guests'); end if;
  nm := btrim(coalesce(p->>'guest_name',''));
  phone := regexp_replace(coalesce(p->>'guest_phone',''), '\D', '', 'g');
  if nm = '' or length(phone) < 10 then return jsonb_build_object('error','invalid_input'); end if;

  select * into rt from room_types where id = (p->>'room_type_id')::bigint for update;
  if not found or not rt.active
     or not exists (select 1 from hotels h where h.slug = rt.hotel_slug and h.active)
     or rt.hotel_slug <> p->>'hotel_slug' then
    return jsonb_build_object('error','not_found');
  end if;
  if ad + ch > rt.max_guests * rms then return jsonb_build_object('error','too_many_guests'); end if;
  if _rooms_free(rt.id, ci, co) < rms then return jsonb_build_object('error','sold_out'); end if;

  sub := rt.base_rate * n * rms;
  disc := case when coalesce((p->>'corporate')::boolean, false) then round(sub * 0.20)::int else 0 end;

  loop
    ref := 'AUR-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from bookings where reference = ref);
    tries := tries + 1;
    if tries > 20 then return jsonb_build_object('error','server_error'); end if;
  end loop;

  insert into bookings (reference, hotel_slug, room_type_id, check_in, check_out, nights, rooms, adults, children,
                        guest_name, guest_phone, guest_email, subtotal, discount, total)
  values (ref, rt.hotel_slug, rt.id, ci, co, n, rms, ad, ch, nm, phone,
          nullif(btrim(coalesce(p->>'guest_email','')), ''), sub, disc, sub - disc);
  return get_booking(jsonb_build_object('reference', ref, 'admin', true));
end $$;

create or replace function get_booking(p jsonb) returns jsonb
language plpgsql stable as $$
declare b jsonb;
begin
  select to_jsonb(x) into b from (
    select k.reference, k.hotel_slug, h.name as hotel_name, k.room_type_id, r.name as room_name,
           k.check_in, k.check_out, k.nights, k.rooms, k.adults, k.children, k.guest_name,
           k.guest_phone, k.guest_email, k.subtotal, k.discount, k.total, k.status,
           k.payment_method, k.created_at, k.cancelled_at, k.cancelled_by
    from bookings k join hotels h on h.slug = k.hotel_slug join room_types r on r.id = k.room_type_id
    where k.reference = upper(btrim(coalesce(p->>'reference','')))
      and (coalesce((p->>'admin')::boolean, false)
           or right(k.guest_phone, 10) = right(regexp_replace(coalesce(p->>'phone',''), '\D', '', 'g'), 10))
  ) x;
  if b is null then return jsonb_build_object('error','not_found'); end if;
  return jsonb_build_object('booking', b);
end $$;

create or replace function cancel_booking(p jsonb) returns jsonb
language plpgsql as $$
declare k bookings%rowtype; adm boolean := coalesce((p->>'admin')::boolean, false);
begin
  select * into k from bookings where reference = upper(btrim(coalesce(p->>'reference',''))) for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if not adm and right(k.guest_phone, 10) <> right(regexp_replace(coalesce(p->>'phone',''), '\D', '', 'g'), 10) then
    return jsonb_build_object('error','not_found');
  end if;
  if k.status = 'cancelled' then return jsonb_build_object('error','already_cancelled'); end if;
  if not adm and k.check_in <= (now() at time zone 'Asia/Kolkata')::date then
    return jsonb_build_object('error','too_late');
  end if;
  update bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = case when adm then 'admin' else 'guest' end
   where reference = k.reference;
  return get_booking(jsonb_build_object('reference', k.reference, 'admin', true));
end $$;
