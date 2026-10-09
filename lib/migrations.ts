import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** SQL of every migration file, in order. Used by the dev DB and the tests. */
export function migrationSql(): { file: string; sql: string }[] {
  const dir = join(process.cwd(), 'supabase', 'migrations');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({ file, sql: readFileSync(join(dir, file), 'utf8') }));
}
