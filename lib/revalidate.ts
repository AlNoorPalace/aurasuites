import type { NextApiResponse } from 'next';
import { rpc } from './supabase';
import { groupRooms, slugify, type Hotel } from './rooms';

/** Refreshes every statically generated page after an admin change. Failures are ignored. */
export async function revalidateSite(res: NextApiResponse, extraHotelSlugs: string[] = [], extraRoomNames: string[] = []) {
  try {
    const { hotels } = await rpc<{ hotels: Hotel[] }>('public_hotels');
    const paths = new Set(['/', '/hotels', '/manage-booking']);
    for (const h of hotels) paths.add(`/hotels/${h.slug}`);
    for (const g of groupRooms(hotels)) paths.add(`/rooms/${g.slug}`);
    for (const s of extraHotelSlugs) paths.add(`/hotels/${s}`);
    for (const n of extraRoomNames) paths.add(`/rooms/${slugify(n)}`);
    await Promise.all([...paths].map((p) => res.revalidate(p).catch(() => undefined)));
  } catch (e) {
    console.error('revalidate failed', e);
  }
}
