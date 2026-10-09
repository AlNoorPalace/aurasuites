/** Real image type from the first bytes; never trust the declared type. */
export function sniffImage(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; type: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', type: 'image/png' };
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const BUCKET = 'hotel-images';

export function bucketPrefix(supabaseUrl = process.env.SUPABASE_URL || ''): string {
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/` : '';
}

/** Only bundled /img photos or files in this project's bucket are accepted. */
export function isAllowedPhotoUrl(url: string, supabaseUrl?: string): boolean {
  if (/^\/img\/[A-Za-z0-9._\-\/]+$/.test(url) && !url.includes('..')) return true;
  const prefix = bucketPrefix(supabaseUrl);
  return !!prefix && url.startsWith(prefix) && /^[A-Za-z0-9._\-]+$/.test(url.slice(prefix.length));
}
