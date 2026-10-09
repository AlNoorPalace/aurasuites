import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import Img from './Img';
import Reveal from './Reveal';

export type GalleryItem = { src: string; caption: string };

export default function GallerySection({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const step = useCallback((d: number) => setOpen((o) => (o === null ? o : (o + d + items.length) % items.length)), [items.length]);
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
  }, [open, step]);

  return (
    <section id="gallery" className="section">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">A little stay inspiration</p><h2 className="mt-3 text-4xl md:text-5xl">Picture a slower pace.</h2></div>
        <p className="text-sm text-ink/60">Explore rooms and inviting interiors. Photography is illustrative.</p>
      </Reveal>
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {items.map((g, n) => (
          <Reveal key={g.caption} delay={(n % 3) * 0.08}>
            <button type="button" onClick={() => setOpen(n)} aria-label={`Open photo: ${g.caption}`} className="group relative block aspect-[4/3] w-full overflow-hidden text-left" data-testid="gallery-tile">
              <Img src={g.src} alt={g.caption} className="h-full w-full transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 33vw, 50vw" />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-white transition duration-500 group-hover:-translate-y-1">
                <span><span className="mr-2 text-[10px] tracking-widest text-gold-light">{String(n + 1).padStart(2, '0')}</span><span className="font-serif text-lg leading-tight md:text-xl">{g.caption}</span></span>
                <Plus size={20} className="shrink-0 transition duration-500 group-hover:rotate-90" />
              </span>
            </button>
          </Reveal>
        ))}
      </div>
      <p className="mt-6 text-xs text-ink/50">These images are stay inspiration, not photographs of Aura Suites. Official property photographs will replace them.</p>

      <AnimatePresence>
        {open !== null && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/95 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Photo gallery" data-testid="lightbox" onClick={() => setOpen(null)}>
            <button aria-label="Close" className="absolute right-5 top-5 text-white" onClick={() => setOpen(null)}><X /></button>
            <button aria-label="Previous photo" className="absolute left-3 text-white md:left-8" onClick={(e) => { e.stopPropagation(); step(-1); }}><ChevronLeft size={36} /></button>
            <motion.figure key={open} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <Img src={items[open].src} alt={items[open].caption} className="aspect-[3/2] w-full" sizes="90vw" priority />
              <figcaption className="mt-3 text-center font-serif text-xl text-white">{items[open].caption} <span className="ml-2 text-xs text-white/50">{open + 1} / {items.length}</span></figcaption>
            </motion.figure>
            <button aria-label="Next photo" className="absolute right-3 text-white md:right-8" onClick={(e) => { e.stopPropagation(); step(1); }}><ChevronRight size={36} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
