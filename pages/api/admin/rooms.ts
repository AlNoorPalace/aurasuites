import { route, parse, sendResult } from '../../../lib/api';
import { idSchema, roomSaveSchema } from '../../../lib/schemas';
import { rpc } from '../../../lib/supabase';
import { isAllowedPhotoUrl } from '../../../lib/images';
import { revalidateSite } from '../../../lib/revalidate';

export default route(['GET', 'POST', 'DELETE'], async (req, res) => {
  if (req.method === 'GET') {
    const hotel_slug = typeof req.query.hotel_slug === 'string' ? req.query.hotel_slug : '';
    return sendResult(res, await rpc('admin_list_room_types', { hotel_slug }));
  }
  if (req.method === 'DELETE') {
    const p = parse(idSchema, req.body, res);
    if (!p) return;
    const r = await rpc('admin_delete_room_type', p);
    if (!r.error) await revalidateSite(res);
    return sendResult(res, r);
  }
  const p = parse(roomSaveSchema, req.body, res);
  if (!p) return;
  if (p.images && !p.images.every((u) => isAllowedPhotoUrl(u))) {
    return res.status(400).json({ error: 'invalid_input', fields: { images: 'Photos must be uploaded here or bundled with the site' } });
  }
  const r = await rpc('admin_save_room_type', p);
  if (r.error) return sendResult(res, r);
  if (p.images && !('images' in r.room_type)) {
    return res.status(409).json({ error: 'migration_needed', message: 'The database is missing the photo columns. Run supabase/migrations/001_schema.sql and 003_admin_functions.sql, then try again.' });
  }
  await revalidateSite(res, [], [r.room_type.name]);
  sendResult(res, r);
}, { admin: true });
