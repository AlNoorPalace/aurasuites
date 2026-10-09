import type { GetStaticProps } from 'next';
import Layout from '../../components/Layout';
import HotelCard from '../../components/HotelCard';
import { loadHotels } from '../../lib/data';
import type { Hotel } from '../../lib/rooms';

export const getStaticProps: GetStaticProps = async () => {
  const { hotels, live } = await loadHotels();
  return { props: { hotels, live }, revalidate: 300 };
};

export default function Hotels({ hotels }: { hotels: Hotel[]; live: boolean }) {
  return (
    <Layout title="Our locations">
      <section className="section">
        <p className="eyebrow">Our locations</p>
        <h1 className="mt-3 text-5xl">Three places to settle in.</h1>
        <div className="mt-10 grid gap-8 md:grid-cols-3">{hotels.map((h, i) => <HotelCard key={h.slug} h={h} n={i + 1} />)}</div>
      </section>
    </Layout>
  );
}
