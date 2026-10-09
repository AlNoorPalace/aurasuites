import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function dbConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Server-only client using the service-role key. Never import this from a component. */
export function supabase(): SupabaseClient {
  if (!dbConfigured()) throw new DbError('not_configured');
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export class DbError extends Error {
  constructor(message: string, public hint?: string) { super(message); }
}

/** Plain-language reason for common setup mistakes; shown to the admin, never to guests. */
export function setupHint(code?: string, message = ''): string | undefined {
  if (code === 'PGRST202' || code === '42883' || /could not find the function/i.test(message))
    return 'The database functions are missing. Run the five files in supabase/migrations/ (001 to 005) in the Supabase SQL editor, in order.';
  if (code === '42P01' || /relation .* does not exist/i.test(message)) return 'Database tables are missing. Run supabase/migrations/001_schema.sql first.';
  if (/invalid api key|jwt|apikey/i.test(message)) return 'Supabase rejected the key. Check SUPABASE_SERVICE_ROLE_KEY (it must be the service_role key) and SUPABASE_URL.';
  if (/fetch failed|ENOTFOUND|ECONNREFUSED/i.test(message)) return 'The server could not reach Supabase. Check SUPABASE_URL.';
}

/** Calls one SQL function: supabase.rpc(fn, { p }). Throws DbError when the database is unreachable. */
export async function rpc<T = any>(fn: string, p: unknown = {}): Promise<T> {
  const { data, error } = await supabase().rpc(fn, { p });
  if (error) {
    console.error(`rpc ${fn} failed:`, error.message);
    throw new DbError(error.message, setupHint((error as { code?: string }).code, error.message));
  }
  return data as T;
}
