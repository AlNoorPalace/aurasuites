import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startDevDb } from '../scripts/dev-db';
import { day } from './helpers';

let dev: Awaited<ReturnType<typeof startDevDb>>;
before(async () => {
  dev = await startDevDb(54399, false);
  process.env.SUPABASE_URL = dev.url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dev';
});
after(async () => { dev.server.close(); await dev.db.close(); });

test('storage upload, public read and delete through supabase-js', async () => {
  const { supabase } = await import('../lib/supabase');
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0]);
  const up = await supabase().storage.from('hotel-images').upload('abc.png', png, { contentType: 'image/png' });
  assert.equal(up.error, null);
  const got = await fetch(`${dev.url}/storage/v1/object/public/hotel-images/abc.png`);
  assert.equal(got.status, 200);
  assert.equal(got.headers.get('content-type'), 'image/png');
  const rm = await supabase().storage.from('hotel-images').remove(['abc.png']);
  assert.equal(rm.error, null);
  assert.equal((await fetch(`${dev.url}/storage/v1/object/public/hotel-images/abc.png`)).status, 404);
});

test('rpc wrapper round-trips jsonb', async () => {
  const { rpc } = await import('../lib/supabase');
  const saved = await rpc('admin_save_hotel', { slug: 'aluva', name: 'Aluva', create: true });
  assert.equal(saved.hotel.slug, 'aluva');
  const r = await rpc('admin_save_room_type', { hotel_slug: 'aluva', name: 'Deluxe', total_rooms: 1, base_rate: 2000 });
  const b = await rpc('create_booking', { hotel_slug: 'aluva', room_type_id: r.room_type.id, check_in: day(3), check_out: day(4), guest_name: 'A', guest_phone: '9995588780', adults: 1, rooms: 1 });
  assert.equal(b.booking.total, 2000);
});

test('admin session token: signed, expiring, tamper-proof', async () => {
  process.env.ADMIN_SESSION_SECRET = 'x'.repeat(40);
  process.env.ADMIN_PASSWORD = 'secret-pw';
  const a = await import('../lib/auth');
  const t = a.makeToken();
  assert.ok(a.verifyToken(t));
  assert.ok(!a.verifyToken(t, Date.now() + 13 * 3600e3));
  assert.ok(!a.verifyToken(t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))));
  assert.ok(!a.verifyToken(`${Date.now() + 1e9}.${t.split('.')[1]}`));
  assert.ok(!a.verifyToken(undefined));
  assert.ok(a.checkPassword('secret-pw') && !a.checkPassword('secret-px') && !a.checkPassword(''));
  assert.match(a.sessionCookie(t), /HttpOnly; SameSite=Strict/);
  assert.ok(a.originOk({ headers: { origin: 'https://a.com', host: 'a.com' } } as any));
  assert.ok(!a.originOk({ headers: { origin: 'https://evil.com', host: 'a.com' } } as any));
  assert.ok(!a.originOk({ headers: { host: 'a.com' } } as any));
  process.env.ADMIN_SESSION_SECRET = 'short';
  assert.ok(!a.verifyToken(t));
});
