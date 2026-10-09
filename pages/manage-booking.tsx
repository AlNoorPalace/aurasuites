import type { GetStaticProps } from 'next';
import { useState } from 'react';
import Layout from '../components/Layout';
import UpiCard from '../components/UpiCard';
import { api, friendly, prettyDate, rupees, today } from '../lib/client';
import { loadHotels } from '../lib/data';
import { CONTACT } from '../data/hotels';

export const getStaticProps: GetStaticProps = async () => {
  const { live } = await loadHotels();
  return { props: { live }, revalidate: 300 };
};

type B = { reference: string; hotel_name: string; room_name: string; check_in: string; check_out: string; nights: number; rooms: number; adults: number; children: number; total: number; discount: number; status: string; guest_name: string };

export default function ManageBooking({ live }: { live: boolean }) {
  const [f, setF] = useState({ reference: '', phone: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [b, setB] = useState<B | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const look = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErrs({}); setMsg(''); setB(null);
    const r = await api<{ booking: B }>('/api/bookings/lookup', { method: 'POST', body: f });
    setBusy(false);
    if (r.ok) setB(r.data.booking); else { if (r.fields) setErrs(r.fields); setMsg(friendly(r)); }
  };
  const cancel = async () => {
    if (!confirm('Cancel this booking?')) return;
    setBusy(true); setMsg('');
    const r = await api<{ booking: B }>('/api/bookings/cancel', { method: 'POST', body: f });
    setBusy(false);
    if (r.ok) setB(r.data.booking); else setMsg(friendly(r));
  };
  const upcoming = b && b.status === 'confirmed' && b.check_in > today();

  return (
    <Layout title="Manage booking">
      <section className="section max-w-xl">
        <p className="eyebrow">Manage booking</p>
        <h1 className="mt-2 text-4xl">Find your booking</h1>
        {!live ? <p className="mt-6">Online booking management is not available right now. Please call <a className="text-gold-dark" href={`tel:+91${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>.</p> : (
          <form onSubmit={look} className="mt-6 space-y-3">
            <div><label className="label" htmlFor="m-ref">Booking reference</label><input id="m-ref" className="input" placeholder="AUR-XXXXXX" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />{errs.reference && <p className="err">{errs.reference}</p>}</div>
            <div><label className="label" htmlFor="m-phone">Phone used for the booking</label><input id="m-phone" className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />{errs.phone && <p className="err">{errs.phone}</p>}</div>
            {msg && !b && <p className="err">{msg}</p>}
            <button className="btn" disabled={busy}>{busy ? 'Looking…' : 'Find booking'}</button>
          </form>
        )}
        {b && (
          <div className="mt-8 border border-gold/40 p-5" data-testid="booking">
            <p className="eyebrow">{b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}</p>
            <p className="font-serif text-3xl">{b.reference}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div>{b.hotel_name} · {b.room_name} × {b.rooms}</div>
              <div>{prettyDate(b.check_in)} → {prettyDate(b.check_out)} ({b.nights} night{b.nights > 1 ? 's' : ''})</div>
              <div>{b.adults + b.children} guest{b.adults + b.children > 1 ? 's' : ''} · {b.guest_name}</div>
              <div>Total {rupees(b.total)}{b.discount > 0 ? ` (includes corporate discount ${rupees(b.discount)})` : ''} · pay at the hotel</div>
            </dl>
            {msg && <p className="err mt-3">{msg}</p>}
            {upcoming && <><UpiCard reference={b.reference} total={b.total} /><button className="btn btn-ghost mt-5" onClick={cancel} disabled={busy}>Cancel booking</button></>}
          </div>
        )}
      </section>
    </Layout>
  );
}
