import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { migrationSql } from '../lib/migrations';
import { newDb, setup, day } from './helpers';

const bk = (id: number) => ({ hotel_slug: 'aluva', room_type_id: id, check_in: day(5), check_out: day(6), guest_name: 'A', guest_phone: '9995588780', adults: 1, rooms: 1 });

test('hotel CRUD, slug rules, hide/show, and "has bookings" delete rule', async () => {
  const { rpc } = await newDb();
  assert.equal((await rpc('admin_save_hotel', { slug: 'Bad Slug', name: 'x' })).error, 'invalid_slug');
  await rpc('admin_save_hotel', { slug: 'aluva', name: 'Aluva', create: true, amenities: ['WiFi'], phone: '9995588780' });
  assert.equal((await rpc('admin_save_hotel', { slug: 'aluva', name: 'Dup', create: true })).error, 'slug_taken');
  const id = (await rpc('admin_save_room_type', { hotel_slug: 'aluva', name: 'Deluxe', total_rooms: 2, base_rate: 3000 })).room_type.id;
  await rpc('admin_save_hotel', { slug: 'aluva', name: 'Aluva', active: false });
  assert.equal((await rpc('public_hotels')).hotels.length, 0);
  assert.equal((await rpc('create_booking', bk(id))).error, 'not_found');
  await rpc('admin_save_hotel', { slug: 'aluva', name: 'Aluva', active: true });
  assert.equal((await rpc('public_hotels')).hotels[0].rooms.length, 1);
  const { booking } = await rpc('create_booking', bk(id));
  await rpc('cancel_booking', { reference: booking.reference, admin: true });
  assert.equal((await rpc('admin_delete_hotel', { slug: 'aluva' })).error, 'has_bookings'); // even cancelled
  assert.equal((await rpc('admin_delete_room_type', { id })).error, 'has_bookings');
  await rpc('admin_save_hotel', { slug: 'empty', name: 'Empty', create: true });
  assert.ok((await rpc('admin_delete_hotel', { slug: 'empty' })).ok);
});

test('rooms: unique names, inline edit, bookable toggle', async () => {
  const { rpc } = await newDb();
  const id = await setup(rpc);
  assert.equal((await rpc('admin_save_room_type', { hotel_slug: 'aluva', name: 'Deluxe' })).error, 'name_taken');
  const r = await rpc('admin_save_room_type', { id, total_rooms: 9, base_rate: 3500, active: false });
  assert.equal(r.room_type.total_rooms, 9);
  assert.equal(r.room_type.name, 'Deluxe');
  assert.equal((await rpc('public_hotels')).hotels.length, 1);
  assert.equal((await rpc('public_hotels')).hotels[0].rooms.length, 0);
});

test('photos and descriptions: limits, order, and keep-when-absent', async () => {
  const { rpc } = await newDb();
  const id = await setup(rpc);
  const urls = (n: number) => Array.from({ length: n }, (_, i) => `/img/${i}.jpg`);
  assert.equal((await rpc('admin_save_hotel', { slug: 'aluva', name: 'A', images: urls(13) })).error, 'too_many_images');
  const h = await rpc('admin_save_hotel', { slug: 'aluva', name: 'A', images: urls(12) });
  assert.equal(h.hotel.image, '/img/0.jpg');
  const h2 = await rpc('admin_save_hotel', { slug: 'aluva', name: 'A renamed' }); // no images key
  assert.equal(h2.hotel.images.length, 12);
  assert.equal((await rpc('admin_save_room_type', { id, images: urls(9) })).error, 'too_many_images');
  await rpc('admin_save_room_type', { id, images: urls(2), description: 'Lovely' });
  const r = await rpc('admin_save_room_type', { id, base_rate: 3100 });
  assert.deepEqual(r.room_type.images, ['/img/0.jpg', '/img/1.jpg']);
  assert.equal(r.room_type.description, 'Lovely');
  assert.equal((await rpc('admin_save_room_type', { id, description: 'x'.repeat(601) })).error, 'description_too_long');
  assert.equal((await rpc('admin_save_room_type', { id, description: 'x'.repeat(600) })).room_type.description.length, 600);
  assert.equal((await rpc('admin_image_in_use', { url: '/img/1.jpg' })).in_use, true);
  assert.equal((await rpc('admin_image_in_use', { url: '/img/99.jpg' })).in_use, false);
  const reordered = await rpc('admin_save_hotel', { slug: 'aluva', name: 'A', images: ['/img/5.jpg', '/img/0.jpg'] });
  assert.equal(reordered.hotel.image, '/img/5.jpg');
});

test('calendar, blocks, and admin booking list filters', async () => {
  const { rpc } = await newDb();
  const id = await setup(rpc, 2);
  await rpc('create_booking', bk(id));
  await rpc('admin_add_block', { room_type_id: id, from: day(5), to: day(7), rooms: 1, reason: 'AC' });
  assert.equal((await rpc('admin_add_block', { room_type_id: id, from: day(7), to: day(5) })).error, 'invalid_dates');
  const month = day(5).slice(0, 7);
  const cal = await rpc('admin_calendar', { room_type_id: id, month });
  const d = cal.days.find((x: any) => x.date === day(5));
  assert.deepEqual([d.booked, d.blocked, d.free], [1, 1, 0]);
  const blocks = (await rpc('admin_list_blocks', { room_type_id: id })).blocks;
  assert.equal(blocks.length, 1);
  await rpc('admin_delete_block', { id: blocks[0].id });
  assert.equal((await rpc('admin_list_blocks', { room_type_id: id })).blocks.length, 0);
  const l = await rpc('admin_list_bookings', { q: '99955', status: 'confirmed', hotel: 'aluva' });
  assert.equal(l.summary.count, 1);
  assert.equal(l.summary.revenue, 3000);
  assert.equal((await rpc('admin_list_bookings', { q: 'zzz' })).summary.count, 0);
});

test('with roles present, only service_role may execute functions', async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;`);
  for (const m of migrationSql()) if (!m.file.includes('seed')) await db.exec(m.sql);
  const q = (role: string) => db.query(`select has_function_privilege('${role}', 'create_booking(jsonb)', 'execute') as ok`);
  assert.equal((await q('service_role')).rows[0].ok, true);
  assert.equal((await q('anon')).rows[0].ok, false);
  assert.equal((await q('authenticated')).rows[0].ok, false);
});

test('seed migration runs twice without duplicating', async () => {
  const { rpc } = await newDb(true);
  const h = (await rpc('public_hotels')).hotels;
  assert.equal(h.length, 3);
  assert.equal(h[0].rooms.length, 1);
});
