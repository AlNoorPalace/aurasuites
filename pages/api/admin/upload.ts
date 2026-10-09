import { randomBytes } from 'node:crypto';
import { route, parse, sendResult } from '../../../lib/api';
import { deleteUploadSchema, uploadSchema } from '../../../lib/schemas';
import { rpc, supabase } from '../../../lib/supabase';
import { BUCKET, MAX_UPLOAD_BYTES, bucketPrefix, sniffImage } from '../../../lib/images';

function uploadHint(msg: string): string {
  if (/bucket not found/i.test(msg)) return `The "${BUCKET}" storage bucket does not exist. Run supabase/migrations/007_storage_bucket.sql in the Supabase SQL editor (or create a public bucket named ${BUCKET}), then try again.`;
  if (/row-level security|unauthorized|invalid (jwt|api key)|signature/i.test(msg)) return 'Supabase rejected the upload. Check that SUPABASE_SERVICE_ROLE_KEY is the service_role key.';
  if (/fetch failed|ENOTFOUND|ECONNREFUSED/i.test(msg)) return 'The server could not reach Supabase Storage. Check SUPABASE_URL.';
  return `Upload failed. Check that the "${BUCKET}" storage bucket exists and is public, and that the service-role key is correct.`;
}

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } };

export default route(['POST', 'DELETE'], async (req, res) => {
  if (req.method === 'POST') {
    const p = parse(uploadSchema, req.body, res);
    if (!p) return;
    const buf = Buffer.from(p.data.replace(/^data:[^,]*,/, ''), 'base64');
    if (buf.length > MAX_UPLOAD_BYTES) return res.status(413).json({ error: 'too_large', message: 'Photos must be under 3 MB.' });
    const kind = sniffImage(buf);
    if (!kind) return res.status(400).json({ error: 'invalid_image', message: 'Only JPEG, PNG or WebP photos are accepted.' });
    const name = `${randomBytes(12).toString('hex')}.${kind.ext}`;
    const { error } = await supabase().storage.from(BUCKET).upload(name, buf, { contentType: kind.type, upsert: false });
    if (error) {
      console.error('upload failed:', error.message);
      return res.status(502).json({ error: 'upload_failed', message: uploadHint(error.message) });
    }
    return res.status(200).json({ url: `${bucketPrefix()}${name}` });
  }
  const p = parse(deleteUploadSchema, req.body, res);
  if (!p) return;
  const prefix = bucketPrefix();
  // Bundled /img photos and foreign URLs are never touched.
  if (!prefix || !p.url.startsWith(prefix)) return res.status(200).json({ ok: true, removed: false });
  const name = p.url.slice(prefix.length);
  if (!/^[A-Za-z0-9._\-]+$/.test(name)) return res.status(400).json({ error: 'invalid_input' });
  const used = await rpc<{ in_use: boolean }>('admin_image_in_use', { url: p.url });
  if (used.in_use) return res.status(200).json({ ok: true, removed: false });
  const { error } = await supabase().storage.from(BUCKET).remove([name]);
  if (error) return res.status(502).json({ error: 'upload_failed', message: 'Could not remove the file from storage.' });
  sendResult(res, { ok: true, removed: true });
}, { admin: true });
