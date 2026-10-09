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

export class DbError extends Error {}

/** Calls one SQL function: supabase.rpc(fn, { p }). Throws DbError when the database is unreachable. */
export async function rpc<T = any>(fn: string, p: unknown = {}): Promise<T> {
  const { data, error } = await supabase().rpc(fn, { p });
  if (error) {
    console.error(`rpc ${fn} failed:`, error.message);
    throw new DbError(error.message);
  }
  return data as T;
}
