import { route, parse, sendResult } from '../../../lib/api';
import { createBookingSchema } from '../../../lib/schemas';
import { rpc } from '../../../lib/supabase';

export default route(['POST'], async (req, res) => {
  const p = parse(createBookingSchema, req.body, res);
  if (!p) return;
  // Only validated fields are forwarded; the database computes every price.
  sendResult(res, await rpc('create_booking', {
    hotel_slug: p.hotel_slug, room_type_id: p.room_type_id, check_in: p.check_in, check_out: p.check_out,
    rooms: p.rooms, adults: p.adults, children: p.children, guest_name: p.guest_name,
    guest_phone: p.guest_phone, guest_email: p.guest_email || '', corporate: p.corporate,
  }));
}, { limit: ['book', 10, 10 * 60_000] });
