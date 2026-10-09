import { useEffect, useState } from 'react';
import PhotoManager from './PhotoManager';
import { adm, deleteFiles, type AdminCtx } from './common';

type Hero = { src: string; alt: string };
type Gal = { src: string; caption: string };

export default function SitePhotos({ ctx }: { ctx: AdminCtx }) {
  const [hero, setHero] = useState<Hero[]>([]);
  const [gallery, setGallery] = useState<Gal[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adm<{ hero: Hero[]; gallery: Gal[] }>(ctx, '/api/admin/site-photos').then((r) => {
      if (r.error) setMsg(r.error); else { setHero(r.data!.hero); setGallery(r.data!.gallery); }
    });
  }, [ctx]);

  const setHeroUrls = (urls: string[]) => setHero(urls.map((src) => hero.find((h) => h.src === src) ?? { src, alt: 'Aura Suites' }));
  const setGalleryUrls = (urls: string[]) => setGallery(urls.map((src) => gallery.find((g) => g.src === src) ?? { src, caption: '' }));

  const save = async () => {
    setBusy(true); setMsg(''); setOk(false);
    const r = await adm(ctx, '/api/admin/site-photos', 'POST', { hero, gallery });
    setBusy(false);
    if (r.error) return setMsg(Object.values(r.fields || {})[0] || r.error);
    await deleteFiles(ctx, removed);
    setRemoved([]); setOk(true);
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-2xl">Homepage slideshow</h3>
        <p className="mb-3 text-sm text-ink/60">Large photos at the top of the homepage. The first one is shown first. Add, delete or reorder them.</p>
        <PhotoManager images={hero.map((h) => h.src)} max={8} mainLabel="main" bundled={ctx.bundled} onChange={setHeroUrls} onRemoved={(u) => setRemoved((r) => [...r, u])} />
      </section>
      <section>
        <h3 className="text-2xl">Gallery</h3>
        <p className="mb-3 text-sm text-ink/60">Photos in the gallery section of the homepage, with an optional caption for each.</p>
        <PhotoManager images={gallery.map((g) => g.src)} max={18} mainLabel="main" bundled={ctx.bundled} onChange={setGalleryUrls} onRemoved={(u) => setRemoved((r) => [...r, u])} />
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {gallery.map((g, i) => (
            <label key={g.src} className="text-sm">Caption for photo {i + 1}
              <input className="input mt-1" value={g.caption} maxLength={120} onChange={(e) => setGallery(gallery.map((x) => (x.src === g.src ? { ...x, caption: e.target.value } : x)))} />
            </label>
          ))}
        </div>
      </section>
      {msg && <p className="err">{msg}</p>}
      {ok && <p className="text-sm text-green-800">Saved. The website will update within a minute.</p>}
      <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save site photos'}</button>
    </div>
  );
}
