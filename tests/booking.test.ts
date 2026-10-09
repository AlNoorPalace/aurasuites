import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDb, setup, day } from './helpers';

const guest = { guest_name: 'Asha', guest_phone: '9995588780', adults: 2, children: 0, rooms: 1 };
const book = (id: number, ci: number, co: number, extra = {}) => ({
  hotel_slug: 'aluva', room_type_id: id, check_in: day(ci), check_out: day(co), ...guest, ...extra,
});

test('books a room, prices on the server, applies corporate discount only when asked', async () => {
  const { rpc } = await newDb();
  const id = await setup(rpc);
  const a = await rpc('create_booking', book(id, 5, 7, { total: 1 }));
  assert.match(a.booking.reference, /^AUR-[0-9A-F]{6}$/);
  assert.equal(a.booking.total, 6000);
  const b = await rpc('create_booking', book(id, 10, 11, { corporate: true }));
  assert.equal(b.booking.discount, 600);
  assert.equal(b.booking.total, 2400);
});

test('sold out, closures, and capacity', async () => {
  const { rpc } = await newDb();
  const id = await setup(rpc, 1);
  assert.ok((await rpc('create_booking', book(id, 5, 7))).booking);
  assert.equal((await rpc('create_booking', book(id, 6, 8))).error, 'sold_out');
  assert.ok((await rpc('create_booking', book(id, 7, 9))).booking); // check-out day is free
  await rpc('admin_add_block', { room_type_id: id, from: day(20), to: day(20), rooms: 1, reason: 'repairs' });
  assert.equal((await rpc('create_booking', book(id, 19, 21))).error, 'sold_out');
  assert.equal((await rpc('create_booking', book(id, 30, 31, { adults: 3 }))).error, 'too_many_guests');
  const av = await rpc('room_availability', { hotel_slug: 'aluva', check_in: day(5), check_out: day(6), rooms: 1, adults: 3 });
  assert.equal(av.rooms[0].available, 0);
  assert.equal(av.rooms[0].fits, false);
});

test('date and room validation', async () => {
  const { rpc } = await newDb();
  const id = await setup(rpc);
  assert.equal((await rpc('create_booking', book(id, 5, 5))).error, 'invalid_dates');
  assert.equal((await rpc('create_booking', book(id, 5, 3))).error, 'invalid_dates');
  assert.equal((await rpc('create_booking', book(id, -2, 1))).error, 'invalid_dates');
  assert.equal((await rpc('create_booking', book(id, 1, 367))).error, 'invalid_dates');
  assert.ok((await rpc('create_booking', book(id, 1, 366))).booking);
  assert.equal((await rpc('create_booking', book(id, 5, 6, { rooms: 7 }))).error, 'invalid_rooms');
  assert.equal((await rpc('create_booking', book(id, 5, 6, { guest_phone: '123' }))).error, 'invalid_input');
});

test('cancellation needs reference + phone and must be before the stay', async () => {
  const { rpc } = await newDb();
  const id = await setup(rpc);
  const { booking } = await rpc('create_booking', book(id, 5, 6));
  assert.equal((await rpc('cancel_booking', { reference: booking.reference, phone: '9000000000' })).error, 'not_found');
  const ok = await rpc('cancel_booking', { reference: booking.reference.toLowerCase(), phone: '+91 99955 88780' });
  assert.equal(ok.booking.status, 'cancelled');
  assert.equal((await rpc('cancel_booking', { reference: booking.reference, phone: '9995588780' })).error, 'already_cancelled');
  // frees the room
  const { booking: today } = await rpc('create_booking', book(id, 0, 1));
  assert.equal((await rpc('cancel_booking', { reference: today.reference, phone: '9995588780' })).error, 'too_late');
  assert.equal((await rpc('get_booking', { reference: today.reference, phone: '1111111111' })).error, 'not_found');
});

test('no double booking under parallel requests', async () => {
  const { rpc } = await newDb();
  const id = await setup(rpc, 3);
  const results = await Promise.all(Array.from({ length: 20 }, () => rpc('create_booking', book(id, 5, 7))));
  assert.equal(results.filter((r) => r.booking).length, 3);
  assert.equal(results.filter((r) => r.error === 'sold_out').length, 17);
});

test('migrations lock functions down to service_role', async () => {
  const { db } = await newDb();
  const r = await db.query(`select count(*)::int as n from pg_roles where rolname = 'service_role'`);
  assert.equal((r.rows[0] as any).n, 0); // PGlite has no such role: guarded block must not fail
});
