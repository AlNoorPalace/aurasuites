import type { GetServerSideProps } from 'next';
import { loadHotels } from '../lib/data';
import { groupRooms } from '../lib/rooms';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const { hotels } = await loadHotels();
  const paths = ['/', '/hotels', '/manage-booking', ...hotels.map((h) => `/hotels/${h.slug}`), ...groupRooms(hotels).map((g) => `/rooms/${g.slug}`)];
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}\n</urlset>`);
  res.end();
  return { props: {} };
};
export default function Sitemap() { return null; }
