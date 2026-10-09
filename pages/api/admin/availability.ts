import { route, parse, sendResult } from '../../../lib/api';
import { blockSchema, calendarQuery, idSchema } from '../../../lib/schemas';
import { rpc } from '../../../lib/supabase';

export default route(['GET', 'POST', 'DELETE'], async (req, res) => {
  if (req.method === 'GET') {
    const p = parse(calendarQuery, req.query, res);
    if (!p) return;
    const [cal, blocks] = await Promise.all([rpc('admin_calendar', p), rpc('admin_list_blocks', p)]);
    if (cal.error) return sendResult(res, cal);
    return res.status(200).json({ ...cal, blocks: blocks.blocks });
  }
  if (req.method === 'DELETE') {
    const p = parse(idSchema, req.body, res);
    if (!p) return;
    return sendResult(res, await rpc('admin_delete_block', p));
  }
  const p = parse(blockSchema, req.body, res);
  if (!p) return;
  sendResult(res, await rpc('admin_add_block', p));
}, { admin: true });
