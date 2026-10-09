import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { PHOTOS } from '../data/photos';

const SLIDE_MS = 5500;
const GRADIENTS = ['from-[#1b2b34] to-[#0c151a]', 'from-[#2a3a42] to-[#10191e]', 'from-[#22343c] to-[#0e171c]'];
const WORDS = [['Arrive.'], ['Unwind.'], ['Feel', 'at', 'home.']];

export default function HeroSlider() {
  const slides = PHOTOS.hero;
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const touch = useRef<number | null>(null);
  const go = useCallback((n: number) => setI((p) => (p + n + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  useEffect(() => {
    if (paused || hidden || reduce) return;
    const t = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, paused, hidden, reduce, go]);

  const word = (w: string, k: number, italic: boolean) => (
    <span key={`${w}-${k}`} className="mr-[0.25em] inline-block overflow-hidden align-bottom">
      <motion.span className={`inline-block ${italic ? 'italic text-gold-light' : ''}`} initial={reduce ? false : { y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.15 + k * 0.12, ease: [0.22, 1, 0.36, 1] }}>{w}</motion.span>
    </span>
  );
  let k = 0;
  return (
    <section className="relative h-[92svh] min-h-[560px] overflow-hidden bg-ink text-white" aria-roledescription="carousel" aria-label="Aura Suites"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current !== null) { const d = e.changedTouches[0].clientX - touch.current; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); touch.current = null; } }}>
      <AnimatePresence initial={false}>
        <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }} aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`} />
          {slides[i].src && !failed[i] && <Image src={slides[i].src} alt={slides[i].alt} fill priority={i === 0} sizes="100vw" onError={() => setFailed((p) => ({ ...p, [i]: true }))} className={`object-cover ${reduce ? '' : 'animate-kenburns'}`} />}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-ink/10" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-5 pb-36 pt-10">
        <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 1 }} className="text-xs uppercase tracking-[0.3em] text-gold-light">Aura Suites · Kochi, Kerala</motion.p>
        <h1 className="mt-5 font-serif text-6xl leading-[1.02] md:text-8xl">
          {WORDS.map((line, li) => <span key={li} className="block">{line.map((w) => word(w, k++, li === 2))}</span>)}
        </h1>
        <motion.p initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8 }} className="mt-6 max-w-md text-lg text-white/85">A quieter kind of stay, in the places you need to be.</motion.p>
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.8 }}><a href="#locations" className="btn mt-8">Discover our locations</a></motion.div>
      </div>

      <div className="absolute bottom-32 right-5 z-20 hidden items-center gap-3 border border-white/20 bg-ink/60 px-4 py-3 text-sm backdrop-blur md:flex lg:right-[max(1.25rem,calc((100vw-72rem)/2))]">
        <button aria-label="Previous slide" onClick={() => go(-1)} className="border border-white/30 p-2 hover:bg-white/10"><ChevronLeft size={16} /></button>
        <span className="flex gap-3" role="tablist">{slides.map((_, n) => <button key={n} role="tab" aria-selected={n === i} aria-label={`Slide ${n + 1}`} onClick={() => setI(n)} className={`h-2.5 w-2.5 rounded-full border border-white/70 ${n === i ? 'bg-gold' : ''}`} />)}</span>
        <button aria-label="Next slide" onClick={() => go(1)} className="border border-white/30 p-2 hover:bg-white/10"><ChevronRight size={16} /></button>
        <button onClick={() => setPaused(!paused)} className="flex items-center gap-1 border border-white/30 px-3 py-2 hover:bg-white/10">{paused ? <Play size={12} /> : <Pause size={12} />} {paused ? 'Play' : 'Pause'}</button>
        <span className="tracking-widest text-white/70" data-testid="slide-count">{String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
      </div>
      <p className="absolute inset-x-0 bottom-14 z-10 px-5 text-center text-[11px] uppercase tracking-[0.25em] text-white/80">Three locations. One warm welcome. &nbsp; Aluva &nbsp;/&nbsp; Cheranallur &nbsp;/&nbsp; Kalamassery</p>
    </section>
  );
}
