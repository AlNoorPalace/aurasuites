import type { GetStaticProps } from 'next';
import Layout from '../components/Layout';
import SearchBar from '../components/SearchBar';
import HotelCard from '../components/HotelCard';
import RoomCard from '../components/RoomCard';
import { loadHotels } from '../lib/data';
import { groupRooms, type Hotel } from '../lib/rooms';

export const getStaticProps: GetStaticProps = async () => {
  const { hotels, live } = await loadHotels();
  return { props: { hotels, live }, revalidate: 300 };
};

export default function Home({ hotels, live }: { hotels: Hotel[]; live: boolean }) {
  const rooms = groupRooms(hotels);
  return (
    <Layout>
      <section className="relative bg-ink text-white">
        <div className="mx-auto max-w-6xl px-5 pb-28 pt-20 md:pt-28">
          <p className="eyebrow !text-gold-light">Aura Suites · Kochi, Kerala</p>
          <h1 className="mt-4 text-6xl leading-none md:text-8xl">Arrive.<br />Unwind.<br /><em className="text-gold-light">Feel at home.</em></h1>
          <p className="mt-6 max-w-md text-lg text-white/80">A quieter kind of stay, in the places you need to be.</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 translate-y-1/2 px-5">
          <div className="mx-auto max-w-5xl">
            {live ? <SearchBar hotels={hotels} /> : (
              <div className="border border-gold/40 bg-white p-4 text-center text-sm text-ink">Online booking is not available right now. <a className="text-gold-dark underline" href="#locations">Choose a location</a> to send us a request.</div>
            )}
          </div>
        </div>
      </section>

      <section id="experience" className="section pt-32 text-center">
        <p className="eyebrow">Make yourself at home</p>
        <h2 className="mt-3 text-4xl md:text-5xl">Your time in Kochi, at your own pace.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-ink/70">A work trip. A family visit. A few days away. Whatever brings you here, find your starting point at Aura Suites. Choose from three locations and tell us what would make your stay feel right.</p>
      </section>

      <section id="locations" className="section pt-0">
        <p className="eyebrow">Find your Aura</p>
        <h2 className="mt-3 text-4xl md:text-5xl">Three places to settle in.</h2>
        <p className="mt-2 text-ink/60">Choose your neighbourhood. We&apos;ll help with the rest.</p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">{hotels.map((h, i) => <HotelCard key={h.slug} h={h} n={i + 1} />)}</div>
      </section>

      {rooms.length > 0 && (
        <section id="rooms" className="bg-ivory">
          <div className="section">
            <p className="eyebrow">Rooms &amp; Suites</p>
            <h2 className="mt-3 text-4xl md:text-5xl">Find the room that suits you.</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((g) => <RoomCard key={g.slug} g={g} />)}</div>
          </div>
        </section>
      )}
    </Layout>
  );
}
