import { route, parse, sendResult } from '../../../lib/api';
import { adminBookingsQuery, adminCancelSchema } from '../../../lib/schemas';
import { rpc } from '../../../lib/supabase';

export default route(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const p = parse(adminBookingsQuery, req.query, res);
    if (!p) return;
    return sendResult(res, await rpc('admin_list_bookings', p));
  }
  const p = parse(adminCancelSchema, req.body, res);
  if (!p) return;
  sendResult(res, await rpc('cancel_booking', { reference: p.reference, admin: true }));
}, { admin: true });
