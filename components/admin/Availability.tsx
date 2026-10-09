import { useCallback, useEffect, useState } from 'react';
import { adm, type AdminCtx } from './common';
import { prettyDate, today } from '../../lib/client';
import type { AdminRoom } from './Rooms';

type Day = { date: string; booked: number; blocked: number; free: number };
type Block = { id: number; from_date: string; to_date: string; rooms: number; reason: string };

export default function Availability({ ctx, hotels }: { ctx: AdminCtx; hotels: { slug: string; name: string }[] }) {
  const [hotel, setHotel] = useState(hotels[0]?.slug || '');
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [roomId, setRoomId] = useState<number | ''>('');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [days, setDays] = useState<Day[]>([]);
  const [total, setTotal] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [bf, setBf] = useState({ from: '', to: '', rooms: 1, reason: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { if (!hotel && hotels[0]) setHotel(hotels[0].slug); }, [hotels, hotel]);
  useEffect(() => {
    if (!hotel) return;
    adm<{ room_types: AdminRoom[] }>(ctx, `/api/admin/rooms?hotel_slug=${hotel}`).then((r) => {
      const list = r.data?.room_types || [];
      setRooms(list); setRoomId(list[0]?.id ?? '');
    });
  }, [ctx, hotel]);
  const load = useCallback(async () => {
    if (roomId === '') { setDays([]); setBlocks([]); return; }
    const r = await adm<{ days: Day[]; total_rooms: number; blocks: Block[] }>(ctx, `/api/admin/availability?room_type_id=${roomId}&month=${month}`);
    if (r.error) return setMsg(r.error);
    setDays(r.data!.days); setTotal(r.data!.total_rooms); setBlocks(r.data!.blocks);
  }, [ctx, roomId, month]);
  useEffect(() => { load(); }, [load]);

  const shift = (n: number) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };
  const addBlock = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    const r = await adm(ctx, '/api/admin/availability', 'POST', { room_type_id: roomId, ...bf });
    if (r.error) return setMsg(Object.values(r.fields || {})[0] || r.error);
    setBf({ from: '', to: '', rooms: 1, reason: '' }); load();
  };
  const delBlock = async (id: number) => { await adm(ctx, '/api/admin/availability', 'DELETE', { id }); load(); };
  const lead = days.length ? new Date(days[0].date + 'T00:00').getDay() : 0;
  if (!hotels.length) return <p className="text-ink/60">Add a hotel first.</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <select className="input max-w-xs" aria-label="Hotel" value={hotel} onChange={(e) => setHotel(e.target.value)}>{hotels.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}</select>
        <select className="input max-w-xs" aria-label="Room type" value={roomId} onChange={(e) => setRoomId(Number(e.target.value))}>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      </div>
      {roomId === '' ? <p className="mt-6 text-ink/60">This hotel has no room types yet.</p> : (
        <>
          <div className="mt-6 flex items-center gap-4"><button className="btn btn-ghost !py-1" onClick={() => shift(-1)}>‹</button><b className="font-serif text-2xl" data-testid="month">{month}</b><button className="btn btn-ghost !py-1" onClick={() => shift(1)}>›</button><span className="text-sm text-ink/60">{total} rooms in total</span></div>
          <div className="mt-3 grid max-w-3xl grid-cols-7 gap-1 text-center text-xs" data-testid="calendar">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d} className="py-1 text-ink/50">{d}</span>)}
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {days.map((d) => (
              <div key={d.date} data-date={d.date} className={`border p-1.5 ${d.free === 0 ? 'border-red-300 bg-red-50' : d.booked + d.blocked > 0 ? 'border-gold/60 bg-gold/10' : 'border-ink/10'}`}>
                <div className="font-medium">{Number(d.date.slice(8))}</div>
                <div className="text-[10px] leading-tight">{d.booked > 0 && <div>{d.booked} booked</div>}{d.blocked > 0 && <div>{d.blocked} closed</div>}<div className="text-ink/50">{d.free} free</div></div>
              </div>
            ))}
          </div>
          <h3 className="mt-10 text-2xl">Closures</h3>
          <form onSubmit={addBlock} className="mt-3 flex flex-wrap items-end gap-3">
            <div><label className="label" htmlFor="b-from">From</label><input id="b-from" className="input" type="date" value={bf.from} onChange={(e) => setBf({ ...bf, from: e.target.value })} required /></div>
            <div><label className="label" htmlFor="b-to">To (inclusive)</label><input id="b-to" className="input" type="date" value={bf.to} onChange={(e) => setBf({ ...bf, to: e.target.value })} required /></div>
            <div><label className="label" htmlFor="b-rooms">Rooms</label><input id="b-rooms" className="input !w-24" type="number" min={1} value={bf.rooms} onChange={(e) => setBf({ ...bf, rooms: Number(e.target.value) })} /></div>
            <div><label className="label" htmlFor="b-reason">Reason</label><input id="b-reason" className="input" value={bf.reason} onChange={(e) => setBf({ ...bf, reason: e.target.value })} /></div>
            <button className="btn">Close rooms</button>
          </form>
          {msg && <p className="err mt-2">{msg}</p>}
          <ul className="mt-4 divide-y divide-ink/10 border border-ink/10 text-sm">
            {blocks.map((b) => <li key={b.id} className="flex justify-between p-3"><span>{prettyDate(b.from_date)} → {prettyDate(b.to_date)} · {b.rooms} room{b.rooms > 1 ? 's' : ''}{b.reason ? ` · ${b.reason}` : ''}</span><button className="text-red-700 underline" onClick={() => delBlock(b.id)}>Remove</button></li>)}
            {blocks.length === 0 && <li className="p-3 text-ink/50">No closures.</li>}
          </ul>
        </>
      )}
    </div>
  );
}
