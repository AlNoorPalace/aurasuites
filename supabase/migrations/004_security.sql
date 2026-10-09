-- Lock everything to the service role. RLS is on with no policies, so anon/authenticated see nothing.
do $$
declare f record;
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname in (
      '_rooms_free','public_hotels','room_availability','create_booking','get_booking','cancel_booking',
      'admin_list_bookings','admin_list_hotels','admin_save_hotel','admin_delete_hotel','admin_list_room_types',
      'admin_save_room_type','admin_delete_room_type','admin_calendar','admin_list_blocks','admin_add_block',
      'admin_delete_block','admin_image_in_use')
    loop
      execute format('revoke all on function %s from public', f.sig);
      if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f.sig); end if;
      if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f.sig); end if;
      execute format('grant execute on function %s to service_role', f.sig);
    end loop;
  end if;
end $$;
