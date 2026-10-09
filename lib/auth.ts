import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

export const COOKIE = 'aura_admin';
const TTL_SECONDS = 12 * 60 * 60;

const sha = (s: string) => createHash('sha256').update(s).digest();
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha(a), sha(b));
}

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET || '';
  return s.length >= 32 ? s : null;
}
const sign = (payload: string, key: string) => createHmac('sha256', key).update(payload).digest('base64url');

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD && !!secret();
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  return !!pw && safeEqual(input, pw);
}

export function makeToken(now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');
  const exp = String(Math.floor(now / 1000) + TTL_SECONDS);
  return `${exp}.${sign(exp, key)}`;
}

export function verifyToken(token: string | undefined, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  const expected = sign(exp, key);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(exp) * 1000 > now;
}

export function sessionCookie(token: string | null): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const base = `${COOKIE}=${token ?? ''}; Path=/; HttpOnly; SameSite=Strict${secure}`;
  return token ? `${base}; Max-Age=${TTL_SECONDS}` : `${base}; Max-Age=0`;
}

export function readCookie(req: NextApiRequest, name = COOKIE): string | undefined {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
}

export function isAdmin(req: { headers: { cookie?: string } }): boolean {
  return verifyToken(readCookie(req as NextApiRequest));
}

/** Writes must come from this site: the Origin header has to match the Host. */
export function originOk(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    const allowed = new Set([req.headers.host || '']);
    if (process.env.NEXT_PUBLIC_SITE_URL) allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host);
    return allowed.has(host);
  } catch {
    return false;
  }
}

export function requireAdmin(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method !== 'GET' && !originOk(req)) {
    res.status(403).json({ error: 'forbidden_origin' });
    return false;
  }
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}
