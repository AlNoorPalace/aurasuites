import { useCallback, useEffect, useState } from 'react';
import { adm, type AdminCtx } from './common';
import { prettyDate, rupees } from '../../lib/client';

type Row = { reference: string; hotel_name: string; room_name: string; check_in: string; check_out: string; rooms: number; guest_name: string; guest_phone: string; total: number; status: string };

export default function Bookings({ ctx, hotels }: { ctx: AdminCtx; hotels: { slug: string; name: string }[] }) {
  const [f, setF] = useState({ q: '', status: '', hotel: '', from: '', to: '' });
  const [rows, setRows] = useState<Row[]>([]);
  const [sum, setSum] = useState({ count: 0, confirmed: 0, cancelled: 0, revenue: 0 });
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    const r = await adm<{ bookings: Row[]; summary: typeof sum }>(ctx, `/api/admin/bookings?${qs}`);
    if (r.error) return setErr(r.error);
    setErr(''); setRows(r.data!.bookings); setSum(r.data!.summary);
  }, [f, ctx]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const cancel = async (ref: string) => {
    if (!confirm(`Cancel booking ${ref}?`)) return;
    const r = await adm(ctx, '/api/admin/bookings', 'POST', { reference: ref });
    if (r.error) setErr(r.error); else load();
  };
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-5">
        <input className="input" placeholder="Search name, reference, phone" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Search" />
        <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status"><option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select>
        <select className="input" value={f.hotel} onChange={(e) => setF({ ...f, hotel: e.target.value })} aria-label="Hotel"><option value="">All hotels</option>{hotels.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}</select>
        <input className="input" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label="From" />
        <input className="input" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label="To" />
      </div>
      <p className="mt-4 text-sm text-ink/70" data-testid="summary">{sum.count} bookings · {sum.confirmed} confirmed · {sum.cancelled} cancelled · {rupees(sum.revenue)} confirmed value</p>
      {err && <p className="err">{err}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/20 text-xs uppercase tracking-wider text-ink/50"><tr><th className="py-2">Reference</th><th>Guest</th><th>Hotel / room</th><th>Stay</th><th>Total</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.reference} className="border-b border-ink/10 align-top">
                <td className="py-2 font-medium">{b.reference}</td>
                <td>{b.guest_name}<br /><span className="text-xs text-ink/60">{b.guest_phone}</span></td>
                <td>{b.hotel_name}<br /><span className="text-xs text-ink/60">{b.room_name} × {b.rooms}</span></td>
                <td>{prettyDate(b.check_in)} → {prettyDate(b.check_out)}</td>
                <td>{rupees(b.total)}</td>
                <td className={b.status === 'cancelled' ? 'text-red-700' : 'text-green-800'}>{b.status}</td>
                <td>{b.status === 'confirmed' && <button className="text-xs text-red-700 underline" onClick={() => cancel(b.reference)}>Cancel</button>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-ink/50">No bookings found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
