import { PHOTOS } from '../data/photos';
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

export type SitePhotos = { hero: { src: string; alt: string }[]; gallery: { src: string; caption: string }[] };

/** Homepage hero and gallery photos: saved in /admin, else the defaults in data/photos.ts. Never throws. */
export async function loadSitePhotos(): Promise<SitePhotos> {
  const defaults: SitePhotos = { hero: PHOTOS.hero, gallery: PHOTOS.gallery };
  if (!dbConfigured()) return defaults;
  try {
    const s = await Promise.race([
      rpc<Partial<SitePhotos>>('site_photos'),
      new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), 8000)),
    ]);
    return { hero: s?.hero?.length ? s.hero : defaults.hero, gallery: s?.gallery?.length ? s.gallery : defaults.gallery };
  } catch {
    return defaults;
  }
}
