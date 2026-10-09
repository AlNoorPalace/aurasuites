import Link from 'next/link';
import Img from './Img';
import { rupees } from '../lib/client';
import type { Hotel } from '../lib/rooms';

export default function HotelCard({ h, n }: { h: Hotel; n: number }) {
  const from = h.rooms.length ? Math.min(...h.rooms.map((r) => r.base_rate)) : null;
  return (
    <article className="group">
      <Link href={`/hotels/${h.slug}`} className="block">
        <Img src={h.image || h.images[0]} alt={h.name} className="aspect-[4/5] w-full transition group-hover:opacity-90" />
        <p className="eyebrow mt-4">{String(n).padStart(2, '0')} · {h.city}</p>
        <h3 className="text-3xl">{h.name}</h3>
        <p className="mt-1 text-sm text-ink/70">{h.tagline}</p>
        {from !== null && from > 0 && <p className="mt-2 text-sm">From <b>{rupees(from)}</b> / night</p>}
        <span className="mt-3 inline-block text-sm text-gold-dark">View &amp; book →</span>
      </Link>
    </article>
  );
}
