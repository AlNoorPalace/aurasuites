import Link from 'next/link';
import Layout from '../components/Layout';

export default function NotFound() {
  return <Layout title="Not found"><section className="section text-center"><h1 className="text-5xl">Page not found</h1><Link href="/" className="btn mt-8">Back home</Link></section></Layout>;
}
