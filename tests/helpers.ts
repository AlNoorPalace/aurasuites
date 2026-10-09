import { PGlite } from '@electric-sql/pglite';
import { migrationSql } from '../lib/migrations';

export async function newDb(seed = false) {
  const db = new PGlite();
  for (const m of migrationSql()) {
    if (!seed && m.file.includes('seed')) continue;
    await db.exec(m.sql);
    await db.exec(m.sql); // every migration must be safe to run twice
  }
  const rpc = async (fn: string, p: unknown = {}) => {
    const r = await db.query<{ r: any }>(`select ${fn}($1::jsonb) as r`, [JSON.stringify(p)]);
    return r.rows[0].r;
  };
  return { db, rpc };
}

export const day = (offset: number) => {
  const d = new Date(Date.now() + 5.5 * 3600e3);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

export async function setup(rpc: (fn: string, p?: unknown) => Promise<any>, rooms = 2) {
  await rpc('admin_save_hotel', { slug: 'aluva', name: 'Aura Suites Aluva', create: true });
  const r = await rpc('admin_save_room_type', {
    hotel_slug: 'aluva', name: 'Deluxe', total_rooms: rooms, base_rate: 3000, max_guests: 2,
  });
  return r.room_type.id as number;
}
