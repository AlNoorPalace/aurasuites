import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUpiLink } from '../lib/upi';
import { groupRooms, slugify, type Hotel } from '../lib/rooms';
import { isAllowedPhotoUrl, sniffImage } from '../lib/images';
import { createBookingSchema, hotelSaveSchema, roomSaveSchema, fieldErrors } from '../lib/schemas';

test('UPI link', () => {
  const l = buildUpiLink({ id: 'pay@okbiz', name: 'Aura Suites', amount: 6000, reference: 'AUR-1A2B3C' })!;
  assert.equal(l, 'upi://pay?pa=pay%40okbiz&pn=Aura%20Suites&am=6000.00&cu=INR&tn=Booking%20AUR-1A2B3C');
  assert.equal(buildUpiLink({ id: 'bad id', name: 'x', amount: 10, reference: 'a' }), null);
  assert.equal(buildUpiLink({ id: '', name: 'x', amount: 10, reference: 'a' }), null);
  for (const amount of [0, -5, 1_000_001, NaN]) assert.equal(buildUpiLink({ id: 'a@bank', name: 'x', amount, reference: 'a' }), null);
  assert.ok(buildUpiLink({ id: 'a@bank', name: 'x', amount: 1_000_000, reference: 'a' }));
});

test('UPI link resists parameter injection', () => {
  const l = buildUpiLink({ id: 'a@bank', name: 'N&am=1', amount: 100.5, reference: 'AUR-1&am=1&pa=evil@x' })!;
  const q = new URL(l.replace('upi://', 'http://')).searchParams;
  assert.equal(q.getAll('am').length, 1);
  assert.equal(q.get('am'), '100.50');
  assert.equal(q.getAll('pa').length, 1);
  assert.equal(q.get('pa'), 'a@bank');
  assert.equal(q.get('tn'), 'Booking AUR-1am1paevilx');
});

const hotel = (slug: string, rooms: any[]): Hotel => ({ slug, name: slug, city: slug, state: '', tagline: '', description: '', phone: '', lat: null, lng: null, image: null, images: [], amenities: [], sort_order: 0, rooms });
const room = (id: number, name: string, base_rate: number, extra = {}) => ({ id, name, base_rate, max_guests: 2, beds: 1, baths: 1, images: [], description: '', ...extra });

test('room aggregation: one card per name, cheapest first, offers sorted', () => {
  const g = groupRooms([
    hotel('a', [room(1, 'Deluxe Room', 3000, { images: ['/img/1.jpg'] }), room(2, 'Suite', 6000)]),
    hotel('b', [room(3, 'deluxe  room', 2500, { description: 'Nice', images: ['/img/1.jpg', '/img/2.jpg'] }), room(4, 'Studio', 1500)]),
  ]);
  assert.deepEqual(g.map((x) => x.slug), ['studio', 'deluxe-room', 'suite']);
  const d = g.find((x) => x.slug === 'deluxe-room')!;
  assert.equal(d.minRate, 2500);
  assert.deepEqual(d.offers.map((o) => o.hotel_slug), ['b', 'a']);
  assert.deepEqual(d.images, ['/img/1.jpg', '/img/2.jpg']);
  assert.equal(d.description, 'Nice');
  assert.equal(slugify(' A & B! '), 'a-b');
});

test('photo URL allow-list and type sniffing', () => {
  const s = 'https://abc.supabase.co';
  assert.ok(isAllowedPhotoUrl('/img/room.jpg', s));
  assert.ok(isAllowedPhotoUrl(`${s}/storage/v1/object/public/hotel-images/a1b2.webp`, s));
  for (const bad of ['https://evil.com/a.jpg', '/img/../etc/passwd', `${s}/storage/v1/object/public/other/a.jpg`,
    'https://abc.supabase.co.evil.com/storage/v1/object/public/hotel-images/a.jpg', 'javascript:alert(1)', `${s}/storage/v1/object/public/hotel-images/../x`])
    assert.equal(isAllowedPhotoUrl(bad, s), false, bad);
  assert.equal(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(20).fill(0)]))?.ext, 'jpg');
  assert.equal(sniffImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 ' + 'x'.repeat(10)))?.ext, 'webp');
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
});

test('schemas return field-level messages', () => {
  const r = createBookingSchema.safeParse({ hotel_slug: 'aluva', room_type_id: 1, check_in: '2030-01-01', check_out: 'x', rooms: 9, adults: 2, guest_name: 'A', guest_phone: '12' });
  assert.ok(!r.success);
  const e = fieldErrors(r.error);
  assert.ok(e.check_out && e.rooms && e.guest_name && e.guest_phone);
  const ok = createBookingSchema.parse({ hotel_slug: 'aluva', room_type_id: '1', check_in: '2030-01-01', check_out: '2030-01-02', rooms: '1', adults: 2, guest_name: 'Asha', guest_phone: '+91 99955-88780', guest_email: '' });
  assert.equal(ok.guest_phone, '919995588780');
  assert.ok(!hotelSaveSchema.safeParse({ slug: 'Bad Slug', name: 'x' }).success);
  assert.ok(!hotelSaveSchema.safeParse({ slug: 'ok', name: 'Okay', phone: '12345' }).success);
  assert.ok(hotelSaveSchema.safeParse({ slug: 'ok', name: 'Okay', phone: '99955 88780', lat: '', lng: null }).success);
  assert.ok(!roomSaveSchema.safeParse({ description: 'x'.repeat(601) }).success);
  assert.ok(!roomSaveSchema.safeParse({ images: new Array(9).fill('/img/a.jpg') }).success);
});

test('setup hints for common Supabase mistakes', async () => {
  const { setupHint } = await import('../lib/supabase');
  assert.match(setupHint('PGRST202', 'Could not find the function public.admin_list_hotels')!, /migrations/);
  assert.match(setupHint(undefined, 'Invalid API key')!, /SERVICE_ROLE_KEY/);
  assert.equal(setupHint(undefined, 'something else'), undefined);
});

test('advance bounds: min ₹500 (or the balance if smaller), max the balance', async () => {
  const { advanceBounds, validAdvance } = await import('../lib/upi');
  assert.deepEqual(advanceBounds(6000), { min: 500, max: 6000 });
  assert.deepEqual(advanceBounds(300), { min: 300, max: 300 });
  assert.deepEqual(advanceBounds(0), { min: 0, max: 0 });
  assert.ok(validAdvance(500, 6000) && validAdvance(6000, 6000) && validAdvance(300, 300));
  for (const [a, t] of [[499, 6000], [6001, 6000], [500.5, 6000], [NaN, 6000], [500, 0], [-5, 6000]] as const) assert.equal(validAdvance(a, t), false, `${a}/${t}`);
});
