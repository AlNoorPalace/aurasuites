import { fallbackHotels } from '../data/hotels';
import { dbConfigured, rpc } from './supabase';
import type { Hotel } from './rooms';

/** Hotels for static pages. Never throws: falls back to the built-in list. */
export async function loadHotels(): Promise<{ hotels: Hotel[]; live: boolean }> {
  if (!dbConfigured()) return { hotels: fallbackHotels, live: false };
  try {
    const r = await Promise.race([
      rpc<{ hotels: Hotel[] }>('public_hotels'),
      new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), 8000)),
    ]);
    if (!r?.hotels) throw new Error('bad response');
    return { hotels: r.hotels, live: true };
  } catch {
    return { hotels: fallbackHotels, live: false };
  }
}
