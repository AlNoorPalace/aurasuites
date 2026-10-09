import type { NextApiRequest, NextApiResponse } from 'next';
import type { ZodType } from 'zod';
import { fieldErrors } from './schemas';
import { DbError, dbConfigured } from './supabase';
import { rateLimited } from './ratelimit';
import { requireAdmin } from './auth';

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<unknown> | unknown;

/** Parses input or answers 400 with field-level messages. */
export function parse<T>(schema: ZodType<T>, input: unknown, res: NextApiResponse): T | null {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  res.status(400).json({ error: 'invalid_input', fields: fieldErrors(r.error) });
  return null;
}

/** Wraps a route: method check, optional rate limit, and no leaking of internal error text. */
export function route(methods: string[], handler: Handler, opts: { admin?: boolean; noDb?: boolean; limit?: [string, number, number] } = {}) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      if (!methods.includes(req.method || '')) {
        res.setHeader('Allow', methods.join(', '));
        return res.status(405).json({ error: 'method_not_allowed' });
      }
      if (opts.limit && rateLimited(req, ...opts.limit)) return res.status(429).json({ error: 'rate_limited' });
      if (opts.admin && !requireAdmin(req, res)) return;
      if (!opts.noDb && !dbConfigured()) return res.status(503).json({ error: 'unavailable' });
      await handler(req, res);
    } catch (e) {
      console.error('api error:', req.url, e instanceof DbError ? e.message : e);
      if (!res.headersSent) {
        const hint = e instanceof DbError && opts.admin ? e.hint : undefined; // setup hints are for the admin only
        res.status(e instanceof DbError ? 503 : 500).json({ error: e instanceof DbError ? 'unavailable' : 'server_error', ...(hint ? { message: hint } : {}) });
      }
    }
  };
}

const STATUS: Record<string, number> = {
  not_found: 404, sold_out: 409, slug_taken: 409, name_taken: 409, has_bookings: 409, already_cancelled: 409, too_late: 409, invalid_amount: 400,
};
/** Sends a SQL function result: error codes become 4xx, success is passed through. */
export function sendResult(res: NextApiResponse, r: any) {
  if (r && typeof r.error === 'string') return res.status(STATUS[r.error] ?? 400).json({ error: r.error });
  return res.status(200).json(r);
}
