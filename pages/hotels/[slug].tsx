import type { GetStaticPaths, GetStaticProps } from 'next';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import Gallery from '../../components/Gallery';
import Img from '../../components/Img';
import SearchBar from '../../components/SearchBar';
import BookingModal from '../../components/BookingModal';
import RequestForm from '../../components/RequestForm';
import { useSearch } from '../../components/SearchContext';
import { loadHotels } from '../../lib/data';
import { rupees } from '../../lib/client';
import { CONTACT } from '../../data/hotels';
import type { Hotel } from '../../lib/rooms';
import { Bed, Bath, Users, Phone } from 'lucide-react';

export const getStaticPaths: GetStaticPaths = async () => {
  const { hotels } = await loadHotels();
  return { paths: hotels.map((h) => ({ params: { slug: h.slug } })), fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { hotels, live } = await loadHotels();
  const hotel = hotels.find((h) => h.slug === params?.slug);
  if (!hotel) return { notFound: true, revalidate: 60 };
  return { props: { hotel, live, hotels: hotels.map((h) => ({ slug: h.slug, name: h.name })) }, revalidate: 300 };
};

const FAQ = [
  ['What time are check-in and check-out?', 'Please confirm timings with the hotel when you book; the team will be happy to help with early or late requests.'],
  ['How do I pay?', 'You pay at the hotel. After booking you may also pay by UPI if that option is shown, which is entirely optional.'],
  ['Can I cancel?', 'Yes. Use Manage booking with your reference and phone number any time before your stay begins.'],
];

export default function HotelPage({ hotel, live, hotels }: { hotel: Hotel; live: boolean; hotels: { slug: string; name: string }[] }) {
  const s = useSearch();
  const [open, setOpen] = useState<number | null | false>(false);
  useEffect(() => { if (s.hotel !== hotel.slug) s.set({ hotel: hotel.slug }); }, [hotel.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = s.checkIn && s.checkOut;
  const reserve = (id: number | null = null) => { if (ready) setOpen(id); else document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' }); };
  const photos = hotel.images.length ? hotel.images : hotel.image ? [hotel.image] : [];
  return (
    <Layout title={hotel.name} description={hotel.tagline}>
      <section className="section pb-8">
        <p className="eyebrow">{hotel.city}{hotel.state ? `, ${hotel.state}` : ''}</p>
        <h1 className="mt-2 text-5xl">{hotel.name}</h1>
        <p className="mt-2 text-ink/70">{hotel.tagline}</p>
      </section>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-12">
          <Gallery images={photos} alt={hotel.name} />
          {hotel.description && <p className="whitespace-pre-line text-ink/80">{hotel.description}</p>}

          <section id="rooms">
            <h2 className="text-3xl">Rooms</h2>
            {!live ? <div className="mt-4"><RequestForm hotel={hotel.name} /></div> : hotel.rooms.length === 0 ? <p className="mt-4 text-ink/60">Rooms for this location will appear here soon.</p> : (
              <div className="mt-4 space-y-4">
                {hotel.rooms.map((r) => (
                  <div key={r.id} className="flex flex-col gap-4 border border-ink/10 p-4 sm:flex-row">
                    <Img src={r.images[0]} alt={r.name} className="h-40 w-full sm:w-52 sm:shrink-0" sizes="208px" />
                    <div className="flex-1">
                      <h3 className="text-2xl">{r.name}</h3>
                      <p className="flex gap-4 text-xs text-ink/60"><span className="flex items-center gap-1"><Bed size={12} />{r.beds} bed{r.beds > 1 ? 's' : ''}</span><span className="flex items-center gap-1"><Bath size={12} />{r.baths}</span><span className="flex items-center gap-1"><Users size={12} />up to {r.max_guests}</span></p>
                      {r.description && <p className="mt-2 text-sm text-ink/70">{r.description}</p>}
                      <div className="mt-3 flex items-center justify-between"><span><b className="font-serif text-2xl">{rupees(r.base_rate)}</b> <span className="text-xs text-ink/50">/ night</span></span><button className="btn" onClick={() => reserve(r.id)}>Reserve</button></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {hotel.amenities.length > 0 && (
            <section><h2 className="text-3xl">Amenities</h2><ul className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">{hotel.amenities.map((a) => <li key={a} className="border-l-2 border-gold pl-3">{a}</li>)}</ul></section>
          )}

          {hotel.lat !== null && hotel.lng !== null && (
            <section><h2 className="text-3xl">Find us</h2>
              <iframe title={`Map of ${hotel.name}`} loading="lazy" className="mt-4 h-72 w-full border-0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${hotel.lng - 0.01}%2C${hotel.lat - 0.01}%2C${hotel.lng + 0.01}%2C${hotel.lat + 0.01}&marker=${hotel.lat}%2C${hotel.lng}&layer=mapnik`} />
            </section>
          )}

          <section><h2 className="text-3xl">Good to know</h2>
            <div className="mt-4 divide-y divide-ink/10">{FAQ.map(([q, a]) => <details key={q} className="py-3"><summary className="cursor-pointer font-medium">{q}</summary><p className="mt-2 text-sm text-ink/70">{a}</p></details>)}</div>
          </section>
        </div>

        <aside id="book" className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-gold/40 p-5">
            <h2 className="text-2xl">Book your stay</h2>
            {live ? (
              <div className="mt-4 space-y-3">
                <SearchBar hotels={hotels} lockHotel compact onSearch={() => reserve(null)} />
                <p className="text-xs text-ink/50">Pay at the hotel. Free cancellation until your stay begins.</p>
              </div>
            ) : <p className="mt-3 text-sm">Send a request above or call us.</p>}
            <a href={`tel:+91${hotel.phone || CONTACT.phone}`} className="mt-4 flex items-center gap-2 text-sm text-gold-dark"><Phone size={14} /> {hotel.phone || CONTACT.phoneDisplay}</a>
          </div>
        </aside>
      </div>
      {open !== false && ready && <BookingModal hotelSlug={hotel.slug} hotelName={hotel.name} initialRoomId={open ?? undefined} onClose={() => setOpen(false)} />}
    </Layout>
  );
}
