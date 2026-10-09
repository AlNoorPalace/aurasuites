import Link from 'next/link';
import Img from './Img';
import { rupees } from '../lib/client';
import type { RoomGroup } from '../lib/rooms';

export default function RoomCard({ g }: { g: RoomGroup }) {
  return (
    <Link href={`/rooms/${g.slug}`} className="group block border border-ink/10 bg-white">
      <Img src={g.images[0]} alt={g.name} className="aspect-[4/3] w-full" />
      <div className="p-5">
        <h3 className="text-2xl">{g.name}</h3>
        <p className="mt-1 text-sm text-ink/60">{g.offers.length} location{g.offers.length > 1 ? 's' : ''} · up to {g.maxGuests} guests</p>
        <p className="mt-3 text-sm">From <b>{rupees(g.minRate)}</b> / night</p>
      </div>
    </Link>
  );
}
