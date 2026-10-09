import { route, parse, sendResult } from '../../../lib/api';
import { lookupSchema } from '../../../lib/schemas';
import { rpc } from '../../../lib/supabase';

export default route(['POST'], async (req, res) => {
  const p = parse(lookupSchema, req.body, res);
  if (!p) return;
  sendResult(res, await rpc('get_booking', { reference: p.reference, phone: p.phone }));
}, { limit: ['lookup', 15, 10 * 60_000] });
