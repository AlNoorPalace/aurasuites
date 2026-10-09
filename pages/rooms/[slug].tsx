import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import Layout from '../../components/Layout';
import Gallery from '../../components/Gallery';
import SearchBar from '../../components/SearchBar';
import BookingModal from '../../components/BookingModal';
import { useSearch } from '../../components/SearchContext';
import { loadHotels } from '../../lib/data';
import { rupees } from '../../lib/client';
import { groupRooms, type RoomGroup } from '../../lib/rooms';

export const getStaticPaths: GetStaticPaths = async () => {
  const { hotels } = await loadHotels();
  return { paths: groupRooms(hotels).map((g) => ({ params: { slug: g.slug } })), fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { hotels, live } = await loadHotels();
  const group = groupRooms(hotels).find((g) => g.slug === params?.slug);
  if (!group) return { notFound: true, revalidate: 60 };
  return { props: { group, live, hotels: hotels.map((h) => ({ slug: h.slug, name: h.name })) }, revalidate: 300 };
};

export default function RoomPage({ group, live, hotels }: { group: RoomGroup; live: boolean; hotels: { slug: string; name: string }[] }) {
  const s = useSearch();
  const [open, setOpen] = useState<{ slug: string; name: string; roomId: number } | null>(null);
  const ready = s.checkIn && s.checkOut;
  const reserve = (o: RoomGroup['offers'][number]) => {
    s.set({ hotel: o.hotel_slug });
    if (ready) setOpen({ slug: o.hotel_slug, name: o.hotel_name, roomId: o.room_id });
    else document.getElementById('dates')?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <Layout title={group.name} description={group.description || `${group.name} at Aura Suites`}>
      <section className="section pb-8">
        <p className="eyebrow">Rooms &amp; Suites</p>
        <h1 className="mt-2 text-5xl">{group.name}</h1>
        <p className="mt-2 text-ink/70">From {rupees(group.minRate)} per night · up to {group.maxGuests} guests</p>
      </section>
      <div className="mx-auto max-w-6xl space-y-10 px-5 pb-20">
        <Gallery images={group.images} alt={group.name} />
        {group.description && <p className="max-w-2xl text-ink/80">{group.description}</p>}
        {live && <div id="dates"><p className="mb-2 text-sm text-ink/60">Choose your dates, then reserve at a location below.</p><SearchBar hotels={hotels} lockHotel onSearch={() => {}} /></div>}
        <section>
          <h2 className="text-3xl">Where to stay</h2>
          <div className="mt-4 divide-y divide-ink/10 border border-ink/10">
            {group.offers.map((o) => (
              <div key={o.hotel_slug} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div><Link href={`/hotels/${o.hotel_slug}`} className="font-serif text-xl hover:text-gold-dark">{o.hotel_name}</Link><p className="text-xs text-ink/60">{o.city}</p></div>
                <div className="flex items-center gap-5"><span><b className="font-serif text-2xl">{rupees(o.rate)}</b> <span className="text-xs text-ink/50">/ night</span></span>{live ? <button className="btn" onClick={() => reserve(o)}>Reserve</button> : <Link className="btn" href={`/hotels/${o.hotel_slug}`}>Enquire</Link>}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
      {open && ready && <BookingModal hotelSlug={open.slug} hotelName={open.name} initialRoomId={open.roomId} onClose={() => setOpen(null)} />}
    </Layout>
  );
}
