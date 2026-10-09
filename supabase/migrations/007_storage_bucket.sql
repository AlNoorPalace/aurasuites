-- Creates the public "hotel-images" storage bucket used by the admin photo manager.
-- Safe to run twice. Skipped automatically where Supabase Storage does not exist (the local PGlite stand-in).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('hotel-images', 'hotel-images', true)
    on conflict (id) do update set public = true;
  end if;
end $$;
