-- Advance payments: the admin records what a guest has paid in advance (UPI payments are not verified by the site).
alter table bookings add column if not exists advance_paid integer not null default 0 check (advance_paid >= 0);

create or replace function get_booking(p jsonb) returns jsonb
language plpgsql stable as $$
declare b jsonb;
begin
  select to_jsonb(x) into b from (
    select k.reference, k.hotel_slug, h.name as hotel_name, k.room_type_id, r.name as room_name,
           k.check_in, k.check_out, k.nights, k.rooms, k.adults, k.children, k.guest_name,
           k.guest_phone, k.guest_email, k.subtotal, k.discount, k.total, k.advance_paid, k.status,
           k.payment_method, k.created_at, k.cancelled_at, k.cancelled_by
    from bookings k join hotels h on h.slug = k.hotel_slug join room_types r on r.id = k.room_type_id
    where k.reference = upper(btrim(coalesce(p->>'reference','')))
      and (coalesce((p->>'admin')::boolean, false)
           or right(k.guest_phone, 10) = right(regexp_replace(coalesce(p->>'phone',''), '\D', '', 'g'), 10))
  ) x;
  if b is null then return jsonb_build_object('error','not_found'); end if;
  return jsonb_build_object('booking', b);
end $$;

create or replace function admin_list_bookings(p jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable as $$
declare q text := lower(btrim(coalesce(p->>'q',''))); qd text := regexp_replace(coalesce(p->>'q',''), '\D', '', 'g'); res jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into res from (
    select k.reference, k.hotel_slug, h.name as hotel_name, r.name as room_name, k.check_in, k.check_out,
           k.nights, k.rooms, k.adults, k.children, k.guest_name, k.guest_phone, k.guest_email,
           k.subtotal, k.discount, k.total, k.advance_paid, k.status, k.payment_method, k.created_at, k.cancelled_by
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
    'revenue', coalesce((select sum((e->>'total')::int) from jsonb_array_elements(res) e where e->>'status' = 'confirmed'), 0),
    'advance', coalesce((select sum((e->>'advance_paid')::int) from jsonb_array_elements(res) e where e->>'status' = 'confirmed'), 0)));
end $$;

-- Sets the total advance received for a booking (0 clears it). Cannot exceed the booking total.
create or replace function admin_record_advance(p jsonb) returns jsonb
language plpgsql as $$
declare k bookings%rowtype; amt int;
begin
  begin amt := (p->>'amount')::int; exception when others then return jsonb_build_object('error','invalid_amount'); end;
  select * into k from bookings where reference = upper(btrim(coalesce(p->>'reference',''))) for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if amt is null or amt < 0 or amt > k.total then return jsonb_build_object('error','invalid_amount'); end if;
  update bookings set advance_paid = amt where reference = k.reference;
  return get_booking(jsonb_build_object('reference', k.reference, 'admin', true));
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on function admin_record_advance(jsonb) from public;
    revoke all on function get_booking(jsonb) from public;
    revoke all on function admin_list_bookings(jsonb) from public;
    if exists (select 1 from pg_roles where rolname = 'anon') then
      revoke all on function admin_record_advance(jsonb), get_booking(jsonb), admin_list_bookings(jsonb) from anon;
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      revoke all on function admin_record_advance(jsonb), get_booking(jsonb), admin_list_bookings(jsonb) from authenticated;
    end if;
    grant execute on function admin_record_advance(jsonb), get_booking(jsonb), admin_list_bookings(jsonb) to service_role;
  end if;
end $$;
