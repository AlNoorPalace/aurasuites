import { route, parse, sendResult } from '../../lib/api';
import { availabilitySchema } from '../../lib/schemas';
import { rpc } from '../../lib/supabase';

export default route(['GET'], async (req, res) => {
  const p = parse(availabilitySchema, req.query, res);
  if (!p) return;
  sendResult(res, await rpc('room_availability', p));
}, { limit: ['availability', 60, 60_000] });
