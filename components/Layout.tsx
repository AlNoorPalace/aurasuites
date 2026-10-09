import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { CONTACT } from '../data/hotels';

const links = [
  { href: '/#locations', label: 'Our locations' },
  { href: '/#experience', label: 'The Aura experience' },
  { href: '/#gallery', label: 'Gallery' },
  { href: '/#contact', label: 'Contact' },
];

export default function Layout({ children, title, description }: { children: ReactNode; title?: string; description?: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const full = title ? `${title} · Aura Suites` : 'Aura Suites · Kochi, Kerala';
  return (
    <>
      <Head>
        <title>{full}</title>
        <meta name="description" content={description || 'Aura Suites: three welcoming hotel locations in Kochi, Kerala — Aluva, Cheranallur and Kalamassery.'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo-mark.png" />
      </Head>
      <header className={`sticky top-0 z-40 border-b border-ink/10 bg-ivory/95 backdrop-blur transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`}>
        <div className={`mx-auto flex max-w-6xl items-center justify-between px-5 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}>
          <Link href="/" aria-label="Aura Suites home"><img src="/logo-dark.png" alt="Aura Suites" className={`w-auto transition-all duration-300 ${scrolled ? 'h-11' : 'h-14'}`} /></Link>
          <nav className="hidden items-center gap-8 text-sm md:flex">
            {links.map((l) => <Link key={l.href} href={l.href} className="link-draw">{l.label}</Link>)}
            <Link href="/hotels" className="border border-ink/30 px-5 py-3 transition hover:bg-ink hover:text-gold-light">Book a stay</Link>
          </nav>
          <button className="md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav className="flex flex-col gap-4 border-t border-ink/10 px-5 py-5 text-sm md:hidden">
            {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
            <Link href="/manage-booking" onClick={() => setOpen(false)}>Manage booking</Link>
            <Link href="/hotels" className="btn" onClick={() => setOpen(false)}>Book a stay</Link>
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="border-t border-ink/10 bg-ivory px-5 py-12">
        <div className="mx-auto grid max-w-6xl items-center gap-8 text-sm text-ink/70 md:grid-cols-3">
          <img src="/logo-dark.png" alt="Aura Suites" className="h-16 w-auto" />
          <div className="md:text-center"><p>Aluva · Cheranallur · Kalamassery</p><p className="mt-2"><Link href="/manage-booking" className="link-draw">Manage booking</Link></p></div>
          <div className="md:text-right"><p>© {new Date().getFullYear()} Aura Suites</p><p className="mt-2 text-xs text-ink/50">Illustrative photography. Official photos coming soon.</p></div>
        </div>
      </footer>
    </>
  );
}
