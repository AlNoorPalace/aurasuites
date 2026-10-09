import { route, parse, sendResult } from '../../../lib/api';
import { adminAdvanceSchema, adminBookingsQuery, adminCancelSchema } from '../../../lib/schemas';
import { rpc } from '../../../lib/supabase';

export default route(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const p = parse(adminBookingsQuery, req.query, res);
    if (!p) return;
    return sendResult(res, await rpc('admin_list_bookings', p));
  }
  if (req.body && typeof req.body === 'object' && 'advance' in req.body) {
    const a = parse(adminAdvanceSchema, req.body, res);
    if (!a) return;
    return sendResult(res, await rpc('admin_record_advance', { reference: a.reference, amount: a.advance }));
  }
  const p = parse(adminCancelSchema, req.body, res);
  if (!p) return;
  sendResult(res, await rpc('cancel_booking', { reference: p.reference, admin: true }));
}, { admin: true });
