-- Starting data. Set real room counts and rates in /admin afterwards.
insert into hotels (slug, name, city, state, tagline, description, phone, sort_order) values
 ('aluva','Aura Suites Aluva','Aluva','Kerala','Make Aluva your base for your next visit to Kochi.','',  '9995588780', 1),
 ('cheranallur','Aura Suites Cheranallur','Cheranallur','Kerala','A place to pause, with Cheranallur as your starting point.','', '9995588780', 2),
 ('kalamassery','Aura Suites Kalamassery','Kalamassery','Kerala','Stay in Kalamassery and keep your visit centred around you.','', '9995588780', 3)
on conflict (slug) do nothing;
insert into room_types (hotel_slug, name, total_rooms, base_rate, max_guests, beds, baths)
select h.slug, 'Deluxe Room', 5, 3000, 2, 1, 1 from hotels h
on conflict (hotel_slug, name) do nothing;
