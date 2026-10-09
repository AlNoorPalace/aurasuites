import Head from 'next/head';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Menu, Phone, X } from 'lucide-react';
import { CONTACT } from '../data/hotels';

const links = [
  { href: '/hotels', label: 'Our locations' },
  { href: '/#rooms', label: 'Rooms & Suites' },
  { href: '/#experience', label: 'The Aura experience' },
  { href: '/manage-booking', label: 'Manage booking' },
];

export default function Layout({ children, title, description }: { children: ReactNode; title?: string; description?: string }) {
  const [open, setOpen] = useState(false);
  const full = title ? `${title} · Aura Suites` : 'Aura Suites · Kochi, Kerala';
  return (
    <>
      <Head>
        <title>{full}</title>
        <meta name="description" content={description || 'Aura Suites: three welcoming hotel locations in Kochi, Kerala — Aluva, Cheranallur and Kalamassery.'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo-mark.png" />
      </Head>
      <header className="sticky top-0 z-40 border-b border-gold/30 bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-3 font-serif text-lg tracking-[0.22em] text-gold-light">
            <img src="/logo-mark.png" alt="" className="h-9 w-auto" /> AURA SUITES
          </Link>
          <nav className="hidden items-center gap-7 text-sm md:flex">
            {links.map((l) => <Link key={l.href} href={l.href} className="hover:text-gold-light">{l.label}</Link>)}
            <a href={`tel:+91${CONTACT.phone}`} className="btn !py-2"><Phone size={14} /> Call</a>
          </nav>
          <button className="md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav className="flex flex-col gap-4 border-t border-gold/20 px-5 py-5 text-sm md:hidden">
            {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
            <a href={`tel:+91${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="bg-ink px-5 py-14 text-center text-sm text-white/70">
        <img src="/logo.png" alt="Aura Suites" className="mx-auto w-44" />
        <p className="mt-6">Aluva · Cheranallur · Kalamassery</p>
        <p className="mt-2"><a className="text-gold-light" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a className="text-gold-light" href={`tel:+91${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a></p>
        <p className="mt-6 text-xs text-white/40">© {new Date().getFullYear()} Aura Suites</p>
      </footer>
    </>
  );
}
