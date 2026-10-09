import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bed, Bath, Users, X, Check } from 'lucide-react';
import Img from './Img';
import UpiCard from './UpiCard';
import { api, friendly, nightsBetween, prettyDate, rupees } from '../lib/client';
import { useSearch } from './SearchContext';

type Av = { id: number; name: string; base_rate: number; max_guests: number; beds: number; baths: number; images: string[]; available: number; fits: boolean; nights: number; subtotal: number };
type Booking = { reference: string; hotel_name: string; room_name: string; check_in: string; check_out: string; nights: number; rooms: number; total: number; discount: number; guest_name: string };

export default function BookingModal({ hotelSlug, hotelName, onClose, initialRoomId }: { hotelSlug: string; hotelName: string; onClose: () => void; initialRoomId?: number }) {
  const s = useSearch();
  const [rooms, setRooms] = useState<Av[] | null>(null);
  const [roomId, setRoomId] = useState<number | null>(initialRoomId ?? null);
  const [corporate, setCorporate] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [f, setF] = useState({ guest_name: '', guest_phone: '', guest_email: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);

  const q = new URLSearchParams({ hotel_slug: hotelSlug, check_in: s.checkIn, check_out: s.checkOut, rooms: String(s.rooms), adults: String(s.adults), children: String(s.children) });
  useEffect(() => {
    let live = true;
    api<{ rooms: Av[] }>(`/api/availability?${q}`).then((r) => {
      if (!live) return;
      if (r.ok) setRooms(r.data.rooms); else { setRooms([]); setMsg(friendly(r)); }
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelSlug, s.checkIn, s.checkOut, s.rooms, s.adults, s.children]);

  const nights = nightsBetween(s.checkIn, s.checkOut);
  const room = rooms?.find((r) => r.id === roomId) || null;
  const subtotal = room ? room.base_rate * nights * s.rooms : 0;
  const discount = corporate ? Math.round(subtotal * 0.2) : 0;
  const bookable = (r: Av) => r.available >= s.rooms && r.fits;

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    setBusy(true); setErrs({}); setMsg('');
    const r = await api<{ booking: Booking }>('/api/bookings', { method: 'POST', body: {
      hotel_slug: hotelSlug, room_type_id: room.id, check_in: s.checkIn, check_out: s.checkOut, rooms: s.rooms, adults: s.adults, children: s.children, corporate, ...f } });
    setBusy(false);
    if (r.ok) { setDone(r.data.booking); setStep(3); return; }
    if (r.fields) setErrs(r.fields);
    setMsg(friendly(r));
    if (r.error === 'sold_out') setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Book your stay">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-white p-5 md:p-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="eyebrow">{step === 3 ? 'Booking confirmed' : `Step ${step} of 2`}</p>
            <h2 className="text-2xl">{hotelName}</h2>
            <p className="text-sm text-ink/60">{prettyDate(s.checkIn)} → {prettyDate(s.checkOut)} · {nights} night{nights > 1 ? 's' : ''} · {s.adults + s.children} guest{s.adults + s.children > 1 ? 's' : ''}, {s.rooms} room{s.rooms > 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Close"><X /></button>
        </div>

        {step === 1 && (
          <div>
            {rooms === null && <p className="py-8 text-center text-sm text-ink/60">Checking availability…</p>}
            {rooms?.length === 0 && <p className="py-8 text-center text-sm">{msg || 'No rooms are listed for this hotel yet.'}</p>}
            <div className="space-y-3">
              {rooms?.map((r) => {
                const ok = bookable(r);
                return (
                  <button key={r.id} type="button" disabled={!ok} onClick={() => setRoomId(r.id)} data-room={r.name}
                    className={`flex w-full gap-4 border p-3 text-left ${roomId === r.id ? 'border-gold bg-ivory' : 'border-ink/15'} ${!ok ? 'opacity-60' : 'hover:border-gold'}`}>
                    <Img src={r.images[0]} alt={r.name} className="h-24 w-28 shrink-0" sizes="120px" />
                    <span className="flex-1">
                      <span className="block font-serif text-xl">{r.name}</span>
                      <span className="flex gap-3 text-xs text-ink/60"><span className="flex items-center gap-1"><Bed size={12} />{r.beds}</span><span className="flex items-center gap-1"><Bath size={12} />{r.baths}</span><span className="flex items-center gap-1"><Users size={12} />up to {r.max_guests}</span></span>
                      <span className="mt-1 block text-sm">{rupees(r.base_rate)} <span className="text-ink/50">/ night</span></span>
                      <span className="block text-xs text-red-700">
                        {!r.fits ? `Too small for ${s.adults + s.children} guests` : r.available < s.rooms ? (r.available === 0 ? 'Sold out for these dates' : `Only ${r.available} left`) : r.available <= 3 ? `Only ${r.available} left` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {msg && rooms?.length ? <p className="err mt-3">{msg}</p> : null}
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={corporate} onChange={(e) => setCorporate(e.target.checked)} /> Corporate booking (20% discount)</label>
            <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
              <div className="text-sm">{room ? <>{discount > 0 && <span className="mr-2 text-ink/50 line-through">{rupees(subtotal)}</span>}<b className="font-serif text-2xl">{rupees(subtotal - discount)}</b> <span className="text-ink/50">total</span></> : 'Choose a room'}</div>
              <button className="btn" disabled={!room} onClick={() => setStep(2)}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && room && (
          <form onSubmit={confirm} className="space-y-3">
            <p className="text-sm">{room.name} · <b>{rupees(subtotal - discount)}</b> total{discount > 0 ? ` (corporate discount ${rupees(discount)})` : ''}</p>
            <div><label className="label" htmlFor="g-name">Your name</label><input id="g-name" className="input" value={f.guest_name} onChange={(e) => setF({ ...f, guest_name: e.target.value })} autoComplete="name" />{errs.guest_name && <p className="err">{errs.guest_name}</p>}</div>
            <div><label className="label" htmlFor="g-phone">Phone</label><input id="g-phone" className="input" type="tel" value={f.guest_phone} onChange={(e) => setF({ ...f, guest_phone: e.target.value })} autoComplete="tel" />{errs.guest_phone && <p className="err">{errs.guest_phone}</p>}</div>
            <div><label className="label" htmlFor="g-email">Email (optional)</label><input id="g-email" className="input" type="email" value={f.guest_email} onChange={(e) => setF({ ...f, guest_email: e.target.value })} autoComplete="email" />{errs.guest_email && <p className="err">{errs.guest_email}</p>}</div>
            <p className="text-sm text-ink/70">You pay at the hotel. No payment is needed now.</p>
            {msg && <p className="err">{msg}</p>}
            <div className="flex gap-3"><button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button><button className="btn flex-1" disabled={busy}>{busy ? 'Confirming…' : 'Confirm booking'}</button></div>
          </form>
        )}

        {step === 3 && done && (
          <div className="text-center" data-testid="confirmation">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold text-ink"><Check /></div>
            <p className="mt-3 text-sm">Thank you, {done.guest_name}. Your booking reference:</p>
            <p className="font-serif text-4xl tracking-wider" data-testid="reference">{done.reference}</p>
            <p className="mt-2 text-sm text-ink/70">{done.room_name} · {prettyDate(done.check_in)} → {prettyDate(done.check_out)} · {rupees(done.total)} to pay at the hotel</p>
            <p className="mt-1 text-xs text-ink/50">Keep this reference and your phone number to view or cancel the booking at Manage booking.</p>
            <UpiCard reference={done.reference} total={done.total} paid={0} />
            <button className="btn btn-dark mt-6" onClick={onClose}>Done</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
