import { route, sendResult } from '../../lib/api';
import { rpc } from '../../lib/supabase';

export default route(['GET'], async (_req, res) => {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  sendResult(res, await rpc('public_hotels'));
}, { limit: ['hotels', 60, 60_000] });
