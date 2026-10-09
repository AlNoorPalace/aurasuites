import Link from 'next/link';
import Img from './Img';
import Reveal from './Reveal';
import { rupees } from '../lib/client';
import { PHOTOS } from '../data/photos';
import type { Hotel } from '../lib/rooms';

export default function HotelCard({ h, n }: { h: Hotel; n: number }) {
  const from = h.rooms.length ? Math.min(...h.rooms.map((r) => r.base_rate)) : null;
  const photo = h.image || h.images[0] || PHOTOS.locations[h.slug] || null;
  return (
    <Reveal delay={(n - 1) * 0.12}>
      <article className="group bg-ivory">
        <Link href={`/hotels/${h.slug}`} className="block">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Img src={photo} alt={h.name} className="h-full w-full transition duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-ink/15" />
            <span className="absolute left-5 top-4 text-xs tracking-[0.25em] text-white">{String(n).padStart(2, '0')}</span>
            <span className="absolute bottom-4 left-5 text-xs uppercase tracking-[0.3em] text-white">{h.city}</span>
          </div>
          <div className="px-6 pb-7 pt-6">
            <p className="eyebrow">Aura Suites</p>
            <h3 className="mt-2 text-3xl">{h.city || h.name}</h3>
            <p className="mt-3 min-h-[3rem] text-ink/65">{h.tagline}</p>
            {from !== null && from > 0 && <p className="mt-2 text-sm">From <b className="font-medium">{rupees(from)}</b> / night</p>}
            <span className="link-draw mt-4 inline-block text-sm">Book {h.city || h.name}</span>
          </div>
        </Link>
      </article>
    </Reveal>
  );
}
