import type { GetStaticProps } from 'next';
import Link from 'next/link';
import Layout from '../components/Layout';
import HeroSlider from '../components/HeroSlider';
import SearchBar from '../components/SearchBar';
import HotelCard from '../components/HotelCard';
import RoomCard from '../components/RoomCard';
import GallerySection, { type GalleryItem } from '../components/GallerySection';
import Reveal from '../components/Reveal';
import { PHOTOS } from '../data/photos';
import { CONTACT } from '../data/hotels';
import { loadHotels } from '../lib/data';
import { groupRooms, type Hotel } from '../lib/rooms';

export const getStaticProps: GetStaticProps = async () => {
  const { hotels, live } = await loadHotels();
  return { props: { hotels, live }, revalidate: 300 };
};

export default function Home({ hotels, live }: { hotels: Hotel[]; live: boolean }) {
  const rooms = groupRooms(hotels);
  // Photos uploaded in /admin come first; the configured defaults fill the remaining gallery slots.
  const uploaded = Array.from(new Set([...hotels.flatMap((h) => h.images), ...hotels.flatMap((h) => h.rooms.flatMap((r) => r.images))]));
  const gallery: GalleryItem[] = PHOTOS.gallery.map((g, i) => ({ caption: g.caption, src: uploaded[i] || g.src }));
  return (
    <Layout>
      <div className="relative">
        <HeroSlider />
        <div className="absolute inset-x-0 bottom-0 z-30 translate-y-1/2 px-5">
          <div className="mx-auto max-w-5xl">
            {live ? <SearchBar hotels={hotels} /> : (
              <div className="border border-gold/40 bg-white p-4 text-center text-sm">Online booking is not available right now. <a className="underline" href="#locations">Choose a location</a> to send us a request.</div>
            )}
          </div>
        </div>
      </div>

      <section id="experience" className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-40 md:grid-cols-2 md:py-32 md:pt-44">
        <Reveal><p className="eyebrow">Make yourself at home</p><h2 className="mt-4 text-4xl leading-tight md:text-6xl">Your time in Kochi,<br /><em className="text-gold-dark">at your own pace.</em></h2></Reveal>
        <Reveal delay={0.15} className="md:pt-16"><p className="text-lg leading-8 text-ink/70">A work trip. A family visit. A few days away. Whatever brings you here, find your starting point at Aura Suites. Choose from three locations and tell us what would make your stay feel right.</p></Reveal>
      </section>

      <section id="locations" className="bg-mist">
        <div className="section">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow !text-ink">Find your Aura</p><h2 className="mt-3 text-4xl md:text-5xl">Three places to settle in.</h2></div>
            <p className="text-ink/60">Choose your neighbourhood.<br />We&apos;ll help with the rest.</p>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">{hotels.map((h, i) => <HotelCard key={h.slug} h={h} n={i + 1} />)}</div>
        </div>
      </section>

      {rooms.length > 0 && (
        <section id="rooms">
          <div className="section">
            <Reveal><p className="eyebrow">Rooms &amp; Suites</p><h2 className="mt-3 text-4xl md:text-5xl">Find the room that suits you.</h2></Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((g, i) => <Reveal key={g.slug} delay={(i % 3) * 0.08}><RoomCard g={g} /></Reveal>)}</div>
          </div>
        </section>
      )}

      <GallerySection items={gallery} />

      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <Reveal>
            <p className="eyebrow !text-gold-light">Let&apos;s plan your stay</p>
            <h2 className="mt-4 text-4xl md:text-6xl">A warm welcome<br />starts here.</h2>
            <p className="mx-auto mt-5 max-w-lg text-white/70">Pick your dates and book in a minute. Pay at the hotel, or secure your slot with an advance.</p>
            <Link href="/hotels" className="btn mt-8">Book your stay</Link>
          </Reveal>
        </div>
      </section>

      <section id="contact" className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:py-28">
        <Reveal><p className="eyebrow !text-ink">Stay in touch</p><h2 className="mt-4 text-4xl md:text-5xl">We look forward<br />to welcoming you.</h2></Reveal>
        <Reveal delay={0.15} className="md:pt-8">
          <p className="eyebrow">Reservations</p>
          <p className="mt-3 font-serif text-2xl md:text-3xl"><a className="link-draw" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></p>
          <p className="mt-3 font-serif text-2xl md:text-3xl"><a className="link-draw" href={`tel:+91${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a></p>
          <p className="mt-6 text-sm"><Link href="/manage-booking" className="link-draw">Manage an existing booking</Link></p>
        </Reveal>
      </section>
    </Layout>
  );
}
