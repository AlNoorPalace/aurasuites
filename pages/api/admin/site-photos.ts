import { route, parse, sendResult } from '../../../lib/api';
import { sitePhotosSchema } from '../../../lib/schemas';
import { rpc } from '../../../lib/supabase';
import { isAllowedPhotoUrl } from '../../../lib/images';
import { revalidateSite } from '../../../lib/revalidate';
import { PHOTOS } from '../../../data/photos';

const allowed = (u: string) => isAllowedPhotoUrl(u) || /^https:\/\/images\.unsplash\.com\/[\w\-./?=&%]+$/.test(u);

export default route(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const s = await rpc<{ hero?: unknown[]; gallery?: unknown[] }>('site_photos');
    return res.status(200).json({ hero: s.hero?.length ? s.hero : PHOTOS.hero, gallery: s.gallery?.length ? s.gallery : PHOTOS.gallery });
  }
  const p = parse(sitePhotosSchema, req.body, res);
  if (!p) return;
  if (![...p.hero, ...p.gallery].every((x) => allowed(x.src))) {
    return res.status(400).json({ error: 'invalid_input', fields: { images: 'Photos must be uploaded here or bundled with the site' } });
  }
  const r = await rpc('admin_save_site_photos', p);
  if (!(r as any).error) await revalidateSite(res);
  sendResult(res, r);
}, { admin: true });
