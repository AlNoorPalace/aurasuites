import { useCallback, useEffect, useState } from 'react';
import PhotoManager from './PhotoManager';
import { AMENITIES, adm, deleteFiles, type AdminCtx } from './common';

export type AdminHotel = { slug: string; name: string; city: string; state: string; tagline: string; description: string; phone: string; lat: number | null; lng: number | null; images: string[]; amenities: string[]; active: boolean; sort_order: number; has_bookings: boolean; room_count: number };
const blank = { slug: '', name: '', city: '', state: 'Kerala', tagline: '', description: '', phone: '', lat: '' as number | '' | null, lng: '' as number | '' | null, images: [] as string[], amenities: [] as string[], active: true, sort_order: 0 };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function Hotels({ ctx, onChanged }: { ctx: AdminCtx; onChanged: () => void }) {
  const [list, setList] = useState<AdminHotel[]>([]);
  const [form, setForm] = useState<(typeof blank & { isNew: boolean }) | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await adm<{ hotels: AdminHotel[] }>(ctx, '/api/admin/hotels');
    if (r.error) setMsg(r.error); else setList(r.data!.hotels);
  }, [ctx]);
  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true); setErrs({}); setMsg('');
    const { isNew, ...rest } = form;
    const r = await adm(ctx, '/api/admin/hotels', 'POST', { ...rest, create: isNew || undefined });
    setBusy(false);
    if (r.error) { setErrs(r.fields || {}); return setMsg(r.error); }
    await deleteFiles(ctx, removed);
    setRemoved([]); setForm(null); load(); onChanged();
  };
  const toggle = async (h: AdminHotel) => {
    const r = await adm(ctx, '/api/admin/hotels', 'POST', { slug: h.slug, name: h.name, active: !h.active });
    if (r.error) setMsg(r.error); else { load(); onChanged(); }
  };
  const del = async (h: AdminHotel) => {
    if (!confirm(`Delete ${h.name}? This cannot be undone.`)) return;
    const r = await adm(ctx, '/api/admin/hotels', 'DELETE', { slug: h.slug });
    if (r.error) return setMsg(r.error);
    await deleteFiles(ctx, h.images);
    load(); onChanged();
  };
  const edit = (h: AdminHotel) => { setRemoved([]); setErrs({}); setMsg(''); setForm({ ...blank, ...h, lat: h.lat ?? '', lng: h.lng ?? '', isNew: false }); };
  const f = form;
  const set = (k: string, v: unknown) => setForm((p) => (p ? { ...p, [k]: v } : p));

  return (
    <div>
      {!f && <button className="btn" onClick={() => { setRemoved([]); setErrs({}); setMsg(''); setForm({ ...blank, isNew: true }); }}>Add hotel</button>}
      {msg && !f && <p className="err mt-3">{msg}</p>}
      {f && (
        <form onSubmit={save} className="mt-2 grid gap-4 border border-gold/40 p-5 md:grid-cols-2" data-testid="hotel-form">
          <h3 className="text-2xl md:col-span-2">{f.isNew ? 'Add hotel' : `Edit ${f.name}`}</h3>
          <div><label className="label" htmlFor="h-name">Name</label><input id="h-name" className="input" value={f.name} onChange={(e) => { set('name', e.target.value); if (f.isNew) set('slug', slugify(e.target.value)); }} />{errs.name && <p className="err">{errs.name}</p>}</div>
          <div><label className="label" htmlFor="h-slug">URL name</label><input id="h-slug" className="input" value={f.slug} disabled={!f.isNew} onChange={(e) => set('slug', e.target.value)} />{errs.slug && <p className="err">{errs.slug}</p>}</div>
          <div><label className="label" htmlFor="h-city">City</label><input id="h-city" className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div><label className="label" htmlFor="h-state">State</label><input id="h-state" className="input" value={f.state} onChange={(e) => set('state', e.target.value)} /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="h-tag">Tagline</label><input id="h-tag" className="input" value={f.tagline} onChange={(e) => set('tagline', e.target.value)} /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="h-desc">Description</label><textarea id="h-desc" className="input" rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div><label className="label" htmlFor="h-phone">Phone (10 digits)</label><input id="h-phone" className="input" inputMode="numeric" value={f.phone} onChange={(e) => set('phone', e.target.value)} />{errs.phone && <p className="err">{errs.phone}</p>}</div>
          <div><label className="label" htmlFor="h-sort">Sort order</label><input id="h-sort" className="input" type="number" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></div>
          <div><label className="label" htmlFor="h-lat">Latitude (optional)</label><input id="h-lat" className="input" value={f.lat ?? ''} onChange={(e) => set('lat', e.target.value)} />{errs.lat && <p className="err">{errs.lat}</p>}</div>
          <div><label className="label" htmlFor="h-lng">Longitude (optional)</label><input id="h-lng" className="input" value={f.lng ?? ''} onChange={(e) => set('lng', e.target.value)} />{errs.lng && <p className="err">{errs.lng}</p>}</div>
          <fieldset className="md:col-span-2"><legend className="label">Amenities</legend>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">{AMENITIES.map((a) => (
              <label key={a} className="flex items-center gap-2"><input type="checkbox" checked={f.amenities.includes(a)} onChange={(e) => set('amenities', e.target.checked ? [...f.amenities, a] : f.amenities.filter((x) => x !== a))} /> {a}</label>
            ))}</div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Visible on the website</label>
          <div className="md:col-span-2"><p className="label">Photos (first is the cover)</p>
            <PhotoManager images={f.images} max={12} mainLabel="cover" bundled={ctx.bundled} onChange={(v) => set('images', v)} onRemoved={(u) => setRemoved((r) => [...r, u])} />
            {errs.images && <p className="err">{errs.images}</p>}
          </div>
          {msg && <p className="err md:col-span-2">{msg}</p>}
          <div className="flex gap-3 md:col-span-2"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save hotel'}</button><button type="button" className="btn btn-ghost" onClick={() => { setForm(null); setRemoved([]); }}>Cancel</button></div>
        </form>
      )}
      <div className="mt-6 divide-y divide-ink/10 border border-ink/10" data-testid="hotel-list">
        {list.map((h) => (
          <div key={h.slug} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><b className="font-serif text-xl">{h.name}</b> {!h.active && <span className="ml-2 bg-ink/10 px-2 py-0.5 text-xs">Hidden</span>}<p className="text-xs text-ink/60">/{h.slug} · {h.room_count} room types · {h.images.length} photos</p></div>
            <div className="flex gap-4 text-sm"><button className="text-gold-dark underline" onClick={() => edit(h)}>Edit</button><button className="underline" onClick={() => toggle(h)}>{h.active ? 'Hide' : 'Show'}</button><button className="text-red-700 underline" onClick={() => del(h)}>Delete</button></div>
          </div>
        ))}
        {list.length === 0 && <p className="p-6 text-center text-ink/50">No hotels yet.</p>}
      </div>
    </div>
  );
}
