import { route, parse, sendResult } from '../../../lib/api';
import { hotelSaveSchema, slugSchema } from '../../../lib/schemas';
import { rpc } from '../../../lib/supabase';
import { isAllowedPhotoUrl } from '../../../lib/images';
import { revalidateSite } from '../../../lib/revalidate';

export default route(['GET', 'POST', 'DELETE'], async (req, res) => {
  if (req.method === 'GET') return sendResult(res, await rpc('admin_list_hotels'));
  if (req.method === 'DELETE') {
    const p = parse(slugSchema, req.body, res);
    if (!p) return;
    const r = await rpc('admin_delete_hotel', p);
    if (!r.error) await revalidateSite(res, [p.slug]);
    return sendResult(res, r);
  }
  const p = parse(hotelSaveSchema, req.body, res);
  if (!p) return;
  if (p.images && !p.images.every((u) => isAllowedPhotoUrl(u))) {
    return res.status(400).json({ error: 'invalid_input', fields: { images: 'Photos must be uploaded here or bundled with the site' } });
  }
  const r = await rpc('admin_save_hotel', p);
  if (r.error) return sendResult(res, r);
  if (p.images && !('images' in r.hotel)) {
    return res.status(409).json({ error: 'migration_needed', message: 'The database is missing the photo columns. Run supabase/migrations/001_schema.sql and 003_admin_functions.sql, then try again.' });
  }
  await revalidateSite(res, [p.slug]);
  sendResult(res, r);
}, { admin: true });
