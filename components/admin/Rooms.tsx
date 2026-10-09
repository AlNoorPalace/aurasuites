import { useCallback, useEffect, useState } from 'react';
import PhotoManager from './PhotoManager';
import { adm, deleteFiles, type AdminCtx } from './common';

export type AdminRoom = { id: number; hotel_slug: string; name: string; total_rooms: number; base_rate: number; max_guests: number; beds: number; baths: number; active: boolean; images: string[]; description: string; has_bookings: boolean };
const NUM = [['total_rooms', 'Rooms'], ['base_rate', 'Rate ₹'], ['max_guests', 'Max guests'], ['beds', 'Beds'], ['baths', 'Baths']] as const;

function Row({ r, ctx, onSaved, onError }: { r: AdminRoom; ctx: AdminCtx; onSaved: () => void; onError: (m: string) => void }) {
  const [d, setD] = useState(r);
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => setD(r), [r]);

  const save = async (withDetails: boolean) => {
    setFields({});
    const body: Record<string, unknown> = { id: d.id, name: d.name, total_rooms: d.total_rooms, base_rate: d.base_rate, max_guests: d.max_guests, beds: d.beds, baths: d.baths, active: d.active };
    if (withDetails) { body.description = d.description; body.images = d.images; }
    const res = await adm(ctx, '/api/admin/rooms', 'POST', body);
    if (res.error) { setFields(res.fields || {}); return onError(res.error); }
    if (withDetails) { await deleteFiles(ctx, removed); setRemoved([]); }
    onError(''); onSaved();
  };
  const del = async () => {
    if (!confirm(`Delete room type ${r.name}?`)) return;
    const res = await adm(ctx, '/api/admin/rooms', 'DELETE', { id: r.id });
    if (res.error) return onError(res.error);
    await deleteFiles(ctx, r.images);
    onSaved();
  };
  return (
    <>
      <tr className="border-b border-ink/10 align-middle" data-room-row={r.name}>
        <td className="py-2"><input className="input" aria-label="Name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></td>
        {NUM.map(([k]) => <td key={k}><input className="input !w-20" type="number" aria-label={k} value={d[k]} onChange={(e) => setD({ ...d, [k]: Number(e.target.value) })} /></td>)}
        <td className="text-center"><input type="checkbox" aria-label="Bookable" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} /></td>
        <td className="whitespace-nowrap text-sm"><button className="text-gold-dark underline" onClick={() => save(false)}>Save</button> · <button className="underline" onClick={() => setOpen(!open)}>Details &amp; photos</button> · <button className="text-red-700 underline" onClick={del}>Delete</button></td>
      </tr>
      {Object.values(fields)[0] && <tr><td colSpan={8} className="err">{Object.values(fields)[0]}</td></tr>}
      {open && (
        <tr><td colSpan={8} className="bg-ivory p-4">
          <label className="label" htmlFor={`d-${r.id}`}>Description ({d.description.length}/600)</label>
          <textarea id={`d-${r.id}`} className="input" rows={3} maxLength={600} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          <p className="label mt-4">Photos (first is the main photo)</p>
          <PhotoManager images={d.images} max={8} mainLabel="main" bundled={ctx.bundled} onChange={(v) => setD({ ...d, images: v })} onRemoved={(u) => setRemoved((x) => [...x, u])} />
          <button className="btn mt-4" onClick={() => save(true)}>Save details &amp; photos</button>
        </td></tr>
      )}
    </>
  );
}

export default function Rooms({ ctx, hotels, onChanged }: { ctx: AdminCtx; hotels: { slug: string; name: string }[]; onChanged: () => void }) {
  const [hotel, setHotel] = useState(hotels[0]?.slug || '');
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [msg, setMsg] = useState('');
  const [nu, setNu] = useState({ name: '', total_rooms: 1, base_rate: 0, max_guests: 2, beds: 1, baths: 1 });
  useEffect(() => { if (!hotel && hotels[0]) setHotel(hotels[0].slug); }, [hotels, hotel]);
  const load = useCallback(async () => {
    if (!hotel) return setRooms([]);
    const r = await adm<{ room_types: AdminRoom[] }>(ctx, `/api/admin/rooms?hotel_slug=${hotel}`);
    if (r.error) setMsg(r.error); else setRooms(r.data!.room_types);
  }, [ctx, hotel]);
  useEffect(() => { load(); }, [load]);
  const saved = () => { load(); onChanged(); };
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await adm(ctx, '/api/admin/rooms', 'POST', { ...nu, hotel_slug: hotel });
    if (r.error) return setMsg(Object.values(r.fields || {})[0] || r.error);
    setMsg(''); setNu({ ...nu, name: '' }); saved();
  };
  if (!hotels.length) return <p className="text-ink/60">Add a hotel first.</p>;
  return (
    <div>
      <label className="label" htmlFor="rooms-hotel">Hotel</label>
      <select id="rooms-hotel" className="input max-w-xs" value={hotel} onChange={(e) => setHotel(e.target.value)}>{hotels.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}</select>
      <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-3 border border-gold/40 p-4" data-testid="room-form">
        <div><label className="label" htmlFor="n-name">New room type</label><input id="n-name" className="input" value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></div>
        {NUM.map(([k, l]) => <div key={k}><label className="label" htmlFor={`n-${k}`}>{l}</label><input id={`n-${k}`} className="input !w-24" type="number" value={nu[k]} onChange={(e) => setNu({ ...nu, [k]: Number(e.target.value) })} /></div>)}
        <button className="btn">Add room</button>
      </form>
      {msg && <p className="err mt-2">{msg}</p>}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/20 text-xs uppercase tracking-wider text-ink/50"><tr><th className="py-2">Name</th>{NUM.map(([, l]) => <th key={l}>{l}</th>)}<th>Bookable</th><th /></tr></thead>
          <tbody>{rooms.map((r) => <Row key={r.id} r={r} ctx={ctx} onSaved={saved} onError={setMsg} />)}</tbody>
        </table>
        {rooms.length === 0 && <p className="py-6 text-center text-ink/50">No room types yet.</p>}
      </div>
    </div>
  );
}
