// Local stand-in for Supabase: PGlite + /rest/v1/rpc/<fn> + a tiny public storage bucket.
// Usage: npm run dev:db   then   SUPABASE_URL=http://localhost:54321 SUPABASE_SERVICE_ROLE_KEY=dev npm run dev
import { createServer } from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { migrationSql } from '../lib/migrations';

const PORT = Number(process.env.DEV_DB_PORT || 54321);
const FN = /^[a-z_][a-z0-9_]*$/;

export async function startDevDb(port = PORT, withSeed = true) {
  const db = new PGlite();
  for (const m of migrationSql()) {
    if (!withSeed && m.file.includes('seed')) continue;
    await db.exec(m.sql);
  }
  const files = new Map<string, { type: string; body: Buffer }>();
  const body = (req: import('node:http').IncomingMessage) =>
    new Promise<Buffer>((ok) => { const c: Buffer[] = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    const send = (code: number, data: unknown, type = 'application/json') => {
      res.writeHead(code, { 'content-type': type, 'access-control-allow-origin': '*' });
      res.end(type === 'application/json' ? JSON.stringify(data) : (data as Buffer));
    };
    try {
      const rpcMatch = url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/);
      if (rpcMatch && req.method === 'POST') {
        if (!FN.test(rpcMatch[1])) return send(404, { message: 'not found' });
        const { p } = JSON.parse((await body(req)).toString() || '{}');
        const r = await db.query<{ r: unknown }>(`select ${rpcMatch[1]}($1::jsonb) as r`, [JSON.stringify(p ?? {})]);
        return send(200, r.rows[0].r);
      }
      const st = url.pathname.match(/^\/storage\/v1\/object\/(?:public\/)?hotel-images\/([A-Za-z0-9._\-]+)$/);
      if (st) {
        const name = st[1];
        if (req.method === 'GET') { const f = files.get(name); return f ? send(200, f.body, f.type) : send(404, { message: 'not found' }); }
        if (req.method === 'POST') { files.set(name, { type: String(req.headers['content-type'] || 'application/octet-stream'), body: await body(req) }); return send(200, { Key: `hotel-images/${name}` }); }
        if (req.method === 'DELETE') { files.delete(name); return send(200, { message: 'ok' }); }
      }
      // supabase-js storage.remove() posts a list of names to the bucket path
      if (url.pathname === '/storage/v1/object/hotel-images' && req.method === 'DELETE') {
        const { prefixes } = JSON.parse((await body(req)).toString() || '{}');
        for (const n of prefixes || []) files.delete(n);
        return send(200, []);
      }
      send(404, { message: 'not found' });
    } catch (e) {
      send(400, { message: String(e) });
    }
  });
  await new Promise<void>((ok) => server.listen(port, ok));
  return { server, db, files, url: `http://localhost:${port}` };
}

if (process.argv[1]?.endsWith('dev-db.ts')) {
  startDevDb().then((d) => console.log(`Dev database ready at ${d.url} (use any service-role key)`));
}
