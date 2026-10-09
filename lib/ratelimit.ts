import type { NextApiRequest } from 'next';

// In-memory, per server instance. Slows abuse; it is not a global limit on serverless hosts.
const hits = new Map<string, number[]>();

export function clientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const first = (Array.isArray(xf) ? xf[0] : xf)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

export function rateLimited(req: NextApiRequest, bucket: string, max: number, windowMs: number): boolean {
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return recent.length > max;
}
